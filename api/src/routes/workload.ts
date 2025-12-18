import { Hono } from 'hono';
import { z } from 'zod';
import { SQLEngine } from '../sql/engine';
import { WorkloadStateClassifier } from '../sql/workload-states';
import { canViewEmployee } from '../middleware/auth';
import { ForbiddenError, ValidationError } from '../middleware/error';

const workload = new Hono();

const periodSchema = z.enum(['week', 'month']).default('week');

// Get workload overview for all resources
workload.get('/overview', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');
  const period = periodSchema.parse(c.req.query('period'));
  
  const engine = new SQLEngine(supabase);
  const classifier = new WorkloadStateClassifier();
  
  // Get all resources with their workload metrics
  const metrics = await engine.getResourceWorkloadMetrics({ period });
  
  // Classify workload states
  const classifiedMetrics = metrics.map(m => ({
    ...m,
    workloadState: classifier.classify(m),
  }));

  // Calculate overview stats
  const overview = {
    totalActiveTaskCount: classifiedMetrics.reduce((sum, m) => sum + m.activeTaskCount, 0),
    averageBandwidth: classifiedMetrics.reduce((sum, m) => sum + m.bandwidth, 0) / classifiedMetrics.length,
    averageAvailability: classifiedMetrics.reduce((sum, m) => sum + m.availabilityPct, 0) / classifiedMetrics.length,
    stateBreakdown: {
      overloaded: classifiedMetrics.filter(m => m.workloadState === 'overloaded').length,
      atRisk: classifiedMetrics.filter(m => m.workloadState === 'at_risk').length,
      balanced: classifiedMetrics.filter(m => m.workloadState === 'balanced').length,
      underutilized: classifiedMetrics.filter(m => m.workloadState === 'underutilized').length,
      idleDrift: classifiedMetrics.filter(m => m.workloadState === 'idle_drift').length,
    },
    resources: classifiedMetrics,
  };

  return c.json(overview);
});

// Get workload for a specific resource
workload.get('/resource/:employeeId', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');
  const employeeId = parseInt(c.req.param('employeeId'));
  const period = periodSchema.parse(c.req.query('period'));

  if (!canViewEmployee(employeeId, user)) {
    throw new ForbiddenError('You can only view your own workload');
  }

  const engine = new SQLEngine(supabase);
  const classifier = new WorkloadStateClassifier();

  const metrics = await engine.getResourceWorkloadMetrics({ 
    period, 
    employeeId 
  });

  if (metrics.length === 0) {
    return c.json({ error: 'Resource not found' }, 404);
  }

  const resourceMetrics = metrics[0];
  const workloadState = classifier.classify(resourceMetrics);

  // Get task breakdown
  const tasks = await engine.getResourceTasks(employeeId, { activeOnly: true });

  return c.json({
    ...resourceMetrics,
    workloadState,
    tasks,
  });
});

// Get workload by project
workload.get('/project/:projectId', async (c) => {
  const supabase = c.get('supabase');
  const projectId = parseInt(c.req.param('projectId'));
  const period = periodSchema.parse(c.req.query('period'));

  const engine = new SQLEngine(supabase);
  const metrics = await engine.getProjectWorkloadMetrics(projectId, { period });

  return c.json(metrics);
});

// Get bandwidth forecast
workload.get('/forecast/:employeeId', async (c) => {
  const user = c.get('user');
  const employeeId = parseInt(c.req.param('employeeId'));
  const weeks = parseInt(c.req.query('weeks') || '4');

  if (!canViewEmployee(employeeId, user)) {
    throw new ForbiddenError('You can only view your own forecast');
  }

  const supabase = c.get('supabase');
  const engine = new SQLEngine(supabase);

  const forecast = await engine.getBandwidthForecast(employeeId, weeks);

  return c.json(forecast);
});

// Get obligation flow data
workload.get('/obligation-flow', async (c) => {
  const supabase = c.get('supabase');
  const weeks = parseInt(c.req.query('weeks') || '8');
  const projectId = c.req.query('projectId') ? parseInt(c.req.query('projectId')!) : undefined;

  const engine = new SQLEngine(supabase);
  const flowData = await engine.getObligationFlow(weeks, projectId);

  return c.json(flowData);
});

export default workload;

