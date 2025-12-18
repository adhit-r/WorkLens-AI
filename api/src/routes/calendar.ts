import { Hono } from 'hono';
import { z } from 'zod';

const calendar = new Hono();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8787/api/calendar/callback';

// Initiate Google OAuth
calendar.get('/connect', async (c) => {
  const user = c.get('user');
  
  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events.readonly',
  ];

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes.join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', user.id);

  return c.json({ authUrl: authUrl.toString() });
});

// OAuth callback
calendar.get('/callback', async (c) => {
  const supabase = c.get('supabase');
  const code = c.req.query('code');
  const state = c.req.query('state'); // user.id
  const error = c.req.query('error');

  if (error) {
    return c.redirect(`${process.env.FRONTEND_URL}/settings?calendar_error=${error}`);
  }

  if (!code || !state) {
    return c.redirect(`${process.env.FRONTEND_URL}/settings?calendar_error=missing_params`);
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: GOOGLE_REDIRECT_URI,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      throw new Error('Failed to get access token');
    }

    // Get user's employee ID
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('employee_id')
      .eq('user_id', state)
      .single();

    // Store tokens
    await (supabase as any)
      .from('calendar_connections')
      .upsert({
        user_id: state,
        employee_id: userRole?.employee_id,
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        is_active: true,
      });

    return c.redirect(`${process.env.FRONTEND_URL}/settings?calendar_connected=true`);
  } catch (err) {
    console.error('Calendar OAuth error:', err);
    return c.redirect(`${process.env.FRONTEND_URL}/settings?calendar_error=token_exchange_failed`);
  }
});

// Get connection status
calendar.get('/status', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');

  const { data } = await supabase
    .from('calendar_connections')
    .select('provider, is_active, last_sync_at')
    .eq('user_id', user.id)
    .single();

  return c.json({
    connected: !!(data as any)?.is_active,
    provider: (data as any)?.provider,
    lastSync: (data as any)?.last_sync_at,
  });
});

// Sync calendar events
calendar.post('/sync', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');

  // Get stored tokens
  const { data: connection } = await supabase
    .from('calendar_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!connection) {
    return c.json({ error: 'No calendar connected' }, 400);
  }

  const conn = connection as any;
  let accessToken = conn.access_token;

  // Check if token is expired and refresh if needed
  if (new Date(conn.token_expiry) < new Date()) {
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: conn.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const newTokens = await refreshResponse.json();
    
    if (!newTokens.access_token) {
      // Refresh failed, mark connection as inactive
      await supabase
        .from('calendar_connections')
        .update({ is_active: false })
        .eq('id', conn.id);
      
      return c.json({ error: 'Calendar connection expired. Please reconnect.' }, 401);
    }

    accessToken = newTokens.access_token;

    // Update stored token
    await supabase
      .from('calendar_connections')
      .update({
        access_token: accessToken,
        token_expiry: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
      })
      .eq('id', connection.id);
  }

  // Fetch events from Google Calendar
  const timeMin = new Date();
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 30); // Next 30 days

  const eventsResponse = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
    `timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const eventsData = await eventsResponse.json();

  if (!eventsData.items) {
    return c.json({ error: 'Failed to fetch calendar events' }, 500);
  }

  // Delete existing events for this user
  await supabase
    .from('calendar_events')
    .delete()
    .eq('user_id', user.id);

  // Insert new events
  const events = eventsData.items
    .filter((e: any) => e.start?.dateTime && e.end?.dateTime)
    .map((e: any) => ({
      user_id: user.id,
      employee_id: connection.employee_id,
      external_id: e.id,
      title: e.summary || 'Untitled',
      start_time: e.start.dateTime,
      end_time: e.end.dateTime,
      is_all_day: false,
      status: e.status || 'confirmed',
    }));

  if (events.length > 0) {
    await supabase.from('calendar_events').insert(events);
  }

  // Update last sync time
  await supabase
    .from('calendar_connections')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', connection.id);

  return c.json({ 
    synced: events.length,
    message: `Synced ${events.length} events` 
  });
});

// Get events for a date range
calendar.get('/events', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');
  
  const startDate = c.req.query('start') || new Date().toISOString();
  const endDate = c.req.query('end') || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: events, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', user.id)
    .gte('start_time', startDate)
    .lte('end_time', endDate)
    .order('start_time');

  if (error) {
    return c.json({ error: 'Failed to fetch events' }, 500);
  }

  // Calculate total meeting hours
  const totalMinutes = events?.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) || 0;

  return c.json({ 
    events,
    totalMeetingHours: Math.round(totalMinutes / 60 * 100) / 100,
  });
});

// Disconnect calendar
calendar.delete('/disconnect', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');

  // Delete connection
  await supabase
    .from('calendar_connections')
    .delete()
    .eq('user_id', user.id);

  // Delete cached events
  await supabase
    .from('calendar_events')
    .delete()
    .eq('user_id', user.id);

  return c.json({ success: true });
});

export default calendar;

