import { Hono } from 'hono';
import { z } from 'zod';
import { SQLEngine } from '../sql/engine';
import { GeminiClient } from '../gemini/client';
import { DigestGenerator } from '../gemini/digest';

const digest = new Hono();

// Get user's digest preferences
digest.get('/preferences', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');

  const { data, error } = await supabase
    .from('digest_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return c.json({ error: 'Failed to fetch preferences' }, 500);
  }

  // Return defaults if no preferences set
  return c.json(data || {
    email_enabled: true,
    in_app_enabled: true,
    digest_time: '08:00:00',
    timezone: 'Asia/Kolkata',
    include_team_snapshot: true,
    include_risk_alerts: true,
  });
});

// Update digest preferences
digest.put('/preferences', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');
  const body = await c.req.json();

  const prefsSchema = z.object({
    emailEnabled: z.boolean().optional(),
    inAppEnabled: z.boolean().optional(),
    digestTime: z.string().optional(),
    timezone: z.string().optional(),
    includeTeamSnapshot: z.boolean().optional(),
    includeRiskAlerts: z.boolean().optional(),
  });

  const prefs = prefsSchema.parse(body);

  const { data, error } = await supabase
    .from('digest_preferences')
    .upsert({
      user_id: user.id,
      employee_id: user.employeeId,
      email_enabled: prefs.emailEnabled,
      in_app_enabled: prefs.inAppEnabled,
      digest_time: prefs.digestTime,
      timezone: prefs.timezone,
      include_team_snapshot: prefs.includeTeamSnapshot,
      include_risk_alerts: prefs.includeRiskAlerts,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return c.json({ error: 'Failed to update preferences' }, 500);
  }

  return c.json(data);
});

// Get today's digest (on-demand)
digest.get('/today', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');

  const engine = new SQLEngine(supabase);
  const gemini = new GeminiClient();
  const generator = new DigestGenerator(supabase, engine, gemini);

  const digest = await generator.generateDigest(user);

  return c.json(digest);
});

// Preview digest without saving
digest.get('/preview', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');

  const engine = new SQLEngine(supabase);
  const gemini = new GeminiClient();
  const generator = new DigestGenerator(supabase, engine, gemini);

  const preview = await generator.generateDigest(user, { preview: true });

  return c.json(preview);
});

export default digest;

