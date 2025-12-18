import { SupabaseClient } from '@supabase/supabase-js';
import { SQLEngine } from './engine';

export type RiskType = 
  | 'eta_inflation'
  | 'silent_overrun'
  | 'phantom_bandwidth'
  | 'load_concentration'
  | 'project_sinkhole';

export interface RiskAlert {
  type: RiskType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  entityType: 'task' | 'employee' | 'project' | 'team';
  entityId: string;
  title: string;
  description: string;
  metadata: Record<string, any>;
}

export class RiskDetector {
  private supabase: SupabaseClient;
  private engine: SQLEngine;

  constructor(supabase: SupabaseClient, engine: SQLEngine) {
    this.supabase = supabase;
    this.engine = engine;
  }

  /**
   * Run all risk detection patterns
   */
  async detectAllRisks(): Promise<RiskAlert[]> {
    const alerts: RiskAlert[] = [];

    const [
      etaInflation,
      silentOverruns,
      phantomBandwidth,
      loadConcentration,
      projectSinkholes,
    ] = await Promise.all([
      this.detectETAInflation(),
      this.detectSilentOverruns(),
      this.detectPhantomBandwidth(),
      this.detectLoadConcentration(),
      this.detectProjectSinkholes(),
    ]);

    alerts.push(...etaInflation, ...silentOverruns, ...phantomBandwidth, ...loadConcentration, ...projectSinkholes);

    // Save to database
    if (alerts.length > 0) {
      await this.saveAlerts(alerts);
    }

    return alerts;
  }

  /**
   * ETA Inflation: Current ETA > Original ETA * 1.3 without scope change
   */
  async detectETAInflation(): Promise<RiskAlert[]> {
    const alerts: RiskAlert[] = [];

    const { data: history } = await this.supabase
      .from('estimation_history')
      .select(`
        task_id,
        eta_at_creation,
        eta_current,
        mantis_bug_table (
          summary,
          handler_id
        )
      `)
      .eq('is_final', false)
      .not('eta_at_creation', 'is', null);

    history?.forEach(record => {
      const original = record.eta_at_creation || 0;
      const current = record.eta_current || 0;
      
      if (original > 0 && current > original * 1.3) {
        const inflationPct = Math.round(((current - original) / original) * 100);
        
        alerts.push({
          type: 'eta_inflation',
          severity: inflationPct > 100 ? 'critical' : inflationPct > 50 ? 'high' : 'medium',
          entityType: 'task',
          entityId: record.task_id.toString(),
          title: `ETA inflated by ${inflationPct}%`,
          description: `Task "${(record.mantis_bug_table as any)?.summary}" ETA increased from ${original}h to ${current}h without scope change`,
          metadata: {
            originalEta: original,
            currentEta: current,
            inflationPct,
          },
        });
      }
    });

    return alerts;
  }

  /**
   * Silent Overrun: Time spent > ETA but status still active
   */
  async detectSilentOverruns(): Promise<RiskAlert[]> {
    const alerts: RiskAlert[] = [];

    // Get active tasks with their time tracking
    const { data: tasks } = await this.supabase
      .from('mantis_bug_table')
      .select(`
        id,
        summary,
        eta,
        status,
        handler_id,
        mantis_custom_field_string_table (field_id, value)
      `)
      .in('status', [40, 50]) // Confirmed or Assigned
      .eq('source_system', 'DEFAULT');

    for (const task of tasks || []) {
      // Get custom ETA
      const etaField = (task.mantis_custom_field_string_table as any[])?.find(
        (cf: any) => cf.field_id === 4
      );
      const eta = parseFloat(etaField?.value || task.eta || '0');

      if (eta <= 0) continue;

      // Get time spent
      const { data: bugnotes } = await this.supabase
        .from('mantis_bugnote_table')
        .select('time_tracking')
        .eq('bug_id', task.id)
        .eq('source_system', 'DEFAULT');

      const timeSpent = (bugnotes?.reduce((sum, n) => sum + (n.time_tracking || 0), 0) || 0) / 60;

      if (timeSpent > eta) {
        const overrunPct = Math.round(((timeSpent - eta) / eta) * 100);
        
        alerts.push({
          type: 'silent_overrun',
          severity: overrunPct > 100 ? 'critical' : overrunPct > 50 ? 'high' : 'medium',
          entityType: 'task',
          entityId: task.id.toString(),
          title: `Silent overrun: ${overrunPct}% over ETA`,
          description: `Task "${task.summary}" has spent ${timeSpent.toFixed(1)}h against ${eta}h ETA but remains in active status`,
          metadata: {
            eta,
            timeSpent,
            overrunPct,
            status: task.status,
          },
        });
      }
    }

    return alerts;
  }

