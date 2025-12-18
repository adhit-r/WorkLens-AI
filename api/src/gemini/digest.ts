import { SupabaseClient } from '@supabase/supabase-js';
import { GeminiClient } from './client';
import { SQLEngine } from '../sql/engine';
import { WorkloadStateClassifier } from '../sql/workload-states';
import { AuthUser } from '../middleware/auth';

export interface DigestContent {
  greeting: string;
  date: string;
  overnightChanges: {
    newTasksAssigned: number;
    totalNewEta: number;
    statusChanges: Array<{ project: string; change: string }>;
    tasksClosed: Array<{ name: string; by: string; eta: number }>;
  };
  yourDay: {
    availableHours: number;
    meetingHours: number;
    priorityTasks: Array<{ id: number; name: string; urgency: string; eta: number }>;
    riskAlerts: Array<{ task: string; probability: number; reason: string }>;
  };
  teamSnapshot?: {
    overloadedCount: number;
    atRiskCount: number;
    blockedTasksCount: number;
    sprintProgress?: number;
  };
  oneThingToKnow: string;
}

export class DigestGenerator {
  private supabase: SupabaseClient;
  private engine: SQLEngine;
  private gemini: GeminiClient;
  private classifier: WorkloadStateClassifier;

  constructor(supabase: SupabaseClient, engine: SQLEngine, gemini: GeminiClient) {
    this.supabase = supabase;
    this.engine = engine;
    this.gemini = gemini;
    this.classifier = new WorkloadStateClassifier();
  }

