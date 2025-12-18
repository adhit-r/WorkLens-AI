import { ResourceMetrics } from './engine';

export type WorkloadState = 
  | 'overloaded' 
  | 'at_risk' 
  | 'balanced' 
  | 'underutilized' 
  | 'idle_drift';

export interface WorkloadClassification {
  state: WorkloadState;
  confidence: number;
  reasons: string[];
}

export class WorkloadStateClassifier {
  /**
   * Classify a resource's workload state based on metrics
   */
  classify(metrics: ResourceMetrics): WorkloadState {
    const { 
      yetToSpend, 
      totalWorkingHours, 
      availabilityPct, 
      totalEta,
      activeTaskCount 
    } = metrics;

    // Rule 1: Overloaded - remaining obligation > available working hours
    if (yetToSpend > totalWorkingHours) {
      return 'overloaded';
    }

    // Rule 2: At Risk - burn rate exceeds remaining time (availability < 20%)
    if (availabilityPct < 20 && yetToSpend > 0) {
      return 'at_risk';
    }

    // Rule 3: Idle Drift - active but minimal ETA assigned
    if (activeTaskCount > 0 && totalEta < 8) {
      return 'idle_drift';
    }

    // Rule 4: Underutilized - high availability + low obligation
    if (availabilityPct > 80 && yetToSpend < 8) {
      return 'underutilized';
    }

    // Rule 5: Balanced - healthy allocation (20-80% availability)
    return 'balanced';
  }

  /**
   * Get detailed classification with reasoning
   */
  classifyWithReasoning(metrics: ResourceMetrics): WorkloadClassification {
    const state = this.classify(metrics);
    const reasons: string[] = [];
    let confidence = 0.8; // Default confidence

    switch (state) {
      case 'overloaded':
        reasons.push(`Remaining obligation (${metrics.yetToSpend}h) exceeds available hours (${metrics.totalWorkingHours}h)`);
        reasons.push(`Would need ${Math.round((metrics.yetToSpend / metrics.totalWorkingHours - 1) * 100)}% more time to complete`);
        confidence = Math.min(0.95, 0.7 + (metrics.yetToSpend / metrics.totalWorkingHours - 1) * 0.25);
        break;

      case 'at_risk':
        reasons.push(`Availability at ${metrics.availabilityPct}% is critically low`);
        reasons.push(`${metrics.yetToSpend}h of work remaining with limited capacity`);
        confidence = 0.85;
        break;

      case 'idle_drift':
        reasons.push(`${metrics.activeTaskCount} active tasks but only ${metrics.totalEta}h of ETA assigned`);
        reasons.push('Tasks may lack proper estimation or be stagnant');
        confidence = 0.7;
        break;

      case 'underutilized':
        reasons.push(`${metrics.availabilityPct}% availability indicates excess capacity`);
        reasons.push(`Only ${metrics.yetToSpend}h of remaining work`);
        confidence = 0.85;
        break;

      case 'balanced':
        reasons.push(`Healthy availability at ${metrics.availabilityPct}%`);
        reasons.push(`Workload and capacity are well-matched`);
        confidence = 0.9;
        break;
    }

    return { state, confidence, reasons };
  }

  /**
   * Get state display properties
   */
  getStateDisplay(state: WorkloadState): { label: string; color: string; icon: string } {
    const displays: Record<WorkloadState, { label: string; color: string; icon: string }> = {
      overloaded: { label: 'Overloaded', color: 'red', icon: '🔴' },
      at_risk: { label: 'At Risk', color: 'orange', icon: '🟠' },
      balanced: { label: 'Balanced', color: 'green', icon: '🟢' },
      underutilized: { label: 'Underutilized', color: 'blue', icon: '🔵' },
      idle_drift: { label: 'Idle Drift', color: 'gray', icon: '⚪' },
    };

    return displays[state];
  }

  /**
   * Get priority for state (for sorting/alerting)
   */
  getStatePriority(state: WorkloadState): number {
    const priorities: Record<WorkloadState, number> = {
      overloaded: 1,
      at_risk: 2,
      idle_drift: 3,
      underutilized: 4,
      balanced: 5,
    };

    return priorities[state];
  }

  /**
   * Calculate team health from individual states
   */
  calculateTeamHealth(states: WorkloadState[]): {
    healthScore: number;
    distribution: Record<WorkloadState, number>;
    alerts: string[];
  } {
    const distribution: Record<WorkloadState, number> = {
      overloaded: 0,
      at_risk: 0,
      balanced: 0,
      underutilized: 0,
      idle_drift: 0,
    };

    states.forEach(s => distribution[s]++);

    // Health score calculation
    const total = states.length;
    const healthScore = total > 0
      ? Math.round(
          ((distribution.balanced * 100) +
           (distribution.underutilized * 60) +
           (distribution.at_risk * 30) +
           (distribution.idle_drift * 40) +
           (distribution.overloaded * 0)) / total
        )
      : 0;

    // Generate alerts
    const alerts: string[] = [];
    
    if (distribution.overloaded > 0) {
      alerts.push(`${distribution.overloaded} team member(s) are overloaded`);
    }
    
    if (distribution.at_risk > total * 0.3) {
      alerts.push(`Over 30% of team is at risk`);
    }
    
    if (distribution.idle_drift > total * 0.2) {
      alerts.push(`${distribution.idle_drift} team member(s) showing idle drift - check task assignments`);
    }

    if (distribution.underutilized > total * 0.4) {
      alerts.push(`High underutilization - consider redistributing work`);
    }

    return { healthScore, distribution, alerts };
  }
}

