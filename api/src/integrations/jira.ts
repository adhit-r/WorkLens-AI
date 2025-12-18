/**
 * Jira Integration
 * 
 * Syncs issues, users, projects from Jira Cloud/Server
 */

import { SupabaseClient } from "@supabase/supabase-js"

interface JiraConfig {
  baseUrl: string        // e.g., https://yourcompany.atlassian.net
  email: string          // Jira account email
  apiToken: string       // API token from Atlassian
}

interface JiraIssue {
  id: string
  key: string
  fields: {
    summary: string
    description: string | null
    project: { id: string; key: string; name: string }
    reporter: { accountId: string; displayName: string; emailAddress: string }
    assignee?: { accountId: string; displayName: string; emailAddress: string }
    status: { id: string; name: string; statusCategory: { name: string } }
    priority: { id: string; name: string }
    issuetype: { id: string; name: string }
    created: string
    updated: string
    duedate?: string
    timeoriginalestimate?: number  // seconds
    timespent?: number             // seconds
    customfield_10016?: number     // Story points (varies by instance)
  }
}

interface JiraProject {
  id: string
  key: string
  name: string
  description?: string
  projectTypeKey: string
  lead: { accountId: string; displayName: string }
}

interface JiraUser {
  accountId: string
  displayName: string
  emailAddress: string
  active: boolean
}

export class JiraIntegration {
  private config: JiraConfig
  private supabase: SupabaseClient

  constructor(config: JiraConfig, supabase: SupabaseClient) {
    this.config = config
    this.supabase = supabase
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const auth = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString("base64")
    
    const response = await fetch(`${this.config.baseUrl}/rest/api/3/${endpoint}`, {
      ...options,
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Jira API error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  /**
   * Sync all accessible projects from Jira
   */
  async syncProjects(): Promise<number> {
    const response = await this.fetch<{ values: JiraProject[]; isLast: boolean }>(
      "project/search?maxResults=100"
    )
    
    let synced = 0
    for (const project of response.values) {
      await this.supabase.from("projects").upsert({
        external_id: `jira_${project.id}`,
        source_system: "jira",
        name: project.name,
        description: project.description || "",
        status: "active",
        metadata: { 
          jira_id: project.id, 
          jira_key: project.key,
          project_type: project.projectTypeKey,
          lead_id: project.lead.accountId,
        },
        synced_at: new Date().toISOString(),
      }, { onConflict: "external_id" })
      synced++
    }

    return synced
  }

  /**
   * Sync users from Jira (users with access to the instance)
   */
  async syncUsers(): Promise<number> {
    // Get users who can be assigned to issues
    const response = await this.fetch<JiraUser[]>(
      "users/search?maxResults=1000"
    )
    
    let synced = 0
    for (const user of response) {
      if (!user.active) continue

      await this.supabase.from("employees").upsert({
        external_id: `jira_${user.accountId}`,
        source_system: "jira",
        name: user.displayName,
        email: user.emailAddress,
        metadata: { jira_account_id: user.accountId },
        synced_at: new Date().toISOString(),
      }, { onConflict: "external_id" })
      synced++
    }

    return synced
  }

  /**
   * Sync issues from Jira using JQL
   */
  async syncIssues(jql?: string, maxResults: number = 100): Promise<number> {
    const defaultJql = "updated >= -30d ORDER BY updated DESC"
    const query = jql || defaultJql

    const response = await this.fetch<{
      issues: JiraIssue[]
      total: number
      maxResults: number
    }>(`search?jql=${encodeURIComponent(query)}&maxResults=${maxResults}&fields=*all`)

    let synced = 0
    for (const issue of response.issues) {
      // Convert time estimate from seconds to hours
      const etaHours = issue.fields.timeoriginalestimate 
        ? issue.fields.timeoriginalestimate / 3600 
        : null

      const timeSpentHours = issue.fields.timespent
        ? issue.fields.timespent / 3600
        : 0

      // Map Jira status category to WorkLens status
      const status = this.mapStatus(issue.fields.status)

      await this.supabase.from("tasks").upsert({
        external_id: `jira_${issue.id}`,
        source_system: "jira",
        project_id: issue.fields.project.id,
        title: issue.fields.summary,
        description: issue.fields.description || "",
        assignee_id: issue.fields.assignee?.accountId,
        reporter_id: issue.fields.reporter.accountId,
        status,
        priority: issue.fields.priority.name.toLowerCase(),
        issue_type: issue.fields.issuetype.name.toLowerCase(),
        eta_hours: etaHours,
        time_spent_hours: timeSpentHours,
        due_date: issue.fields.duedate,
        created_at: issue.fields.created,
        updated_at: issue.fields.updated,
        metadata: {
          jira_id: issue.id,
          jira_key: issue.key,
          original_status: issue.fields.status.name,
          story_points: issue.fields.customfield_10016,
        },
        synced_at: new Date().toISOString(),
      }, { onConflict: "external_id" })
      synced++
    }

    return synced
  }

  /**
   * Sync sprint data from Jira (Agile boards)
   */
  async syncSprints(boardId: string): Promise<number> {
    const response = await this.fetch<{ values: any[] }>(
      `agile/1.0/board/${boardId}/sprint?state=active,future`
    )

    let synced = 0
    for (const sprint of response.values) {
      await this.supabase.from("sprints").upsert({
        external_id: `jira_sprint_${sprint.id}`,
        source_system: "jira",
        name: sprint.name,
        board_id: boardId,
        state: sprint.state,
        start_date: sprint.startDate,
        end_date: sprint.endDate,
        goal: sprint.goal,
        metadata: { jira_sprint_id: sprint.id },
        synced_at: new Date().toISOString(),
      }, { onConflict: "external_id" })
      synced++
    }

    return synced
  }

  /**
   * Map Jira status to WorkLens standard status
   */
  private mapStatus(jiraStatus: { name: string; statusCategory: { name: string } }): string {
    const categoryMap: Record<string, string> = {
      "To Do": "open",
      "In Progress": "in_progress",
      "Done": "closed",
    }
    return categoryMap[jiraStatus.statusCategory.name] || "open"
  }

  /**
   * Get worklogs for time tracking
   */
  async syncWorklogs(issueKey: string): Promise<number> {
    const response = await this.fetch<{ worklogs: any[] }>(
      `issue/${issueKey}/worklog`
    )

    let synced = 0
    for (const worklog of response.worklogs) {
      await this.supabase.from("time_entries").upsert({
        external_id: `jira_worklog_${worklog.id}`,
        source_system: "jira",
        task_id: issueKey,
        user_id: worklog.author.accountId,
        hours: worklog.timeSpentSeconds / 3600,
        description: worklog.comment || "",
        logged_at: worklog.started,
        metadata: { jira_worklog_id: worklog.id },
        synced_at: new Date().toISOString(),
      }, { onConflict: "external_id" })
      synced++
    }

    return synced
  }

  /**
   * Full sync - projects, users, and recent issues
   */
  async fullSync(): Promise<{ projects: number; users: number; issues: number }> {
    const projects = await this.syncProjects()
    const users = await this.syncUsers()
    const issues = await this.syncIssues()

    return { projects, users, issues }
  }
}

