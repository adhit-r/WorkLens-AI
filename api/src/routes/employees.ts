import { Hono } from 'hono';
import { canViewEmployee, requireRole } from '../middleware/auth';
import { ForbiddenError } from '../middleware/error';
import { SQLEngine } from '../sql/engine';

const employees = new Hono();

// Get all employees (managers+ only)
employees.get('/', requireRole('manager', 'program_manager', 'leadership', 'hr'), async (c) => {
  const supabase = c.get('supabase');
  
  const { data, error } = await supabase
    .from('hs_hr_employee')
    .select(`
      emp_number,
      employee_id,
      emp_firstname,
      emp_lastname,
      emp_work_email,
      emp_status,
      job_title_code,
      ohrm_job_title (
        job_title
      )
    `)
    .eq('emp_status', 2)
    .order('emp_firstname');

  if (error) {
    return c.json({ error: 'Failed to fetch employees' }, 500);
  }

  return c.json({ employees: data });
});

// Get current user's profile
employees.get('/me', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');

  const { data, error } = await supabase
    .from('hs_hr_employee')
    .select(`
      emp_number,
      employee_id,
      emp_firstname,
      emp_lastname,
      emp_work_email,
      ohrm_job_title (
        job_title
      )
    `)
    .ilike('emp_work_email', user.email)
    .single();

  if (error || !data) {
    return c.json({ error: 'Employee profile not found' }, 404);
  }

  return c.json({
    ...data,
    role: user.role,
  });
});

// Get employee details
employees.get('/:employeeId', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');
  const employeeId = parseInt(c.req.param('employeeId'));

  if (!canViewEmployee(employeeId, user)) {
    throw new ForbiddenError('You can only view your own profile');
  }

  const { data, error } = await supabase
    .from('hs_hr_employee')
    .select(`
      emp_number,
      employee_id,
      emp_firstname,
      emp_lastname,
      emp_work_email,
      emp_status,
      ohrm_job_title (
        job_title,
        job_description
      )
    `)
    .eq('emp_number', employeeId)
    .single();

  if (error || !data) {
    return c.json({ error: 'Employee not found' }, 404);
  }

  return c.json(data);
});

// Get employee's estimation accuracy
employees.get('/:employeeId/estimation-accuracy', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');
  const employeeId = parseInt(c.req.param('employeeId'));

  if (!canViewEmployee(employeeId, user)) {
    throw new ForbiddenError('You can only view your own estimation accuracy');
  }

  const engine = new SQLEngine(supabase);
  const accuracy = await engine.getEstimationAccuracy(employeeId);

  return c.json(accuracy);
});

// Get employee's workload history
employees.get('/:employeeId/history', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');
  const employeeId = parseInt(c.req.param('employeeId'));
  const days = parseInt(c.req.query('days') || '30');

  if (!canViewEmployee(employeeId, user)) {
    throw new ForbiddenError('You can only view your own history');
  }

  const { data, error } = await supabase
    .from('workload_snapshots')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('snapshot_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('snapshot_date', { ascending: true });

  if (error) {
    return c.json({ error: 'Failed to fetch history' }, 500);
  }

  return c.json({ history: data });
});

export default employees;