  /**
   * Phantom Bandwidth: High availability but low delivery/closure rate
   */
  async detectPhantomBandwidth(): Promise<RiskAlert[]> {
    const alerts: RiskAlert[] = [];

    const metrics = await this.engine.getResourceWorkloadMetrics({ period: 'month' });

    for (const m of metrics) {
      if (m.availabilityPct > 60) {
        // Check closure rate for this employee
        const { data: employee } = await this.supabase
          .from('hs_hr_employee')
          .select('emp_work_email')
          .eq('emp_number', m.employeeId)
          .single();

        if (!employee) continue;

        const { data: user } = await this.supabase
          .from('mantis_user_table')
          .select('id')
          .ilike('email', employee.emp_work_email)
          .single();

        if (!user) continue;

        // Get tasks closed in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: closedCount } = await this.supabase
          .from('mantis_bug_table')
          .select('id', { count: 'exact', head: true })
          .eq('handler_id', user.id)
          .in('status', [80, 90])
          .gte('last_updated', thirtyDaysAgo.toISOString());

        // Get total active tasks
        const { count: activeCount } = await this.supabase
          .from('mantis_bug_table')
          .select('id', { count: 'exact', head: true })
          .eq('handler_id', user.id)
          .not('status', 'in', '(80,90)');

        const closureRate = (activeCount || 0) > 0 
          ? ((closedCount || 0) / ((closedCount || 0) + (activeCount || 0))) * 100
          : 0;

        if (closureRate < 50) {
          alerts.push({
            type: 'phantom_bandwidth',
            severity: closureRate < 20 ? 'high' : 'medium',
            entityType: 'employee',
            entityId: m.employeeId.toString(),
            title: `Phantom bandwidth detected`,
            description: `${m.employeeName} shows ${m.availabilityPct.toFixed(0)}% availability but only ${closureRate.toFixed(0)}% closure rate`,
            metadata: {
              availability: m.availabilityPct,
              closureRate,
              activeTaskCount: activeCount,
              closedCount,
            },
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Load Concentration: Top 3 resources have >60% of remaining ETA
   */
  async detectLoadConcentration(): Promise<RiskAlert[]> {
    const alerts: RiskAlert[] = [];

    const concentration = await this.engine.getLoadConcentration();

    if (concentration.isConcentrated) {
      const top3Names = concentration.distribution.slice(0, 3).map(d => d.name).join(', ');
      
      alerts.push({
        type: 'load_concentration',
        severity: concentration.top3Concentration > 80 ? 'high' : 'medium',
        entityType: 'team',
        entityId: 'org',
        title: `Load concentration at ${concentration.top3Concentration.toFixed(0)}%`,
        description: `${top3Names} are carrying ${concentration.top3Concentration.toFixed(0)}% of the remaining workload`,
        metadata: {
          top3Concentration: concentration.top3Concentration,
          distribution: concentration.distribution.slice(0, 5),
          totalEta: concentration.totalEta,
        },
      });
    }

    return alerts;
  }

  /**
   * Project Sinkhole: High time spent, low closure rate
   */
  async detectProjectSinkholes(): Promise<RiskAlert[]> {
    const alerts: RiskAlert[] = [];

    const { data: projects } = await this.supabase
      .from('mantis_project_table')
      .select('id, name')
      .eq('enabled', 1)
      .eq('source_system', 'DEFAULT');

    for (const project of projects || []) {
      const metrics = await this.engine.getProjectMetrics(project.id);

      // Calculate efficiency: ratio of completed tasks to time spent
      const efficiency = metrics.totalTimeSpent > 0
        ? metrics.completedTasks / (metrics.totalTimeSpent / 8) // Tasks per day equivalent
        : 0;

      // Flag if high burn but low completion
      if (metrics.totalTimeSpent > 40 && metrics.completionRate < 30) {
        alerts.push({
          type: 'project_sinkhole',
          severity: metrics.completionRate < 15 ? 'critical' : 'high',
          entityType: 'project',
          entityId: project.id.toString(),
          title: `Project sinkhole: ${project.name}`,
          description: `${metrics.totalTimeSpent.toFixed(0)}h spent but only ${metrics.completionRate}% completion rate`,
          metadata: {
            projectName: project.name,
            timeSpent: metrics.totalTimeSpent,
            completionRate: metrics.completionRate,
            activeTasks: metrics.activeTasks,
            completedTasks: metrics.completedTasks,
            efficiency,
          },
        });
      }
    }

    return alerts;
  }

  /**
   * Save alerts to database (avoiding duplicates)
   */
  private async saveAlerts(alerts: RiskAlert[]): Promise<void> {
    for (const alert of alerts) {
      // Check for existing unresolved alert of same type for same entity
      const { data: existing } = await this.supabase
        .from('risk_alerts')
        .select('id')
        .eq('alert_type', alert.type)
        .eq('entity_type', alert.entityType)
        .eq('entity_id', alert.entityId)
        .eq('is_resolved', false)
        .single();

      if (!existing) {
        await this.supabase.from('risk_alerts').insert({
          alert_type: alert.type,
          severity: alert.severity,
          entity_type: alert.entityType,
          entity_id: alert.entityId,
          title: alert.title,
          description: alert.description,
          metadata: alert.metadata,
        });
      }
    }
  }
}

