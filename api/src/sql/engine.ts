import { SupabaseClient } from '@supabase/supabase-js';
import { getStatusLabel, getResolutionLabel, isActiveStatus } from '../utils/status-mappings';

interface WorkloadMetricsOptions {
  period: 'week' | 'month';
  employeeId?: number;
  projectId?: number;
  sourceSystem?: string;
}

interface TaskOptions {
  activeOnly?: boolean;
  limit?: number;
}

export interface ResourceMetrics {
  employeeId: number;
  employeeName: string;
  email: string;
  role: string;
  totalEta: number;
  timeSpent: number;
  yetToSpend: number;
  totalWorkingHours: number;
  bandwidth: number;
  availabilityPct: number;
  activeTaskCount: number;
  overEtaPct: number;
  underEtaPct: number;
  remarks: string;
}

export class SQLEngine {
  private supabase: SupabaseClient;
  private sourceSystem: string;

  constructor(supabase: SupabaseClient, sourceSystem = 'DEFAULT') {
    this.supabase = supabase;
    this.sourceSystem = sourceSystem;
  }

  /**
   * Calculate working hours for a period (excluding weekends and holidays)
   */
  async calculateWorkingHours(startDate: Date, endDate: Date): Promise<number> {
    // Get holidays in range
    const { data: holidays } = await this.supabase
      .from('ohrm_holiday')
      .select('date')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    const holidayDates = new Set(holidays?.map(h => h.date) || []);
    
    let workingDays = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      const dateStr = current.toISOString().split('T')[0];
      
      // Skip weekends (0 = Sunday, 6 = Saturday) and holidays
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateStr)) {
        workingDays++;
      }
      
      current.setDate(current.getDate() + 1);
    }

    return workingDays * 8; // 8 hours per working day
  }

  /**
   * Get period date range
   */
  getPeriodRange(period: 'week' | 'month'): { startDate: Date; endDate: Date } {
    const now = new Date();
    const startDate = new Date(now);
    const endDate = new Date(now);

    if (period === 'week') {
      endDate.setDate(now.getDate() + 6);
    } else {
      endDate.setMonth(now.getMonth() + 1);
      endDate.setDate(0); // Last day of current month
    }

    return { startDate, endDate };
  }

  /**
   * Get resource workload metrics following SQL_Query_Rules
   */
  async getResourceWorkloadMetrics(options: WorkloadMetricsOptions): Promise<ResourceMetrics[]> {
    const { period, employeeId, projectId } = options;
    const { startDate, endDate } = this.getPeriodRange(period);
    const totalWorkingHours = await this.calculateWorkingHours(startDate, endDate);

    // Build query with proper source_system enforcement
    let query = this.supabase.rpc('get_resource_workload_metrics', {
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0],
      p_source_system: this.sourceSystem,
      p_employee_id: employeeId || null,
      p_project_id: projectId || null,
      p_total_hours: totalWorkingHours,
    });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching workload metrics:', error);
      // Fallback to direct query if RPC not available
      return this.getResourceWorkloadMetricsDirect(options, totalWorkingHours);
    }

    return data || [];
  }

  /**
   * Direct query fallback for workload metrics
   */
  private async getResourceWorkloadMetricsDirect(
    options: WorkloadMetricsOptions,
    totalWorkingHours: number
  ): Promise<ResourceMetrics[]> {
    const { employeeId, projectId } = options;

    // Get all active employees with their tasks
    let employeeQuery = this.supabase
      .from('hs_hr_employee')
      .select(`
        emp_number,
        emp_firstname,
        emp_lastname,
        emp_work_email,
        ohrm_job_title (job_title)
      `)
      .eq('emp_status', 2);

    if (employeeId) {
      employeeQuery = employeeQuery.eq('emp_number', employeeId);
    }

    const { data: employees } = await employeeQuery;

    if (!employees) return [];

    const metrics: ResourceMetrics[] = [];

    for (const emp of employees) {
      // Get active tasks for this employee
      let taskQuery = this.supabase
        .from('mantis_bug_table')
        .select(`
          id,
          eta,
          status,
          mantis_custom_field_string_table!inner (
            field_id,
            value
          ),
          mantis_user_table!inner (
            email
          )
        `)
        .eq('source_system', this.sourceSystem)
        .not('status', 'in', '(80,90)'); // Active tasks only

      // Join to employee via email
      const { data: user } = await this.supabase
        .from('mantis_user_table')
        .select('id')
        .ilike('email', emp.emp_work_email)
        .eq('source_system', this.sourceSystem)
        .single();

      if (!user) continue;

      taskQuery = taskQuery.eq('handler_id', user.id);

      if (projectId) {
        taskQuery = taskQuery.eq('project_id', projectId);
      }

      const { data: tasks } = await taskQuery;

      // Get time tracking data
      const taskIds = tasks?.map(t => t.id) || [];
      let totalTimeSpent = 0;

      if (taskIds.length > 0) {
        const { data: bugnotes } = await this.supabase
          .from('mantis_bugnote_table')
          .select('time_tracking')
          .in('bug_id', taskIds)
          .eq('source_system', this.sourceSystem);

        // Time Spent(h): Sum all logged minutes, convert to hours, treat null as 0, ROUND to 2 decimals
        totalTimeSpent = Math.round(((bugnotes?.reduce((sum, n) => sum + (n.time_tracking || 0), 0) || 0) / 60.0) * 100) / 100;
      }

      // ETA(h): Sum all values from custom field #4, treat null/empty as 0, ROUND to 2 decimals
      const totalEta = Math.round((tasks?.reduce((sum, t) => {
        const etaField = (t.mantis_custom_field_string_table as any[])?.find(
          (cf: any) => cf.field_id === 4
        );
        return sum + (parseFloat(etaField?.value || '0') || 0);
      }, 0) || 0) * 100) / 100;

      // Calculate metrics per SQL_Query_Rules
      const yetToSpend = Math.round((totalEta - totalTimeSpent) * 100) / 100;
      const bandwidth = Math.max(0, Math.round((totalWorkingHours - yetToSpend) * 100) / 100);
      const availabilityPct = totalWorkingHours > 0 
        ? Math.max(0, Math.round((bandwidth / totalWorkingHours) * 100 * 100) / 100)
        : 0;
      
      const overEtaPct = totalEta > 0 
        ? Math.round(((totalTimeSpent - totalEta) / totalEta) * 100 * 100) / 100
        : (totalTimeSpent > 0 ? 100 : 0);
      
      const underEtaPct = totalEta > 0 
        ? Math.round(((totalEta - totalTimeSpent) / totalEta) * 100 * 100) / 100
        : 0;

      metrics.push({
        employeeId: emp.emp_number,
        employeeName: `${emp.emp_firstname} ${emp.emp_lastname}`,
        email: emp.emp_work_email,
        role: (emp.ohrm_job_title as any)?.job_title || 'Unknown',
        totalEta: Math.round(totalEta * 100) / 100,
        timeSpent: Math.round(totalTimeSpent * 100) / 100,
        yetToSpend,
        totalWorkingHours,
        bandwidth,
        availabilityPct,
        activeTaskCount: tasks?.length || 0,
        overEtaPct,
        underEtaPct,
        // Remarks: If Time Spent > ETA then 'Over ETA', else 'Within ETA'
        remarks: totalTimeSpent > totalEta ? 'Over ETA' : 'Within ETA',
      });
    }

    return metrics;
  }

  /**
   * Get tasks for a specific resource
   */
  async getResourceTasks(employeeId: number, options: TaskOptions = {}) {
    const { activeOnly = true, limit = 50 } = options;

    // Get mantis user ID
    const { data: employee } = await this.supabase
      .from('hs_hr_employee')
      .select('emp_work_email')
      .eq('emp_number', employeeId)
      .single();

    if (!employee) return [];

    const { data: user } = await this.supabase
      .from('mantis_user_table')
      .select('id')
      .ilike('email', employee.emp_work_email)
      .eq('source_system', this.sourceSystem)
      .single();

    if (!user) return [];

    let query = this.supabase
      .from('mantis_bug_table')
      .select(`
        id,
        summary,
        status,
        resolution,
        eta,
        due_date,
        last_updated,
        mantis_project_table!inner (name),
        mantis_custom_field_string_table (field_id, value)
      `)
      .eq('handler_id', user.id)
      .eq('source_system', this.sourceSystem)
      .order('last_updated', { ascending: false })
      .limit(limit);

    if (activeOnly) {
      query = query.not('status', 'in', '(80,90)');
    }

    const { data } = await query;

    return data?.map(task => ({
      mantis_id: task.id, // Use mantis_id per SQL_Query_Rules.txt
      id: task.id, // Keep for backward compatibility
      summary: task.summary,
      status: getStatusLabel(task.status), // Always use label, never raw code
      status_code: task.status, // Keep code for filtering if needed
      status_label: getStatusLabel(task.status), // Explicit label field
      resolution: getResolutionLabel(task.resolution), // Always use label
      resolution_code: task.resolution, // Keep code for filtering if needed
      resolution_label: getResolutionLabel(task.resolution), // Explicit label field
      project: (task.mantis_project_table as any)?.name,
      eta: (task.mantis_custom_field_string_table as any[])?.find(
        (cf: any) => cf.field_id === 4
      )?.value || task.eta,
      taskType: (task.mantis_custom_field_string_table as any[])?.find(
        (cf: any) => cf.field_id === 40 || cf.field_id === 54
      )?.value,
      dueDate: task.due_date,
      lastUpdated: task.last_updated,
    })) || [];
  }

  /**
   * Get project workload metrics
   */
  async getProjectWorkloadMetrics(projectId: number, options: { period: 'week' | 'month' }) {
    return this.getResourceWorkloadMetrics({ ...options, projectId });
  }

  /**
   * Get project metrics summary
   */
  async getProjectMetrics(projectId: number) {
    const { data: tasks } = await this.supabase
      .from('mantis_bug_table')
      .select('id, status, eta')
      .eq('project_id', projectId)
      .eq('source_system', this.sourceSystem);

    const activeTasks = tasks?.filter(t => ![80, 90].includes(t.status)) || [];
    const completedTasks = tasks?.filter(t => [80, 90].includes(t.status)) || [];

    // Get time spent
    const taskIds = tasks?.map(t => t.id) || [];
    let totalTimeSpent = 0;

    if (taskIds.length > 0) {
      const { data: bugnotes } = await this.supabase
        .from('mantis_bugnote_table')
        .select('time_tracking')
        .in('bug_id', taskIds)
        .eq('source_system', this.sourceSystem);

      totalTimeSpent = (bugnotes?.reduce((sum, n) => sum + (n.time_tracking || 0), 0) || 0) / 60;
    }

    const totalEta = tasks?.reduce((sum, t) => sum + (t.eta || 0), 0) || 0;

    return {
      totalTasks: tasks?.length || 0,
      activeTasks: activeTasks.length,
      completedTasks: completedTasks.length,
      completionRate: tasks?.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
      totalEta,
      totalTimeSpent: Math.round(totalTimeSpent * 100) / 100,
      burnRate: totalEta > 0 ? Math.round((totalTimeSpent / totalEta) * 100) : 0,
    };
  }

  /**
   * Get project tasks
   */
  async getProjectTasks(projectId: number, limit = 100) {
    const { data } = await this.supabase
      .from('mantis_bug_table')
      .select(`
        id,
        summary,
        status,
        resolution,
        eta,
        due_date,
        handler_id,
        mantis_user_table!handler_id (realname, email)
      `)
      .eq('project_id', projectId)
      .eq('source_system', this.sourceSystem)
      .order('last_updated', { ascending: false })
      .limit(limit);

    return data || [];
  }

  /**
   * Get project health score
   */
  async getProjectHealthScore(projectId: number) {
    const metrics = await this.getProjectMetrics(projectId);
    
    // Health factors:
    // - Completion rate (higher = better)
    // - Burn rate close to 100% (not over, not under)
    // - Active task ratio
    
    let score = 0;
    
    // Completion contribution (0-40 points)
    score += metrics.completionRate * 0.4;
    
    // Burn rate contribution (0-30 points) - penalize over and under
    const burnDeviation = Math.abs(100 - metrics.burnRate);
    score += Math.max(0, 30 - burnDeviation * 0.3);
    
    // Active vs total ratio (0-30 points)
    const activeRatio = metrics.totalTasks > 0 
      ? metrics.activeTasks / metrics.totalTasks 
      : 0;
    score += (1 - activeRatio) * 30;

    return {
      score: Math.round(score),
      grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D',
      metrics,
      factors: {
        completionRate: metrics.completionRate,
        burnRate: metrics.burnRate,
        activeTaskRatio: Math.round(activeRatio * 100),
      },
    };
  }

  /**
   * Get project team allocation
   */
  async getProjectTeamAllocation(projectId: number) {
    const { data } = await this.supabase
      .from('mantis_bug_table')
      .select(`
        handler_id,
        eta,
        mantis_user_table!handler_id (
          realname,
          email
        )
      `)
      .eq('project_id', projectId)
      .eq('source_system', this.sourceSystem)
      .not('status', 'in', '(80,90)');

    // Group by handler
    const allocation: Record<number, { name: string; email: string; eta: number; taskCount: number }> = {};
    
    data?.forEach(task => {
      const handlerId = task.handler_id;
      if (!allocation[handlerId]) {
        allocation[handlerId] = {
          name: (task.mantis_user_table as any)?.realname || 'Unknown',
          email: (task.mantis_user_table as any)?.email || '',
          eta: 0,
          taskCount: 0,
        };
      }
      allocation[handlerId].eta += task.eta || 0;
      allocation[handlerId].taskCount++;
    });

    return Object.entries(allocation).map(([id, data]) => ({
      handlerId: parseInt(id),
      ...data,
    }));
  }

  /**
   * Get bandwidth forecast
   */
  async getBandwidthForecast(employeeId: number, weeks: number) {
    const metrics = await this.getResourceWorkloadMetrics({
      period: 'week',
      employeeId,
    });

    if (metrics.length === 0) return { forecast: [] };

    const currentMetrics = metrics[0];
    const weeklyBurnRate = currentMetrics.timeSpent / 7; // Hours per day
    
    const forecast: any[] = [];
    let remainingEta = currentMetrics.yetToSpend;

    for (let week = 1; week <= weeks; week++) {
      const weeklyWorkHours = 40; // 5 days * 8 hours
      const projectedSpend = weeklyBurnRate * 5;
      
      remainingEta = Math.max(0, remainingEta - projectedSpend);
      const projectedBandwidth = Math.max(0, weeklyWorkHours - remainingEta);
      const projectedAvailability = (projectedBandwidth / weeklyWorkHours) * 100;

      forecast.push({
        week,
        remainingEta: Math.round(remainingEta * 100) / 100,
        projectedBandwidth: Math.round(projectedBandwidth * 100) / 100,
        projectedAvailability: Math.round(projectedAvailability * 100) / 100,
        isOverloaded: remainingEta > weeklyWorkHours,
      });
    }

    return { 
      currentState: currentMetrics,
      forecast,
    };
  }

  /**
   * Get obligation flow data
   */
  async getObligationFlow(weeks: number, projectId?: number) {
    // Get all resources with their remaining ETAs
    const metrics = await this.getResourceWorkloadMetrics({
      period: 'month',
      projectId,
    });

    const weeklyData: any[] = [];
    const weeklyWorkHours = 40;

    for (let week = 0; week < weeks; week++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() + week * 7);
      
      const totalRemainingEta = metrics.reduce((sum, m) => sum + Math.max(0, m.yetToSpend - (week * 20)), 0);
      const totalAvailableHours = metrics.length * weeklyWorkHours;

      weeklyData.push({
        week: week + 1,
        weekStart: weekStart.toISOString().split('T')[0],
        remainingEta: Math.round(totalRemainingEta * 100) / 100,
        availableHours: totalAvailableHours,
        utilizationPct: totalAvailableHours > 0 
          ? Math.round((totalRemainingEta / totalAvailableHours) * 100)
          : 0,
        isOverloaded: totalRemainingEta > totalAvailableHours,
      });
    }

    return {
      weeks: weeklyData,
      overloadWeek: weeklyData.find(w => w.isOverloaded)?.week || null,
    };
  }

  /**
   * Get project dependencies
   */
  async getProjectDependencies(projectId: number) {
    const { data } = await this.supabase
      .from('task_dependencies')
      .select(`
        id,
        dependency_type,
        parent_task:mantis_bug_table!parent_task_id (
          id,
          summary,
          status,
          project_id
        ),
        child_task:mantis_bug_table!child_task_id (
          id,
          summary,
          status,
          project_id
        )
      `)
      .eq('source_system', this.sourceSystem);

    // Filter to project
    return data?.filter(
      d => (d.parent_task as any)?.project_id === projectId || 
           (d.child_task as any)?.project_id === projectId
    ) || [];
  }

  /**
   * Get dependency graph data for visualization
   */
  async getDependencyGraph(projectId: number) {
    const { data: tasks } = await this.supabase
      .from('mantis_bug_table')
      .select('id, summary, status, handler_id')
      .eq('project_id', projectId)
      .eq('source_system', this.sourceSystem);

    const { data: deps } = await this.supabase
      .from('task_dependencies')
      .select('parent_task_id, child_task_id, dependency_type');

    const taskIds = new Set(tasks?.map(t => t.id) || []);

    const nodes = tasks?.map(t => ({
      id: t.id.toString(),
      label: t.summary?.substring(0, 30) || `Task ${t.id}`,
      status: t.status,
    })) || [];

    const edges = deps?.filter(
      d => taskIds.has(d.parent_task_id) && taskIds.has(d.child_task_id)
    ).map(d => ({
      source: d.parent_task_id.toString(),
      target: d.child_task_id.toString(),
      type: d.dependency_type,
    })) || [];

    return { nodes, edges };
  }

  /**
   * Get critical path for a project
   */
  async getCriticalPath(projectId: number) {
    const graph = await this.getDependencyGraph(projectId);
    
    // Simple critical path: find longest dependency chain
    const adjacency: Record<string, string[]> = {};
    graph.edges.forEach(e => {
      if (!adjacency[e.source]) adjacency[e.source] = [];
      adjacency[e.source].push(e.target);
    });

    // Find all paths using DFS
    const allPaths: string[][] = [];
    
    const dfs = (node: string, path: string[]) => {
      path.push(node);
      const children = adjacency[node] || [];
      
      if (children.length === 0) {
        allPaths.push([...path]);
      } else {
        children.forEach(child => dfs(child, path));
      }
      path.pop();
    };

    // Start DFS from nodes with no incoming edges
    const hasIncoming = new Set(graph.edges.map(e => e.target));
    const startNodes = graph.nodes.filter(n => !hasIncoming.has(n.id));
    
    startNodes.forEach(node => dfs(node.id, []));

    // Find longest path
    const longestPath = allPaths.reduce(
      (longest, current) => current.length > longest.length ? current : longest,
      []
    );

    return {
      criticalPath: longestPath,
      length: longestPath.length,
      tasks: longestPath.map(id => graph.nodes.find(n => n.id === id)),
    };
  }

  /**
   * Get estimation accuracy for an employee
   */
  async getEstimationAccuracy(employeeId: number) {
    const { data } = await this.supabase
      .from('estimation_history')
      .select('*')
      .eq('resource_id', employeeId)
      .eq('is_final', true)
      .order('recorded_at', { ascending: false })
      .limit(50);

    if (!data || data.length === 0) {
      return { 
        hasData: false,
        message: 'No completed tasks with estimation data' 
      };
    }

    const accuracyScores = data.map(d => d.accuracy_score || 0);
    const avgAccuracy = accuracyScores.reduce((a, b) => a + b, 0) / accuracyScores.length;
    
    // Calculate bias (positive = underestimates, negative = overestimates)
    const biases = data.map(d => (d.time_spent_final || 0) - (d.eta_at_creation || 0));
    const avgBias = biases.reduce((a, b) => a + b, 0) / biases.length;

    // Calculate variance
    const variance = accuracyScores.reduce((sum, score) => 
      sum + Math.pow(score - avgAccuracy, 2), 0
    ) / accuracyScores.length;

    // Group by task type
    const byTaskType: Record<string, number[]> = {};
    data.forEach(d => {
      const type = d.task_type || 'Unknown';
      if (!byTaskType[type]) byTaskType[type] = [];
      byTaskType[type].push(d.accuracy_score || 0);
    });

    const taskTypeAccuracy = Object.entries(byTaskType).map(([type, scores]) => ({
      taskType: type,
      avgAccuracy: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) / 100,
      sampleSize: scores.length,
    }));

    return {
      hasData: true,
      sampleSize: data.length,
      avgAccuracy: Math.round(avgAccuracy * 100) / 100,
      estimationBias: Math.round(avgBias * 100) / 100,
      biasDirection: avgBias > 0 ? 'underestimates' : avgBias < 0 ? 'overestimates' : 'accurate',
      variance: Math.round(variance * 100) / 100,
      consistency: variance < 100 ? 'consistent' : variance < 400 ? 'moderate' : 'inconsistent',
      byTaskType: taskTypeAccuracy,
      recentHistory: data.slice(0, 10),
    };
  }

  /**
   * Get estimation patterns across org
   */
  async getEstimationPatterns() {
    const { data } = await this.supabase
      .from('estimation_history')
      .select(`
        *,
        hs_hr_employee (emp_firstname, emp_lastname)
      `)
      .eq('is_final', true)
      .order('recorded_at', { ascending: false })
      .limit(200);

    // Group by resource
    const byResource: Record<number, any[]> = {};
    data?.forEach(d => {
      if (!byResource[d.resource_id]) byResource[d.resource_id] = [];
      byResource[d.resource_id].push(d);
    });

    const patterns = Object.entries(byResource).map(([resourceId, records]) => {
      const avgAccuracy = records.reduce((sum, r) => sum + (r.accuracy_score || 0), 0) / records.length;
      const avgBias = records.reduce((sum, r) => 
        sum + ((r.time_spent_final || 0) - (r.eta_at_creation || 0)), 0
      ) / records.length;

      return {
        resourceId: parseInt(resourceId),
        resourceName: records[0]?.hs_hr_employee 
          ? `${records[0].hs_hr_employee.emp_firstname} ${records[0].hs_hr_employee.emp_lastname}`
          : 'Unknown',
        sampleSize: records.length,
        avgAccuracy: Math.round(avgAccuracy * 100) / 100,
        avgBias: Math.round(avgBias * 100) / 100,
        biasDirection: avgBias > 2 ? 'underestimates' : avgBias < -2 ? 'overestimates' : 'accurate',
      };
    });

    // Sort by bias magnitude
    patterns.sort((a, b) => Math.abs(b.avgBias) - Math.abs(a.avgBias));

    return {
      patterns,
      topUnderestimators: patterns.filter(p => p.biasDirection === 'underestimates').slice(0, 5),
      topOverestimators: patterns.filter(p => p.biasDirection === 'overestimates').slice(0, 5),
    };
  }

  /**
   * Get velocity trends
   */
  async getVelocityTrends(projectId: number | undefined, weeks: number) {
    const trends: any[] = [];
    
    for (let week = weeks - 1; week >= 0; week--) {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - week * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      let query = this.supabase
        .from('mantis_bug_table')
        .select('id, eta')
        .in('status', [80, 90])
        .gte('last_updated', weekStart.toISOString())
        .lt('last_updated', weekEnd.toISOString())
        .eq('source_system', this.sourceSystem);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data } = await query;

      trends.push({
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        tasksCompleted: data?.length || 0,
        etaCompleted: data?.reduce((sum, t) => sum + (t.eta || 0), 0) || 0,
      });
    }

    return { trends };
  }

  /**
   * Get load concentration
   */
  async getLoadConcentration(projectId?: number) {
    const metrics = await this.getResourceWorkloadMetrics({
      period: 'week',
      projectId,
    });

    const totalEta = metrics.reduce((sum, m) => sum + m.yetToSpend, 0);
    
    // Sort by load
    const sorted = [...metrics].sort((a, b) => b.yetToSpend - a.yetToSpend);

    // Top 3 concentration
    const top3Eta = sorted.slice(0, 3).reduce((sum, m) => sum + m.yetToSpend, 0);
    const top3Concentration = totalEta > 0 ? (top3Eta / totalEta) * 100 : 0;

    return {
      totalEta: Math.round(totalEta * 100) / 100,
      resourceCount: metrics.length,
      top3Concentration: Math.round(top3Concentration * 100) / 100,
      isConcentrated: top3Concentration > 60,
      distribution: sorted.map(m => ({
        name: m.employeeName,
        eta: m.yetToSpend,
        percentage: totalEta > 0 ? Math.round((m.yetToSpend / totalEta) * 100 * 100) / 100 : 0,
      })),
    };
  }

  /**
   * Get projects summary
   */
  async getProjectsSummary() {
    const { data: projects } = await this.supabase
      .from('mantis_project_table')
      .select('id, name')
      .eq('enabled', 1)
      .eq('source_system', this.sourceSystem);

    const summaries = await Promise.all(
      (projects || []).map(async p => {
        const metrics = await this.getProjectMetrics(p.id);
        return {
          id: p.id,
          name: p.name,
          ...metrics,
        };
      })
    );

    return summaries;
  }

  /**
   * Calculate Load Stability Index
   */
  async calculateLSI(options: { projectId?: number; days: number }) {
    const { projectId, days } = options;

    // Get historical snapshots
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = this.supabase
      .from('workload_snapshots')
      .select('*')
      .gte('snapshot_date', startDate.toISOString().split('T')[0]);

    const { data: snapshots } = await query;

    if (!snapshots || snapshots.length < 2) {
      return {
        lsi: null,
        message: 'Insufficient historical data for LSI calculation',
      };
    }

    // Calculate variances
    const etaChanges = snapshots.map(s => s.total_eta);
    const bandwidths = snapshots.map(s => s.bandwidth);
    
    const etaVariance = this.calculateVariance(etaChanges);
    const bandwidthVariance = this.calculateVariance(bandwidths);

    // Calculate status churn (simplified: count state changes)
    const stateChanges = snapshots.reduce((count, s, i) => {
      if (i === 0) return 0;
      return count + (s.workload_state !== snapshots[i-1].workload_state ? 1 : 0);
    }, 0);
    const churnRate = stateChanges / snapshots.length;

    // LSI formula: weighted combination
    const w1 = 0.4, w2 = 0.4, w3 = 0.2;
    const lsi = (w1 * etaVariance) + (w2 * bandwidthVariance) + (w3 * churnRate * 100);

    return {
      lsi: Math.round(lsi * 100) / 100,
      interpretation: lsi < 50 ? 'Stable - Planning mode' : 
                      lsi < 100 ? 'Moderate variability' : 
                      'High variability - Firefighting mode',
      components: {
        etaVariance: Math.round(etaVariance * 100) / 100,
        bandwidthVariance: Math.round(bandwidthVariance * 100) / 100,
        churnRate: Math.round(churnRate * 100) / 100,
      },
      sampleSize: snapshots.length,
      period: `${days} days`,
    };
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }
}

