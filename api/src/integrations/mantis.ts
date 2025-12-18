/**
 * Mantis Bug Tracker Integration
 * 
 * Syncs issues, users, projects, and time entries from Mantis BT
 */

import { SupabaseClient } from "@supabase/supabase-js"

interface MantisConfig {
  baseUrl: string
  apiToken: string
}

interface MantisIssue {
  id: number
  summary: string
  description: string
  project: { id: number; name: string }
  reporter: { id: number; name: string; email: string }
  handler?: { id: number; name: string; email: string }
  status: { id: number; name: string }
  priority: { id: number; name: string }
  severity: { id: number; name: string }
  created_at: string
  updated_at: string
  due_date?: string
  eta?: number // estimated hours
  custom_fields?: Array<{ field: { name: string }; value: string }>
}

interface MantisProject {
  id: number
  name: string
  description: string
  status: { id: number; name: string }
}

interface MantisUser {
  id: number
  name: string
  real_name: string
  email: string
}

export class MantisIntegration {
  private config: MantisConfig
  private supabase: SupabaseClient

  constructor(config: MantisConfig, supabase: SupabaseClient) {
    this.config = config
    this.supabase = supabase
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.config.baseUrl}/api/rest/${endpoint}`, {
      headers: {
        "Authorization": this.config.apiToken,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Mantis API error: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Sync all projects from Mantis
   */
  async syncProjects(): Promise<number> {
    const projects = await this.fetch<{ projects: MantisProject[] }>("projects")
    
    let synced = 0
    for (const project of projects.projects) {
      await this.supabase.from("projects").upsert({
        external_id: `mantis_${project.id}`,
        source_system: "mantis",
        name: project.name,
        description: project.description,
        status: project.status.name.toLowerCase(),
        metadata: { mantis_id: project.id },
        synced_at: new Date().toISOString(),
      }, { onConflict: "external_id" })
      synced++
    }

    return synced
  }

  /**
   * Sync all users from Mantis
   */
  async syncUsers(): Promise<number> {
    // Note: Mantis REST API may require specific permissions for user listing
    const users = await this.fetch<{ users: MantisUser[] }>("users")
    
    let synced = 0
    for (const user of users.users) {
      await this.supabase.from("employees").upsert({
        external_id: `mantis_${user.id}`,
        source_system: "mantis",
        name: user.real_name || user.name,
        email: user.email,
        metadata: { mantis_id: user.id, username: user.name },
        synced_at: new Date().toISOString(),
      }, { onConflict: "external_id" })
      synced++
    }

    return synced
  }

  /**
   * Sync issues/tasks from Mantis
   */
  async syncIssues(projectId?: number): Promise<number> {
    const endpoint = projectId 
      ? `issues?project_id=${projectId}` 
      : "issues"
    
    const response = await this.fetch<{ issues: MantisIssue[] }>(endpoint)
    
    let synced = 0
    for (const issue of response.issues) {
      // Extract ETA from custom fields if available
      const etaField = issue.custom_fields?.find(
        cf => cf.field.name.toLowerCase().includes("eta") || 
              cf.field.name.toLowerCase().includes("estimate")
      )
      const eta = etaField ? parseFloat(etaField.value) : issue.eta

      // Map Mantis status to WorkLens status
      const status = this.mapStatus(issue.status.name)

      await this.supabase.from("tasks").upsert({
        external_id: `mantis_${issue.id}`,
        source_system: "mantis",
        project_id: issue.project.id,
        title: issue.summary,
        description: issue.description,
        assignee_id: issue.handler?.id,
        reporter_id: issue.reporter.id,
        status,
        priority: issue.priority.name.toLowerCase(),
        severity: issue.severity.name.toLowerCase(),
        eta_hours: eta,
        due_date: issue.due_date,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        metadata: {
          mantis_id: issue.id,
          original_status: issue.status.name,
          custom_fields: issue.custom_fields,
        },
        synced_at: new Date().toISOString(),
      }, { onConflict: "external_id" })
      synced++
    }

    return synced
  }

  /**
   * Map Mantis status to WorkLens standard status
   */
  private mapStatus(mantisStatus: string): string {
    const statusMap: Record<string, string> = {
      "new": "open",
      "feedback": "in_progress",
      "acknowledged": "open",
      "confirmed": "open",
      "assigned": "in_progress",
      "resolved": "resolved",
      "closed": "closed",
    }
    return statusMap[mantisStatus.toLowerCase()] || "open"
  }

  /**
   * Full sync - projects, users, and issues
   */
  async fullSync(): Promise<{ projects: number; users: number; issues: number }> {
    const projects = await this.syncProjects()
    const users = await this.syncUsers()
    const issues = await this.syncIssues()

    return { projects, users, issues }
  }
}

