import { Hono } from 'hono';
import { z } from 'zod';
import { canViewEmployee } from '../middleware/auth';
import { ForbiddenError } from '../middleware/error';
import { SQLEngine } from '../sql/engine';
import { GeminiClient } from '../gemini/client';

const leave = new Hono();

const createLeaveSchema = z.object({
  employeeId: z.number(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  leaveType: z.enum(['vacation', 'sick', 'personal', 'wfh']).default('vacation'),
  notes: z.string().optional(),
});

// Get leave for an employee
leave.get('/employee/:employeeId', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');
  const employeeId = parseInt(c.req.param('employeeId'));

  if (!canViewEmployee(employeeId, user)) {
    throw new ForbiddenError('You can only view your own leave');
  }

  const { data, error } = await supabase
    .from('leave_calendar')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('end_date', new Date().toISOString().split('T')[0])
    .order('start_date');

  if (error) {
    return c.json({ error: 'Failed to fetch leave' }, 500);
  }

  return c.json({ leave: data });
});

// Get upcoming leave for all team members (managers+)
leave.get('/upcoming', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');
  const days = parseInt(c.req.query('days') || '30');

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  const { data, error } = await supabase
    .from('leave_calendar')
    .select(`
      *,
      hs_hr_employee (
        emp_firstname,
        emp_lastname,
        emp_work_email
      )
    `)
    .gte('end_date', new Date().toISOString().split('T')[0])
    .lte('start_date', endDate.toISOString().split('T')[0])
    .eq('status', 'approved')
    .order('start_date');

  if (error) {
    return c.json({ error: 'Failed to fetch upcoming leave' }, 500);
  }

  return c.json({ leave: data });
});

// Create leave entry
leave.post('/', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');
  const body = await c.req.json();
  
  const parsed = createLeaveSchema.parse(body);

  // Users can only create leave for themselves unless manager+
  if (user.role === 'individual_contributor' && parsed.employeeId !== user.employeeId) {
    throw new ForbiddenError('You can only create leave for yourself');
  }

  // Validate dates
  if (new Date(parsed.endDate) < new Date(parsed.startDate)) {
    return c.json({ error: 'End date must be after start date' }, 400);
  }

  const { data, error } = await supabase
    .from('leave_calendar')
    .insert({
      employee_id: parsed.employeeId,
      start_date: parsed.startDate,
      end_date: parsed.endDate,
      leave_type: parsed.leaveType,
      notes: parsed.notes,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return c.json({ error: 'Failed to create leave entry' }, 500);
  }

  return c.json(data, 201);
});

// Analyze leave impact
leave.post('/impact', async (c) => {
  const supabase = c.get('supabase');
  const body = await c.req.json();
  
  const { employeeId, startDate, endDate } = z.object({
    employeeId: z.number(),
    startDate: z.string(),
    endDate: z.string(),
  }).parse(body);

  const engine = new SQLEngine(supabase);
  const gemini = new GeminiClient();

  // Get employee info
  const { data: employee } = await supabase
    .from('hs_hr_employee')
    .select('emp_firstname, emp_lastname')
    .eq('emp_number', employeeId)
    .single();

  // Get remaining ETA for this employee
  const workloadMetrics = await engine.getResourceWorkloadMetrics({ 
    employeeId,
    period: 'month' 
  });

  // Get tasks with due dates during leave
  const { data: affectedTasks } = await supabase
    .from('mantis_bug_table')
    .select(`
      id,
      summary,
      status,
      due_date,
      eta
    `)
    .eq('handler_id', employeeId)
    .not('status', 'in', '(80,90)')
    .gte('due_date', startDate)
    .lte('due_date', endDate);

  // Get tasks blocking others
  const { data: blockingTasks } = await supabase
    .from('task_dependencies')
    .select(`
      parent_task:mantis_bug_table!parent_task_id (
        id,
        summary,
        handler_id
      ),
      child_task:mantis_bug_table!child_task_id (
        id,
        summary,
        handler_id
      )
    `)
    .eq('dependency_type', 'blocks');

  // Filter to this employee's blocking tasks
  const employeeBlockingTasks = blockingTasks?.filter(
    (t: any) => t.parent_task?.handler_id === employeeId
  );

  // Calculate team bandwidth impact (simplified)
  const remainingEta = workloadMetrics[0]?.yetToSpend || 0;
  
  // Use Gemini to generate recommendations
  const impactAnalysis = await gemini.analyzeLeaveImpact({
    employeeName: `${employee?.emp_firstname} ${employee?.emp_lastname}`,
    startDate,
    endDate,
    remainingEta,
    affectedTasks: affectedTasks || [],
    blockingTasks: employeeBlockingTasks || [],
  });

  return c.json({
    employee: employee,
    leavePeriod: { startDate, endDate },
    impact: {
      remainingEtaPaused: remainingEta,
      tasksWithDueDatesDuringLeave: affectedTasks?.length || 0,
      tasksList: affectedTasks || [],
      blockingTasksCount: employeeBlockingTasks?.length || 0,
      blockingTasks: employeeBlockingTasks || [],
    },
    analysis: impactAnalysis,
  });
});

// Delete leave entry
leave.delete('/:leaveId', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');
  const leaveId = c.req.param('leaveId');

  // Get leave entry to check ownership
  const { data: leaveEntry } = await supabase
    .from('leave_calendar')
    .select('employee_id')
    .eq('id', leaveId)
    .single();

  if (!leaveEntry) {
    return c.json({ error: 'Leave entry not found' }, 404);
  }

  if (user.role === 'individual_contributor' && leaveEntry.employee_id !== user.employeeId) {
    throw new ForbiddenError('You can only delete your own leave');
  }

  const { error } = await supabase
    .from('leave_calendar')
    .delete()
    .eq('id', leaveId);

  if (error) {
    return c.json({ error: 'Failed to delete leave entry' }, 500);
  }

  return c.json({ success: true });
});

export default leave;

