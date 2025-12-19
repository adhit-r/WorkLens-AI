import { pgTable, text, integer, timestamp, numeric, boolean, date } from 'drizzle-orm/pg-core';

// Job Titles
export const jobTitles = pgTable('ohrm_job_title', {
  id: integer('id').primaryKey(),
  jobTitle: text('job_title'),
  jobDescription: text('job_description'),
  sourceSystem: text('source_system'),
});

// Employees
export const employees = pgTable('hs_hr_employee', {
  empNumber: integer('emp_number').primaryKey(),
  employeeId: text('employee_id'),
  empFirstname: text('emp_firstname'),
  empLastname: text('emp_lastname'),
  empStatus: integer('emp_status'),
  jobTitleCode: integer('job_title_code'),
  empWorkEmail: text('emp_work_email'),
  sourceSystem: text('source_system'),
});

// Mantis Users
export const mantisUsers = pgTable('mantis_user_table', {
  id: integer('id').primaryKey(),
  username: text('username'),
  realname: text('realname'),
  email: text('email'),
  enabled: integer('enabled'),
  sourceSystem: text('source_system'),
});

// Projects
export const projects = pgTable('mantis_project_table', {
  id: integer('id').primaryKey(),
  name: text('name'),
  status: integer('status'),
  enabled: integer('enabled'),
  description: text('description'),
  sourceSystem: text('source_system'),
});

// Tasks/Bugs
export const tasks = pgTable('mantis_bug_table', {
  id: integer('id').primaryKey(),
  projectId: integer('project_id'),
  reporterId: integer('reporter_id'),
  handlerId: integer('handler_id'),
  status: integer('status'),
  resolution: integer('resolution'),
  eta: numeric('eta'),
  summary: text('summary'),
  sourceSystem: text('source_system'),
  dateSubmitted: timestamp('date_submitted'),
  dueDate: timestamp('due_date'),
  lastUpdated: timestamp('last_updated'),
});

// Custom Field Table (for field definitions)
export const customFieldTable = pgTable('mantis_custom_field_table', {
  id: integer('id').primaryKey(),
  name: text('name'),
  possibleValues: text('possible_values'),
  defaultValue: text('default_value'),
  sourceSystem: text('source_system'),
});

// Custom Fields
export const customFields = pgTable('mantis_custom_field_string_table', {
  id: integer('id').primaryKey(),
  fieldId: integer('field_id'),
  bugId: integer('bug_id'),
  value: text('value'),
  sourceSystem: text('source_system'),
});

// Bug Notes (Time Tracking)
export const bugNotes = pgTable('mantis_bugnote_table', {
  id: integer('id').primaryKey(),
  bugId: integer('bug_id'),
  reporterId: integer('reporter_id'),
  timeTracking: integer('time_tracking'),
  noteText: text('note_text'),
  sourceSystem: text('source_system'),
  dateSubmitted: timestamp('date_submitted'),
});

// Holidays
export const holidays = pgTable('ohrm_holiday', {
  date: date('date'),
  description: text('description'),
});

// Task Dependencies
export const taskDependencies = pgTable('task_dependencies', {
  parentTaskId: integer('parent_task_id'),
  childTaskId: integer('child_task_id'),
  dependencyType: text('dependency_type'),
  sourceSystem: text('source_system'),
});

// Estimation History
export const estimationHistory = pgTable('estimation_history', {
  taskId: integer('task_id').primaryKey(),
  resourceId: integer('resource_id'),
  etaAtCreation: numeric('eta_at_creation'),
  etaCurrent: numeric('eta_current'),
  timeSpentFinal: numeric('time_spent_final'),
  accuracyScore: numeric('accuracy_score'),
  taskType: text('task_type'),
  projectId: integer('project_id'),
  isFinal: boolean('is_final'),
  sourceSystem: text('source_system'),
});

// Leave Calendar
export const leaveCalendar = pgTable('leave_calendar', {
  id: integer('id').primaryKey(),
  employeeId: integer('employee_id'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  leaveType: text('leave_type'),
  status: text('status'),
  notes: text('notes'),
});

// Workload Snapshots
export const workloadSnapshots = pgTable('workload_snapshots', {
  id: integer('id').primaryKey(),
  employeeId: integer('employee_id'),
  snapshotDate: timestamp('snapshot_date'),
  totalEta: numeric('total_eta'),
  timeSpent: numeric('time_spent'),
  yetToSpend: numeric('yet_to_spend'),
  availableHours: numeric('available_hours'),
  bandwidth: numeric('bandwidth'),
  availabilityPct: numeric('availability_pct'),
  activeTaskCount: integer('active_task_count'),
  workloadState: text('workload_state'),
  sourceSystem: text('source_system'),
});

// User Roles (for Supabase Auth integration)
export const userRoles = pgTable('user_roles', {
  userId: text('user_id').primaryKey(),
  role: text('role'),
  employeeId: integer('employee_id'),
  teamId: integer('team_id'),
});

// Chat History
export const chatHistory = pgTable('chat_history', {
  id: integer('id').primaryKey(),
  sessionId: text('session_id'),
  userId: text('user_id'),
  role: text('role'),
  content: text('content'),
  sqlQuery: text('sql_query'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Risk Alerts
export const riskAlerts = pgTable('risk_alerts', {
  id: integer('id').primaryKey(),
  projectId: integer('project_id'),
  taskId: integer('task_id'),
  employeeId: integer('employee_id'),
  type: text('type'),
  severity: text('severity'),
  message: text('message'),
  detectedAt: timestamp('detected_at').defaultNow(),
  isResolved: boolean('is_resolved').default(false),
  metadata: text('metadata'), // Store JSON as text
});

