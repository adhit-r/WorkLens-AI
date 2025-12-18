import { Context, Next } from 'hono';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export interface AuthUser {
  id: string;
  email: string;
  role: 'individual_contributor' | 'manager' | 'program_manager' | 'leadership' | 'hr';
  employeeId?: number;
  teamId?: number;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
    supabase: any;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  // DEVELOPMENT BYPASS: Allow requests from localhost without auth if configured
  const host = c.req.header('host');
  const isLocal = host?.includes('localhost') || host?.includes('127.0.0.1');
  const allowBypass = process.env.NODE_ENV === 'development' || process.env.AUTH_BYPASS === 'true';

  console.log(`Auth attempt: host=${host}, isLocal=${isLocal}, allowBypass=${allowBypass}, NODE_ENV=${process.env.NODE_ENV}`);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (isLocal && allowBypass) {
      // Create a mock user for local development
      const mockUser: AuthUser = {
        id: '00000000-0000-0000-0000-000000000000',
        email: 'dev@worklens.ai',
        role: 'manager',
        employeeId: 1, // Default to first employee in seed data
        teamId: 1,
      };
      c.set('user', mockUser);
      // Create a service role client for direct DB access in dev mode
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      c.set('supabase', supabase as any);
      return await next();
    }
    return c.json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' }, 401);
  }

  const token = authHeader.substring(7);
  
  // Create Supabase client with user's token
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  // Verify token and get user
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or expired token' }, 401);
  }

  // Get user role from database
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role, employee_id, team_id')
    .eq('user_id', user.id)
    .single();

  const authUser: AuthUser = {
    id: user.id,
    email: user.email || '',
    role: userRole?.role || 'individual_contributor',
    employeeId: userRole?.employee_id,
    teamId: userRole?.team_id,
  };

  c.set('user', authUser);
  c.set('supabase', supabase as any);

  await next();
}

// Permission check helpers
export function requireRole(...roles: AuthUser['role'][]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!roles.includes(user.role)) {
      return c.json({ 
        error: 'Forbidden', 
        message: 'You do not have permission to access this resource' 
      }, 403);
    }
    await next();
  };
}

export function canViewEmployee(userId: number, requestingUser: AuthUser): boolean {
  // Individual contributors can only view themselves
  if (requestingUser.role === 'individual_contributor') {
    return requestingUser.employeeId === userId;
  }
  // Managers, PMs, Leadership, HR can view anyone
  return true;
}

export function canViewTeam(teamId: number, requestingUser: AuthUser): boolean {
  if (requestingUser.role === 'individual_contributor') {
    return false;
  }
  if (requestingUser.role === 'manager') {
    return requestingUser.teamId === teamId;
  }
  // Program managers, leadership, HR can view all teams
  return true;
}

