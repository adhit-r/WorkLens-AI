import { SupabaseClient } from '@supabase/supabase-js';
import { GeminiClient } from './client';
import { SQLEngine } from '../sql/engine';

export interface BreachPrediction {
  taskId: number;
  taskName: string;
  probability: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  factors: {
    etaInflation: number;
    progressRatio: number;
    statusDays: number;
    handlerLoad: number;
  };
}

export interface OverloadForecast {
  employeeId: number;
  employeeName: string;
  currentAvailability: number;
  predictedOverloadDate: string | null;
  daysUntilOverload: number | null;
  confidence: 'high' | 'medium' | 'low';
  contributingFactors: string[];
}

export class LLMPredictor {
  private supabase: SupabaseClient;
  private gemini: GeminiClient;
  private engine: SQLEngine;

  constructor(supabase: SupabaseClient, gemini: GeminiClient, engine: SQLEngine) {
    this.supabase = supabase;
    this.gemini = gemini;
    this.engine = engine;
  }

  /**
   * Predict ETA breach probability for active tasks
   */
  async predictBreaches(employeeId?: number): Promise<BreachPrediction[]> {
    const predictions: BreachPrediction[] = [];

    // Get active tasks
    let query = this.supabase
      .from('mantis_bug_table')
      .select(`
        id,
        summary,
        status,
        eta,
        handler_id,
        date_submitted,
        last_updated,
        mantis_custom_field_string_table (field_id, value)
      `)
      .not('status', 'in', '(80,90)')
      .eq('source_system', 'DEFAULT');

    if (employeeId) {
      const { data: employee } = await this.supabase
        .from('hs_hr_employee')
        .select('emp_work_email')
        .eq('emp_number', employeeId)
        .single();

      if (employee) {
        const { data: user } = await this.supabase
          .from('mantis_user_table')
          .select('id')
          .ilike('email', employee.emp_work_email)
          .single();

        if (user) {
          query = query.eq('handler_id', user.id);
        }
      }
    }

    const { data: tasks } = await query.limit(20);

    for (const task of tasks || []) {
      // Get custom ETA
      const etaField = (task.mantis_custom_field_string_table as any[])?.find(
        (cf: any) => cf.field_id === 4
      );
      const currentEta = parseFloat(etaField?.value || task.eta || '0');

      if (currentEta <= 0) continue;

      // Get original ETA from estimation history
      const { data: history } = await this.supabase
        .from('estimation_history')
        .select('eta_at_creation')
        .eq('task_id', task.id)
        .order('recorded_at', { ascending: true })
        .limit(1)
        .single();

      const originalEta = history?.eta_at_creation || currentEta;

      // Get time spent
      const { data: bugnotes } = await this.supabase
        .from('mantis_bugnote_table')
        .select('time_tracking')
        .eq('bug_id', task.id)
        .eq('source_system', 'DEFAULT');

      const timeSpent = (bugnotes?.reduce((sum, n) => sum + (n.time_tracking || 0), 0) || 0) / 60;

      // Calculate status days
      const lastUpdated = new Date(task.last_updated);
      const now = new Date();
      const statusDays = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));

      // Get handler's total load
      const handlerMetrics = await this.engine.getResourceWorkloadMetrics({
        period: 'week',
      });
      const handlerLoad = handlerMetrics.find(m => m.employeeId === task.handler_id)?.yetToSpend || 0;

      // Get historical breach rate
      const { data: historicalBreaches } = await this.supabase
        .from('estimation_history')
        .select('accuracy_score')
        .eq('is_final', true)
        .lt('accuracy_score', 0);

      const { count: totalHistorical } = await this.supabase
        .from('estimation_history')
        .select('id', { count: 'exact', head: true })
        .eq('is_final', true);

      const historicalBreachRate = totalHistorical 
        ? ((historicalBreaches?.length || 0) / totalHistorical) * 100 
        : 30;

      // Status label
      const statusLabels: Record<number, string> = {
        10: 'New', 20: 'Feedback', 30: 'Acknowledged', 40: 'Confirmed',
        50: 'Assigned', 60: 'Movedout', 70: 'Deferred'
      };

      // Use Gemini for prediction
      const prediction = await this.gemini.predictBreachProbability({
        taskName: task.summary || 'Untitled',
        originalEta,
        currentEta,
        timeSpent,
        statusDays,
        status: statusLabels[task.status] || 'Unknown',
        handlerLoad,
        historicalBreachRate,
      });

