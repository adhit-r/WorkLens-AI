import { Hono } from 'hono';
import { SQLEngine } from '../sql/engine';
import { RiskDetector } from '../sql/risk-patterns';
import { GeminiClient } from '../gemini/client';
import { requireRole } from '../middleware/auth';

const insights = new Hono();

// Get risk alerts
insights.get('/risks', async (c) => {
  const supabase = c.get('supabase');
  const severity = c.req.query('severity'); // 'low', 'medium', 'high', 'critical'
  const type = c.req.query('type'); // 'eta_inflation', etc.
  const resolved = c.req.query('resolved') === 'true';

  let query = supabase
    .from('risk_alerts')
    .select('*')
    .eq('is_resolved', resolved)
    .order('created_at', { ascending: false });

  if (severity) {
    query = query.eq('severity', severity);
  }
  if (type) {
    query = query.eq('alert_type', type);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    return c.json({ error: 'Failed to fetch risk alerts' }, 500);
  }

  return c.json({ alerts: data });
});

// Detect and create new risk alerts
insights.post('/detect-risks', requireRole('manager', 'program_manager', 'leadership'), async (c) => {
  const supabase = c.get('supabase');
  
  const engine = new SQLEngine(supabase);
  const detector = new RiskDetector(supabase, engine);
  
  const newAlerts = await detector.detectAllRisks();

  return c.json({ 
    detected: newAlerts.length,
    alerts: newAlerts,
  });
});

// Resolve a risk alert
insights.post('/risks/:alertId/resolve', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');
  const alertId = c.req.param('alertId');

  const { error } = await supabase
    .from('risk_alerts')
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq('id', alertId);

  if (error) {
    return c.json({ error: 'Failed to resolve alert' }, 500);
  }

  return c.json({ success: true });
});

// Get Load Stability Index for a team/org
insights.get('/lsi', async (c) => {
  const supabase = c.get('supabase');
  const projectId = c.req.query('projectId') ? parseInt(c.req.query('projectId')!) : undefined;
  const days = parseInt(c.req.query('days') || '30');

  const engine = new SQLEngine(supabase);
  const lsi = await engine.calculateLSI({ projectId, days });

  return c.json(lsi);
});

// Get "Why" narrative for current state
insights.get('/narrative', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');
  const scope = c.req.query('scope') || 'personal'; // 'personal', 'team', 'org'

  const engine = new SQLEngine(supabase);
  const gemini = new GeminiClient();

  // Gather context based on scope
  let context: any = {};

  if (scope === 'personal' && user.employeeId) {
    const metrics = await engine.getResourceWorkloadMetrics({ 
      employeeId: user.employeeId,
      period: 'week' 
    });
    context = {
      type: 'personal',
      metrics: metrics[0],
      tasks: await engine.getResourceTasks(user.employeeId, { activeOnly: true }),
    };
  } else if (scope === 'team') {
    const metrics = await engine.getResourceWorkloadMetrics({ period: 'week' });
    context = {
      type: 'team',
      metrics,
      riskAlerts: await supabase
        .from('risk_alerts')
        .select('*')
        .eq('is_resolved', false)
        .limit(10),
    };
  } else {
    const metrics = await engine.getResourceWorkloadMetrics({ period: 'week' });
    context = {
      type: 'org',
      metrics,
      projects: await engine.getProjectsSummary(),
    };
  }

  // Generate narrative using Gemini
  const narrative = await gemini.generateNarrative(context);

  return c.json({ narrative });
});

// Get estimation accuracy insights
insights.get('/estimation-patterns', requireRole('manager', 'program_manager', 'leadership'), async (c) => {
  const supabase = c.get('supabase');
  
  const engine = new SQLEngine(supabase);
  const patterns = await engine.getEstimationPatterns();

  return c.json(patterns);
});

// Get delivery velocity trends
insights.get('/velocity', async (c) => {
  const supabase = c.get('supabase');
  const projectId = c.req.query('projectId') ? parseInt(c.req.query('projectId')!) : undefined;
  const weeks = parseInt(c.req.query('weeks') || '8');

  const engine = new SQLEngine(supabase);
  const velocity = await engine.getVelocityTrends(projectId, weeks);

  return c.json(velocity);
});

// Get concentration analysis (who's carrying the load)
insights.get('/concentration', async (c) => {
  const supabase = c.get('supabase');
  const projectId = c.req.query('projectId') ? parseInt(c.req.query('projectId')!) : undefined;

  const engine = new SQLEngine(supabase);
  const concentration = await engine.getLoadConcentration(projectId);

  return c.json(concentration);
});

export default insights;

