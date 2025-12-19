const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

interface ApiOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { token, ...fetchOptions } = options;
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    const authToken = token || this.token;
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Workload endpoints
  async getWorkloadOverview(period: "week" | "month" = "week") {
    return this.request(`/api/workload/overview?period=${period}`);
  }

  async getResourceWorkload(employeeId: number, period: "week" | "month" = "week") {
    return this.request(`/api/workload/resource/${employeeId}?period=${period}`);
  }

  async getBandwidthForecast(employeeId: number, weeks: number = 4) {
    return this.request(`/api/workload/forecast/${employeeId}?weeks=${weeks}`);
  }

  async getObligationFlow(weeks: number = 8, projectId?: number) {
    const params = new URLSearchParams({ weeks: weeks.toString() });
    if (projectId) params.append("projectId", projectId.toString());
    return this.request(`/api/workload/obligation-flow?${params}`);
  }

  // Chat endpoints
  async sendMessage(message: string, mode: string = "descriptive", sessionId?: string, provider?: string, model?: string) {
    return this.request("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, mode, sessionId, provider, model }),
    });
  }

  async getChatHistory(sessionId: string) {
    return this.request(`/api/chat/history/${sessionId}`);
  }

  // Project endpoints
  async getProjects() {
    return this.request("/api/projects");
  }

  async getProject(projectId: number) {
    return this.request(`/api/projects/${projectId}`);
  }

  async getProjectHealth(projectId: number) {
    return this.request(`/api/projects/${projectId}/health`);
  }

  // Employee endpoints
  async getEmployees() {
    return this.request("/api/employees");
  }

  async getEmployee(employeeId: number) {
    return this.request(`/api/employees/${employeeId}`);
  }


  async getEstimationAccuracy(employeeId: number) {
    return this.request(`/api/employees/${employeeId}/estimation-accuracy`);
  }

  // Dependency endpoints
  async getDependencyGraph(projectId: number) {
    return this.request(`/api/dependencies/graph/${projectId}`);
  }

  async getTaskDependencies(taskId: number) {
    return this.request(`/api/dependencies/task/${taskId}`);
  }

  async createDependency(parentTaskId: number, childTaskId: number, type: string = "blocks") {
    return this.request("/api/dependencies", {
      method: "POST",
      body: JSON.stringify({ parentTaskId, childTaskId, dependencyType: type }),
    });
  }

  // Leave endpoints
  async getUpcomingLeave(days: number = 30) {
    return this.request(`/api/leave/upcoming?days=${days}`);
  }

  async analyzeLeaveImpact(employeeId: number, startDate: string, endDate: string) {
    return this.request("/api/leave/impact", {
      method: "POST",
      body: JSON.stringify({ employeeId, startDate, endDate }),
    });
  }

  // Calendar endpoints
  async getCalendarStatus() {
    return this.request("/api/calendar/status");
  }

  async getCalendarEvents(start?: string, end?: string) {
    const params = new URLSearchParams();
    if (start) params.append("start", start);
    if (end) params.append("end", end);
    return this.request(`/api/calendar/events?${params}`);
  }

  async syncCalendar() {
    return this.request("/api/calendar/sync", { method: "POST" });
  }

  // Insights endpoints
  async getRiskAlerts(options?: { severity?: string; type?: string; resolved?: boolean }) {
    const params = new URLSearchParams();
    if (options?.severity) params.append("severity", options.severity);
    if (options?.type) params.append("type", options.type);
    if (options?.resolved !== undefined) params.append("resolved", String(options.resolved));
    return this.request(`/api/insights/risks?${params}`);
  }

  async getLSI(projectId?: number, days: number = 30) {
    const params = new URLSearchParams({ days: days.toString() });
    if (projectId) params.append("projectId", projectId.toString());
    return this.request(`/api/insights/lsi?${params}`);
  }

  async getNarrative(scope: "team" | "org" = "team") {
    return this.request(`/api/insights/narrative?scope=${scope}`);
  }

  // Digest endpoints
  async getDigestPreferences() {
    return this.request("/api/digest/preferences");
  }

  async updateDigestPreferences(prefs: any) {
    return this.request("/api/digest/preferences", {
      method: "PUT",
      body: JSON.stringify(prefs),
    });
  }

  async getTodayDigest() {
    return this.request("/api/digest/today");
  }
}

export const api = new ApiClient(API_BASE_URL);

