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

// Custom Fields
export const customFields = pgTable('mantis_custom_field_string_table', {
  fieldId: integer('field_id'),
  bugId: integer('bug_id'),
  value: text('value'),
  sourceSystem: text('source_system'),
});

// Bug Notes (Time Tracking)
export const bugNotes = pgTable('mantis_bugnote_table', {
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

