/**
 * HRMS (Human Resource Management System) Integration
 * 
 * Syncs employee data, working hours, leaves, and organizational structure
 * Supports common HRMS systems like BambooHR, Workday, SAP SuccessFactors, etc.
 */

import { SupabaseClient } from "@supabase/supabase-js"

// Generic HRMS interface - implement adapters for specific systems
interface HRMSConfig {
  provider: "bamboohr" | "workday" | "sap" | "custom" | "api"
  baseUrl: string
  apiKey?: string
  apiSecret?: string
  companyDomain?: string  // For BambooHR
}

interface HRMSEmployee {
  id: string
  employeeNumber?: string
  firstName: string
  lastName: string
  email: string
  department?: string
  jobTitle?: string
  managerId?: string
  workLocation?: string
  hireDate?: string
  status: "active" | "inactive" | "on_leave"
  workingHoursPerDay: number  // Default working hours
  workingDaysPerWeek: number  // e.g., 5
}

interface HRMSLeave {
  id: string
  employeeId: string
  type: string  // vacation, sick, personal, etc.
  startDate: string
  endDate: string
  status: "pending" | "approved" | "rejected"
  hours?: number  // For partial day leaves
}

interface HRMSWorkSchedule {
  employeeId: string
  dayOfWeek: number  // 0-6 (Sunday-Saturday)
  startTime: string  // HH:mm
  endTime: string    // HH:mm
  isWorkingDay: boolean
}

interface HRMSHoliday {
  id: string
  name: string
  date: string
  type: "public" | "company" | "optional"
  location?: string  // For location-specific holidays
}

export class HRMSIntegration {
  private config: HRMSConfig
  private supabase: SupabaseClient

  constructor(config: HRMSConfig, supabase: SupabaseClient) {
    this.config = config
    this.supabase = supabase
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    // Add auth based on provider
    if (this.config.provider === "bamboohr") {
      const auth = Buffer.from(`${this.config.apiKey}:x`).toString("base64")
      headers["Authorization"] = `Basic ${auth}`
    } else if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`
    }

    const response = await fetch(`${this.config.baseUrl}${endpoint}`, { headers })

    if (!response.ok) {
      throw new Error(`HRMS API error: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Sync all employees from HRMS
   */
  async syncEmployees(): Promise<number> {
    let employees: HRMSEmployee[]

    // Fetch employees based on provider
    switch (this.config.provider) {
      case "bamboohr":
        employees = await this.fetchBambooHREmployees()
        break
      case "workday":
        employees = await this.fetchWorkdayEmployees()
        break
      default:
        employees = await this.fetchGenericEmployees()
    }

    let synced = 0
    for (const emp of employees) {
      await this.supabase.from("employees").upsert({
        external_id: `hrms_${emp.id}`,
        source_system: "hrms",
        employee_number: emp.employeeNumber,
        name: `${emp.firstName} ${emp.lastName}`.trim(),
        email: emp.email,
        department: emp.department,
        job_title: emp.jobTitle,
        manager_id: emp.managerId ? `hrms_${emp.managerId}` : null,
        work_location: emp.workLocation,
        hire_date: emp.hireDate,
        status: emp.status,
        working_hours_per_day: emp.workingHoursPerDay,
        working_days_per_week: emp.workingDaysPerWeek,
        metadata: { hrms_id: emp.id },
        synced_at: new Date().toISOString(),
      }, { onConflict: "external_id" })
      synced++
    }

    return synced
  }

  /**
   * Sync leave/time-off requests
   */
  async syncLeaves(startDate?: string, endDate?: string): Promise<number> {
    const start = startDate || new Date().toISOString().split("T")[0]
    const end = endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    let leaves: HRMSLeave[]

    switch (this.config.provider) {
      case "bamboohr":
        leaves = await this.fetchBambooHRLeaves(start, end)
        break
      default:
        leaves = await this.fetchGenericLeaves(start, end)
    }

    let synced = 0
    for (const leave of leaves) {
      await this.supabase.from("leaves").upsert({
        external_id: `hrms_leave_${leave.id}`,
        source_system: "hrms",
        employee_id: `hrms_${leave.employeeId}`,
        leave_type: leave.type,
        start_date: leave.startDate,
        end_date: leave.endDate,
        status: leave.status,
        hours: leave.hours,
        metadata: { hrms_leave_id: leave.id },
        synced_at: new Date().toISOString(),
      }, { onConflict: "external_id" })
      synced++
    }

    return synced
  }

  /**
   * Sync company holidays
   */
  async syncHolidays(year?: number): Promise<number> {
    const targetYear = year || new Date().getFullYear()
    
    let holidays: HRMSHoliday[]

    switch (this.config.provider) {
      case "bamboohr":
        holidays = await this.fetchBambooHRHolidays(targetYear)
        break
      default:
        holidays = await this.fetchGenericHolidays(targetYear)
    }

    let synced = 0
    for (const holiday of holidays) {
      await this.supabase.from("holidays").upsert({
        external_id: `hrms_holiday_${holiday.id}`,
        source_system: "hrms",
        name: holiday.name,
        date: holiday.date,
        type: holiday.type,
        location: holiday.location,
        synced_at: new Date().toISOString(),
      }, { onConflict: "external_id" })
      synced++
    }

    return synced
  }

  /**
   * Get available working hours for an employee on a specific date
   * Considers: work schedule, leaves, holidays
   */
  async getAvailableHours(employeeId: string, date: string): Promise<number> {
    // Get employee's standard working hours
    const { data: employee } = await this.supabase
      .from("employees")
      .select("working_hours_per_day, working_days_per_week")
      .eq("external_id", employeeId)
      .single()

    if (!employee) return 0

    const dayOfWeek = new Date(date).getDay()
    
    // Check if it's a working day (Mon-Fri by default)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    if (isWeekend && employee.working_days_per_week <= 5) return 0

    // Check for holidays
    const { data: holiday } = await this.supabase
      .from("holidays")
      .select("id")
      .eq("date", date)
      .single()

    if (holiday) return 0

    // Check for approved leaves
    const { data: leave } = await this.supabase
      .from("leaves")
      .select("hours")
      .eq("employee_id", employeeId)
      .eq("status", "approved")
      .lte("start_date", date)
      .gte("end_date", date)
      .single()

    if (leave) {
      // Partial day leave
      if (leave.hours) {
        return Math.max(0, employee.working_hours_per_day - leave.hours)
      }
      // Full day leave
      return 0
    }

    return employee.working_hours_per_day
  }

  /**
   * Calculate total available hours for a date range
   */
  async calculateAvailability(
    employeeId: string, 
    startDate: string, 
    endDate: string
  ): Promise<{ totalHours: number; workingDays: number; leavesDays: number }> {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    let totalHours = 0
    let workingDays = 0
    let leavesDays = 0

    const current = new Date(start)
    while (current <= end) {
      const dateStr = current.toISOString().split("T")[0]
      const hours = await this.getAvailableHours(employeeId, dateStr)
      
      if (hours > 0) {
        totalHours += hours
        workingDays++
      } else {
        // Check if it's a leave day (not weekend/holiday)
        const dayOfWeek = current.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const { data: leave } = await this.supabase
            .from("leaves")
            .select("id")
            .eq("employee_id", employeeId)
            .lte("start_date", dateStr)
            .gte("end_date", dateStr)
            .single()
          
          if (leave) leavesDays++
        }
      }

      current.setDate(current.getDate() + 1)
    }

    return { totalHours, workingDays, leavesDays }
  }