      predictions.push({
        taskId: task.id,
        taskName: task.summary || 'Untitled',
        probability: prediction.probability,
        confidence: prediction.confidence,
        reasoning: prediction.reasoning,
        factors: {
          etaInflation: currentEta > originalEta ? ((currentEta - originalEta) / originalEta) * 100 : 0,
          progressRatio: currentEta > 0 ? (timeSpent / currentEta) * 100 : 0,
          statusDays,
          handlerLoad,
        },
      });
    }

    // Sort by probability descending
    predictions.sort((a, b) => b.probability - a.probability);

    return predictions;
  }

  /**
   * Forecast when employees will become overloaded
   */
  async forecastOverloads(): Promise<OverloadForecast[]> {
    const forecasts: OverloadForecast[] = [];
    const metrics = await this.engine.getResourceWorkloadMetrics({ period: 'week' });

    for (const m of metrics) {
      const contributingFactors: string[] = [];

      // Calculate burn rate (hours consumed per day)
      const dailyBurnRate = m.timeSpent > 0 ? m.timeSpent / 5 : 4; // Default 4h/day if no data

      // Estimate days until overload
      let daysUntilOverload: number | null = null;
      let predictedOverloadDate: string | null = null;

      if (m.yetToSpend > m.bandwidth) {
        // Already overloaded
        daysUntilOverload = 0;
        predictedOverloadDate = new Date().toISOString().split('T')[0];
        contributingFactors.push('Currently overloaded');
      } else if (dailyBurnRate > 0) {
        // Calculate future date when remaining work exceeds capacity
        const remainingCapacity = m.bandwidth;
        const dailyNewWork = 2; // Assume 2h of new work per day on average
        
        if (dailyNewWork > dailyBurnRate) {
          const daysToOverload = Math.floor(remainingCapacity / (dailyNewWork - dailyBurnRate));
          if (daysToOverload < 30) {
            daysUntilOverload = daysToOverload;
            const overloadDate = new Date();
            overloadDate.setDate(overloadDate.getDate() + daysToOverload);
            predictedOverloadDate = overloadDate.toISOString().split('T')[0];
            contributingFactors.push(`Work intake (${dailyNewWork}h/day) exceeds burn rate (${dailyBurnRate.toFixed(1)}h/day)`);
          }
        }
      }

      // Add contributing factors based on metrics
      if (m.availabilityPct < 30) {
        contributingFactors.push(`Low availability (${m.availabilityPct.toFixed(0)}%)`);
      }
      if (m.activeTaskCount > 10) {
        contributingFactors.push(`High task count (${m.activeTaskCount} active tasks)`);
      }
      if (m.yetToSpend > 30) {
        contributingFactors.push(`High remaining obligation (${m.yetToSpend.toFixed(0)}h)`);
      }

      // Determine confidence
      let confidence: 'high' | 'medium' | 'low' = 'medium';
      if (daysUntilOverload !== null && daysUntilOverload <= 3) {
        confidence = 'high';
      } else if (contributingFactors.length < 2) {
        confidence = 'low';
      }

      forecasts.push({
        employeeId: m.employeeId,
        employeeName: m.employeeName,
        currentAvailability: m.availabilityPct,
        predictedOverloadDate,
        daysUntilOverload,
        confidence,
        contributingFactors,
      });
    }

    // Sort by days until overload (null = no overload predicted, goes last)
    forecasts.sort((a, b) => {
      if (a.daysUntilOverload === null && b.daysUntilOverload === null) return 0;
      if (a.daysUntilOverload === null) return 1;
      if (b.daysUntilOverload === null) return -1;
      return a.daysUntilOverload - b.daysUntilOverload;
    });

    return forecasts;
  }

  /**
   * Predict project delivery date
   */
  async predictProjectDelivery(projectId: number): Promise<{
    predictedCompletionDate: string | null;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    assumptions: string[];
  }> {
    const metrics = await this.engine.getProjectMetrics(projectId);
    const teamAllocation = await this.engine.getProjectTeamAllocation(projectId);

    // Calculate remaining work
    const remainingTasks = metrics.activeTasks;
    const totalRemainingEta = teamAllocation.reduce((sum, a) => sum + a.eta, 0);

    // Calculate team velocity (tasks per week)
    const velocity = await this.engine.getVelocityTrends(projectId, 4);
    const avgWeeklyVelocity = (velocity.trends as any[]).reduce((sum, t) => sum + t.tasksCompleted, 0) / velocity.trends.length;

    if (avgWeeklyVelocity <= 0) {
      return {
        predictedCompletionDate: null,
        confidence: 'low',
        reasoning: 'Insufficient velocity data to predict completion',
        assumptions: ['No recent task completions to establish velocity'],
      };
    }

    // Estimate weeks to completion
    const weeksToComplete = Math.ceil(remainingTasks / avgWeeklyVelocity);
    
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + weeksToComplete * 7);

    const assumptions = [
      `Average velocity: ${avgWeeklyVelocity.toFixed(1)} tasks/week`,
      `Remaining tasks: ${remainingTasks}`,
      `Total remaining ETA: ${totalRemainingEta.toFixed(0)}h`,
      'Assumes no scope changes',
      'Assumes current team allocation',
    ];

    // Determine confidence based on velocity consistency
    const velocityVariance = this.calculateVariance((velocity.trends as any[]).map(t => t.tasksCompleted));
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    
    if (velocityVariance < 1) {
      confidence = 'high';
    } else if (velocityVariance > 4) {
      confidence = 'low';
    }

    return {
      predictedCompletionDate: completionDate.toISOString().split('T')[0],
      confidence,
      reasoning: `Based on average velocity of ${avgWeeklyVelocity.toFixed(1)} tasks/week, project should complete in approximately ${weeksToComplete} weeks.`,
      assumptions,
    };
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }
}