  /**
   * Generate daily digest for a user
   */
  async generateDigest(user: AuthUser, options?: { preview?: boolean }): Promise<DigestContent> {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const greeting = this.getGreeting(now);
    const dateStr = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });

    // Gather overnight changes
    const overnightChanges = await this.getOvernightChanges(user, yesterday);

    // Get user's day outlook
    const yourDay = await this.getUserDayOutlook(user);

    // Get team snapshot if manager+
    let teamSnapshot;
    if (['manager', 'program_manager', 'leadership'].includes(user.role)) {
      teamSnapshot = await this.getTeamSnapshot();
    }

    // Generate "One Thing to Know" using Gemini
    const contextData = {
      overnightChanges,
      yourDay,
      teamSnapshot,
      role: user.role,
    };

    const oneThingToKnow = await this.gemini.generateExecutiveSummary(contextData);

    return {
      greeting,
      date: dateStr,
      overnightChanges,
      yourDay,
      teamSnapshot,
      oneThingToKnow,
    };
  }

  /**
   * Get time-appropriate greeting
   */
  private getGreeting(date: Date): string {
    const hour = date.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  /**
   * Get changes since yesterday
   */
  private async getOvernightChanges(user: AuthUser, since: Date): Promise<DigestContent['overnightChanges']> {
    // Get employee's Mantis user ID
    let userId: number | null = null;
    
    if (user.employeeId) {
      const { data: employee } = await this.supabase
        .from('hs_hr_employee')
        .select('emp_work_email')
        .eq('emp_number', user.employeeId)
        .single();

      if (employee) {
        const { data: mantisUser } = await this.supabase
          .from('mantis_user_table')
          .select('id')
          .ilike('email', employee.emp_work_email)
          .single();
        
        userId = mantisUser?.id || null;
      }
    }

    // New tasks assigned to user since yesterday
    let newTasksQuery = this.supabase
      .from('mantis_bug_table')
      .select('id, summary, eta')
      .gte('date_submitted', since.toISOString());

    if (userId) {
      newTasksQuery = newTasksQuery.eq('handler_id', userId);
    }

    const { data: newTasks } = await newTasksQuery;
    const newTasksAssigned = newTasks?.length || 0;
    const totalNewEta = newTasks?.reduce((sum, t) => sum + (t.eta || 0), 0) || 0;

    // Status changes (projects moved to at-risk, etc.)
    const { data: recentAlerts } = await this.supabase
      .from('risk_alerts')
      .select('entity_id, title, metadata')
      .eq('entity_type', 'project')
      .gte('created_at', since.toISOString())
      .limit(5);

    const statusChanges = recentAlerts?.map(a => ({
      project: a.metadata?.projectName || `Project ${a.entity_id}`,
      change: a.title,
    })) || [];

    // Tasks closed by team
    const { data: closedTasks } = await this.supabase
      .from('mantis_bug_table')
      .select(`
        summary,
        eta,
        mantis_user_table!handler_id (realname)
      `)
      .in('status', [80, 90])
      .gte('last_updated', since.toISOString())
      .limit(5);

    const tasksClosed = closedTasks?.map(t => ({
      name: t.summary || 'Untitled',
      by: (t.mantis_user_table as any)?.realname || 'Unknown',
      eta: t.eta || 0,
    })) || [];

    return {
      newTasksAssigned,
      totalNewEta,
      statusChanges,
      tasksClosed,
    };
  }

  /**
   * Get user's day outlook
   */
  private async getUserDayOutlook(user: AuthUser): Promise<DigestContent['yourDay']> {
    let availableHours = 8; // Default working day
    let meetingHours = 0;

    // Get calendar events if connected
    if (user.id) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: events } = await this.supabase
        .from('calendar_events')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .gte('start_time', today.toISOString().split('T')[0])
        .lt('start_time', tomorrow.toISOString().split('T')[0])
        .eq('status', 'confirmed');

      meetingHours = Math.round((events?.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) || 0) / 60 * 10) / 10;
      availableHours = Math.max(0, 8 - meetingHours);
    }

    // Get priority tasks
    const priorityTasks: DigestContent['yourDay']['priorityTasks'] = [];
    
    if (user.employeeId) {
      const tasks = await this.engine.getResourceTasks(user.employeeId, { activeOnly: true, limit: 10 });
      
      // Sort by urgency (due date, blocking status)
      const sortedTasks = tasks
        .map(t => ({
          id: t.id,
          name: t.summary || 'Untitled',
          eta: parseFloat(t.eta) || 0,
          urgency: this.calculateUrgency(t),
        }))
        .sort((a, b) => this.urgencyOrder(a.urgency) - this.urgencyOrder(b.urgency))
        .slice(0, 5);

      priorityTasks.push(...sortedTasks);
    }

    // Get risk alerts for user's tasks
    const riskAlerts: DigestContent['yourDay']['riskAlerts'] = [];

    if (user.employeeId) {
      // Get tasks at risk of breach
      const tasks = await this.engine.getResourceTasks(user.employeeId, { activeOnly: true });
      
      for (const task of tasks.slice(0, 3)) {
        const eta = parseFloat(task.eta) || 0;
        if (eta > 0) {
          // Simple breach probability calculation
          const dueDate = task.dueDate ? new Date(task.dueDate) : null;
          const now = new Date();
          
          if (dueDate && dueDate < now) {
            riskAlerts.push({
              task: task.summary || 'Untitled',
              probability: 95,
              reason: 'Past due date',
            });
          }
        }
      }
    }

    return {
      availableHours,
      meetingHours,
      priorityTasks,
      riskAlerts,
    };
  }

  /**
   * Get team snapshot
   */
  private async getTeamSnapshot(): Promise<DigestContent['teamSnapshot']> {
    const metrics = await this.engine.getResourceWorkloadMetrics({ period: 'week' });
    const states = metrics.map(m => this.classifier.classify(m));

    const overloadedCount = states.filter(s => s === 'overloaded').length;
    const atRiskCount = states.filter(s => s === 'at_risk').length;

    // Get blocked tasks count
    const { count: blockedTasksCount } = await this.supabase
      .from('task_dependencies')
      .select('child_task_id', { count: 'exact', head: true })
      .eq('dependency_type', 'blocks');

    return {
      overloadedCount,
      atRiskCount,
      blockedTasksCount: blockedTasksCount || 0,
    };
  }

  /**
   * Calculate task urgency
   */
  private calculateUrgency(task: any): string {
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const now = new Date();

    if (!dueDate) return 'normal';

    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue <= 1) return 'urgent';
    if (daysUntilDue <= 3) return 'high';
    return 'normal';
  }

  /**
   * Urgency sort order
   */
  private urgencyOrder(urgency: string): number {
    const order: Record<string, number> = {
      overdue: 0,
      urgent: 1,
      high: 2,
      normal: 3,
    };
    return order[urgency] ?? 4;
  }
}