  // Provider-specific implementations

  private async fetchBambooHREmployees(): Promise<HRMSEmployee[]> {
    const data = await this.fetch<any>(`/api/gateway.php/${this.config.companyDomain}/v1/employees/directory`)
    
    return data.employees.map((emp: any) => ({
      id: emp.id,
      employeeNumber: emp.employeeNumber,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.workEmail,
      department: emp.department,
      jobTitle: emp.jobTitle,
      managerId: emp.supervisorId,
      workLocation: emp.location,
      hireDate: emp.hireDate,
      status: emp.status === "Active" ? "active" : "inactive",
      workingHoursPerDay: 8,
      workingDaysPerWeek: 5,
    }))
  }

  private async fetchBambooHRLeaves(start: string, end: string): Promise<HRMSLeave[]> {
    const data = await this.fetch<any>(
      `/api/gateway.php/${this.config.companyDomain}/v1/time_off/requests/?start=${start}&end=${end}`
    )
    
    return data.requests.map((req: any) => ({
      id: req.id,
      employeeId: req.employeeId,
      type: req.type.name,
      startDate: req.start,
      endDate: req.end,
      status: req.status.status.toLowerCase(),
      hours: req.amount?.amount,
    }))
  }

  private async fetchBambooHRHolidays(year: number): Promise<HRMSHoliday[]> {
    const data = await this.fetch<any>(
      `/api/gateway.php/${this.config.companyDomain}/v1/time_off/holidays/?start=${year}-01-01&end=${year}-12-31`
    )
    
    return data.holidays.map((h: any, i: number) => ({
      id: `${year}_${i}`,
      name: h.name,
      date: h.start,
      type: "public",
    }))
  }

  private async fetchWorkdayEmployees(): Promise<HRMSEmployee[]> {
    // Workday SOAP/REST API implementation
    // This would need to be customized per Workday instance
    const data = await this.fetch<any>("/workers")
    return data.workers.map((w: any) => ({
      id: w.workerId,
      firstName: w.firstName,
      lastName: w.lastName,
      email: w.primaryEmail,
      department: w.supervisoryOrganization,
      jobTitle: w.jobProfile,
      status: w.active ? "active" : "inactive",
      workingHoursPerDay: 8,
      workingDaysPerWeek: 5,
    }))
  }

  private async fetchGenericEmployees(): Promise<HRMSEmployee[]> {
    const data = await this.fetch<{ employees: HRMSEmployee[] }>("/employees")
    return data.employees
  }

  private async fetchGenericLeaves(start: string, end: string): Promise<HRMSLeave[]> {
    const data = await this.fetch<{ leaves: HRMSLeave[] }>(`/leaves?start=${start}&end=${end}`)
    return data.leaves
  }

  private async fetchGenericHolidays(year: number): Promise<HRMSHoliday[]> {
    const data = await this.fetch<{ holidays: HRMSHoliday[] }>(`/holidays?year=${year}`)
    return data.holidays
  }

  /**
   * Full sync - employees, leaves, and holidays
   */
  async fullSync(): Promise<{ employees: number; leaves: number; holidays: number }> {
    const employees = await this.syncEmployees()
    const leaves = await this.syncLeaves()
    const holidays = await this.syncHolidays()

    return { employees, leaves, holidays }
  }
}

