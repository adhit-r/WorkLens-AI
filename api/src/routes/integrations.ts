import { Hono } from "hono"
import { MantisIntegration } from "../integrations/mantis"
import { JiraIntegration } from "../integrations/jira"
import { HRMSIntegration } from "../integrations/hrms"

const app = new Hono()

// Store integration configs (in production, store encrypted in database)
interface IntegrationConfig {
  id: string
  type: "mantis" | "jira" | "hrms"
  name: string
  enabled: boolean
  config: Record<string, any>
  lastSync?: string
  syncStatus?: "idle" | "syncing" | "error"
  syncError?: string
}

// Get all configured integrations
app.get("/", async (c) => {
  const supabase = c.get("supabase")
  
  const { data, error } = await supabase
    .from("integrations")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  // Hide sensitive config values
  const integrations = data?.map((int: any) => ({
    ...int,
    config: {
      ...int.config,
      apiToken: int.config?.apiToken ? "••••••••" : undefined,
      apiKey: int.config?.apiKey ? "••••••••" : undefined,
      apiSecret: int.config?.apiSecret ? "••••••••" : undefined,
    }
  }))

  return c.json({ integrations })
})

// Add new integration
app.post("/", async (c) => {
  const supabase = c.get("supabase")
  const body = await c.req.json()
  
  const { type, name, config } = body

  // Validate required fields based on type
  if (type === "mantis") {
    if (!config.baseUrl || !config.apiToken) {
      return c.json({ error: "Mantis requires baseUrl and apiToken" }, 400)
    }
  } else if (type === "jira") {
    if (!config.baseUrl || !config.email || !config.apiToken) {
      return c.json({ error: "Jira requires baseUrl, email, and apiToken" }, 400)
    }
  } else if (type === "hrms") {
    if (!config.provider || !config.baseUrl) {
      return c.json({ error: "HRMS requires provider and baseUrl" }, 400)
    }
  }

  const { data, error } = await supabase
    .from("integrations")
    .insert({
      type,
      name,
      config,
      enabled: true,
      sync_status: "idle",
    })
    .select()
    .single()

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ integration: data, message: "Integration added successfully" })
})

// Update integration
app.put("/:id", async (c) => {
  const supabase = c.get("supabase")
  const id = c.req.param("id")
  const body = await c.req.json()

  const { data, error } = await supabase
    .from("integrations")
    .update(body)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ integration: data })
})

// Delete integration
app.delete("/:id", async (c) => {
  const supabase = c.get("supabase")
  const id = c.req.param("id")

  const { error } = await supabase
    .from("integrations")
    .delete()
    .eq("id", id)

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ message: "Integration deleted" })
})

// Test integration connection
app.post("/:id/test", async (c) => {
  const supabase = c.get("supabase")
  const id = c.req.param("id")

  const { data: integration, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !integration) {
    return c.json({ error: "Integration not found" }, 404)
  }

  try {
    let result: { success: boolean; message: string }

    if (integration.type === "mantis") {
      const mantis = new MantisIntegration(integration.config, supabase)
      await mantis.syncProjects() // Test by fetching projects
      result = { success: true, message: "Successfully connected to Mantis" }
    } else if (integration.type === "jira") {
      const jira = new JiraIntegration(integration.config, supabase)
      await jira.syncProjects()
      result = { success: true, message: "Successfully connected to Jira" }
    } else if (integration.type === "hrms") {
      const hrms = new HRMSIntegration(integration.config, supabase)
      await hrms.syncEmployees()
      result = { success: true, message: "Successfully connected to HRMS" }
    } else {
      result = { success: false, message: "Unknown integration type" }
    }

    return c.json(result)
  } catch (err: any) {
    return c.json({ 
      success: false, 
      message: `Connection failed: ${err.message}` 
    })
  }
})

// Trigger manual sync
app.post("/:id/sync", async (c) => {
  const supabase = c.get("supabase")
  const id = c.req.param("id")
  const body = await c.req.json().catch(() => ({}))

  const { data: integration, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !integration) {
    return c.json({ error: "Integration not found" }, 404)
  }

  // Update sync status
  await supabase
    .from("integrations")
    .update({ sync_status: "syncing" })
    .eq("id", id)

  try {
    let result: Record<string, number>

    if (integration.type === "mantis") {
      const mantis = new MantisIntegration(integration.config, supabase)
      if (body.full) {
        result = await mantis.fullSync()
      } else {
        result = { issues: await mantis.syncIssues() }
      }
    } else if (integration.type === "jira") {
      const jira = new JiraIntegration(integration.config, supabase)
      if (body.full) {
        result = await jira.fullSync()
      } else {
        result = { issues: await jira.syncIssues(body.jql) }
      }
    } else if (integration.type === "hrms") {
      const hrms = new HRMSIntegration(integration.config, supabase)
      if (body.full) {
        result = await hrms.fullSync()
      } else {
        result = { employees: await hrms.syncEmployees() }
      }
    } else {
      throw new Error("Unknown integration type")
    }

    // Update sync status
    await supabase
      .from("integrations")
      .update({ 
        sync_status: "idle",
        last_sync: new Date().toISOString(),
        sync_error: null,
      })
      .eq("id", id)

    return c.json({ 
      success: true, 
      synced: result,
      message: "Sync completed successfully" 
    })
  } catch (err: any) {
    await supabase
      .from("integrations")
      .update({ 
        sync_status: "error",
        sync_error: err.message,
      })
      .eq("id", id)

    return c.json({ 
      success: false, 
      error: err.message 
    }, 500)
  }
})

// Get sync history
app.get("/:id/history", async (c) => {
  const supabase = c.get("supabase")
  const id = c.req.param("id")

  const { data, error } = await supabase
    .from("sync_logs")
    .select("*")
    .eq("integration_id", id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ history: data })
})

// Sync all enabled integrations
app.post("/sync-all", async (c) => {
  const supabase = c.get("supabase")

  const { data: integrations, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("enabled", true)

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  const results: Record<string, any> = {}

  for (const integration of integrations || []) {
    try {
      if (integration.type === "mantis") {
        const mantis = new MantisIntegration(integration.config, supabase)
        results[integration.name] = await mantis.fullSync()
      } else if (integration.type === "jira") {
        const jira = new JiraIntegration(integration.config, supabase)
        results[integration.name] = await jira.fullSync()
      } else if (integration.type === "hrms") {
        const hrms = new HRMSIntegration(integration.config, supabase)
        results[integration.name] = await hrms.fullSync()
      }

      await supabase
        .from("integrations")
        .update({ last_sync: new Date().toISOString() })
        .eq("id", integration.id)
    } catch (err: any) {
      results[integration.name] = { error: err.message }
    }
  }

  return c.json({ results })
})

export default app

