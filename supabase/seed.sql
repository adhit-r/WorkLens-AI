-- WorkLens AI Seed Data
-- Development test data

-- =============================================================================
-- JOB TITLES
-- =============================================================================

INSERT INTO ohrm_job_title (id, job_title, job_description, source_system) VALUES
(1, 'Senior Software Engineer', 'Full-stack development and architecture', 'hrms'),
(2, 'Software Engineer', 'Application development', 'hrms'),
(3, 'QA Engineer', 'Quality assurance and testing', 'hrms'),
(4, 'Senior QA Engineer', 'QA lead and automation', 'hrms'),
(5, 'Tech Lead', 'Technical leadership and mentoring', 'hrms'),
(6, 'Project Manager', 'Project coordination and delivery', 'hrms'),
(7, 'DevOps Engineer', 'Infrastructure and deployment', 'hrms'),
(8, 'UI/UX Designer', 'User interface and experience design', 'hrms');

-- =============================================================================
-- EMPLOYEES
-- =============================================================================

INSERT INTO hs_hr_employee (emp_number, employee_id, emp_firstname, emp_lastname, emp_status, job_title_code, emp_work_email, source_system) VALUES
(1, 'EMP001', 'Adhithya', 'Kumar', 2, 5, 'adhithya@worklens.dev', 'hrms'),
(2, 'EMP002', 'Priya', 'Sharma', 2, 1, 'priya@worklens.dev', 'hrms'),
(3, 'EMP003', 'Rahul', 'Verma', 2, 2, 'rahul@worklens.dev', 'hrms'),
(4, 'EMP004', 'Sneha', 'Patel', 2, 3, 'sneha@worklens.dev', 'hrms'),
(5, 'EMP005', 'Amit', 'Singh', 2, 4, 'amit@worklens.dev', 'hrms'),
(6, 'EMP006', 'Neha', 'Gupta', 2, 2, 'neha@worklens.dev', 'hrms'),
(7, 'EMP007', 'Vikram', 'Reddy', 2, 7, 'vikram@worklens.dev', 'hrms'),
(8, 'EMP008', 'Ananya', 'Iyer', 2, 6, 'ananya@worklens.dev', 'hrms'),
(9, 'EMP009', 'Karthik', 'Nair', 2, 2, 'karthik@worklens.dev', 'hrms'),
(10, 'EMP010', 'Divya', 'Menon', 2, 8, 'divya@worklens.dev', 'hrms');

-- =============================================================================
-- HOLIDAYS (2024-2025)
-- =============================================================================

INSERT INTO ohrm_holiday (date, description) VALUES
('2024-12-25', 'Christmas'),
('2024-12-31', 'New Year Eve'),
('2025-01-01', 'New Year'),
('2025-01-14', 'Pongal'),
('2025-01-26', 'Republic Day'),
('2025-03-14', 'Holi'),
('2025-04-14', 'Tamil New Year'),
('2025-05-01', 'May Day'),
('2025-08-15', 'Independence Day'),
('2025-10-02', 'Gandhi Jayanti'),
('2025-10-20', 'Diwali'),
('2025-11-01', 'Diwali Holiday');

-- =============================================================================
-- MANTIS USERS
-- =============================================================================

INSERT INTO mantis_user_table (id, username, realname, email, enabled, source_system) VALUES
(1, 'adhithya', 'Adhithya Kumar', 'adhithya@worklens.dev', 1, 'mantis'),
(2, 'priya', 'Priya Sharma', 'priya@worklens.dev', 1, 'mantis'),
(3, 'rahul', 'Rahul Verma', 'rahul@worklens.dev', 1, 'mantis'),
(4, 'sneha', 'Sneha Patel', 'sneha@worklens.dev', 1, 'mantis'),
(5, 'amit', 'Amit Singh', 'amit@worklens.dev', 1, 'mantis'),
(6, 'neha', 'Neha Gupta', 'neha@worklens.dev', 1, 'mantis'),
(7, 'vikram', 'Vikram Reddy', 'vikram@worklens.dev', 1, 'mantis'),
(8, 'ananya', 'Ananya Iyer', 'ananya@worklens.dev', 1, 'mantis'),
(9, 'karthik', 'Karthik Nair', 'karthik@worklens.dev', 1, 'mantis'),
(10, 'divya', 'Divya Menon', 'divya@worklens.dev', 1, 'mantis');

-- =============================================================================
-- PROJECTS
-- =============================================================================

INSERT INTO mantis_project_table (id, name, status, enabled, description, source_system) VALUES
(1, 'Project Phoenix', 10, 1, 'Core platform modernization', 'mantis'),
(2, 'Project Atlas', 10, 1, 'Data analytics pipeline', 'mantis'),
(3, 'Project Nebula', 10, 1, 'Mobile app development', 'mantis'),
(4, 'Internal NDS', 10, 1, 'Internal non-delivery support tasks', 'mantis'),
(5, 'Client Portal', 10, 1, 'Customer-facing portal', 'mantis');

-- =============================================================================
-- CUSTOM FIELDS
-- =============================================================================

INSERT INTO mantis_custom_field_table (id, name, possible_values, default_value, source_system) VALUES
(4, 'ETA (Hours)', NULL, '0', 'mantis'),
(40, 'Task Type', 'NDS Task|Client Task|Internal Task|Bug Fix|Feature', 'Client Task', 'mantis'),
(54, 'Task Type Alt', 'NDS|Client|Internal', 'Client', 'mantis');

-- =============================================================================
-- BUGS/TASKS
-- =============================================================================

-- Project Phoenix tasks
INSERT INTO mantis_bug_table (id, project_id, reporter_id, handler_id, status, resolution, eta, summary, source_system, date_submitted, due_date, last_updated) VALUES
(1001, 1, 8, 1, 50, 10, 16, 'Design new authentication flow', 'mantis', NOW() - INTERVAL '10 days', NOW() + INTERVAL '5 days', NOW() - INTERVAL '1 day'),
(1002, 1, 8, 2, 50, 10, 24, 'Implement OAuth2 integration', 'mantis', NOW() - INTERVAL '8 days', NOW() + INTERVAL '7 days', NOW() - INTERVAL '2 hours'),
(1003, 1, 8, 3, 40, 10, 8, 'Create user settings page', 'mantis', NOW() - INTERVAL '5 days', NOW() + INTERVAL '10 days', NOW() - INTERVAL '1 day'),
(1004, 1, 8, 4, 50, 10, 12, 'Test authentication module', 'mantis', NOW() - INTERVAL '3 days', NOW() + INTERVAL '8 days', NOW() - INTERVAL '4 hours'),
(1005, 1, 8, 1, 50, 10, 20, 'API rate limiting implementation', 'mantis', NOW() - INTERVAL '7 days', NOW() + INTERVAL '3 days', NOW()),

-- Project Atlas tasks  
(2001, 2, 8, 2, 50, 10, 32, 'Build ETL pipeline for analytics', 'mantis', NOW() - INTERVAL '14 days', NOW() + INTERVAL '4 days', NOW() - INTERVAL '6 hours'),
(2002, 2, 8, 6, 50, 10, 16, 'Create data visualization dashboard', 'mantis', NOW() - INTERVAL '10 days', NOW() + INTERVAL '6 days', NOW() - INTERVAL '1 day'),
(2003, 2, 8, 9, 40, 10, 12, 'Optimize database queries', 'mantis', NOW() - INTERVAL '6 days', NOW() + INTERVAL '12 days', NOW() - INTERVAL '2 days'),
(2004, 2, 8, 5, 50, 10, 8, 'QA for data accuracy', 'mantis', NOW() - INTERVAL '4 days', NOW() + INTERVAL '9 days', NOW() - INTERVAL '1 day'),

-- Project Nebula tasks
(3001, 3, 8, 3, 50, 10, 24, 'Mobile app navigation structure', 'mantis', NOW() - INTERVAL '12 days', NOW() + INTERVAL '5 days', NOW() - INTERVAL '3 hours'),
(3002, 3, 8, 10, 50, 10, 16, 'Design mobile UI components', 'mantis', NOW() - INTERVAL '8 days', NOW() + INTERVAL '4 days', NOW() - INTERVAL '5 hours'),
(3003, 3, 8, 6, 40, 10, 20, 'Implement offline sync', 'mantis', NOW() - INTERVAL '5 days', NOW() + INTERVAL '14 days', NOW() - INTERVAL '1 day'),

-- Internal NDS tasks
(4001, 4, 8, 1, 50, 10, 4, 'Team standup preparation', 'mantis', NOW() - INTERVAL '2 days', NOW() + INTERVAL '1 day', NOW()),
(4002, 4, 8, 7, 50, 10, 8, 'Infrastructure monitoring setup', 'mantis', NOW() - INTERVAL '6 days', NOW() + INTERVAL '3 days', NOW() - INTERVAL '1 day'),
(4003, 4, 8, 2, 40, 10, 6, 'Code review backlog', 'mantis', NOW() - INTERVAL '4 days', NOW() + INTERVAL '2 days', NOW() - INTERVAL '2 days'),

-- Client Portal tasks
(5001, 5, 8, 9, 50, 10, 16, 'Client dashboard redesign', 'mantis', NOW() - INTERVAL '9 days', NOW() + INTERVAL '6 days', NOW() - INTERVAL '8 hours'),
(5002, 5, 8, 4, 50, 10, 10, 'Portal security testing', 'mantis', NOW() - INTERVAL '5 days', NOW() + INTERVAL '8 days', NOW() - INTERVAL '1 day'),
(5003, 5, 8, 3, 80, 20, 8, 'Fix login timeout issue', 'mantis', NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '3 days'),

-- Some completed/resolved tasks for metrics
(6001, 1, 8, 1, 90, 20, 12, 'Database schema design', 'mantis', NOW() - INTERVAL '30 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days'),
(6002, 1, 8, 2, 90, 20, 16, 'Initial API scaffolding', 'mantis', NOW() - INTERVAL '28 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '16 days'),
(6003, 2, 8, 6, 90, 20, 8, 'Requirements gathering', 'mantis', NOW() - INTERVAL '25 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days');

-- =============================================================================
-- CUSTOM FIELD VALUES (ETA and Task Type)
-- =============================================================================

-- ETA values (field_id = 4)
INSERT INTO mantis_custom_field_string_table (field_id, bug_id, value, source_system) VALUES
(4, 1001, '16', 'mantis'),
(4, 1002, '24', 'mantis'),
(4, 1003, '8', 'mantis'),
(4, 1004, '12', 'mantis'),
(4, 1005, '20', 'mantis'),
(4, 2001, '32', 'mantis'),
(4, 2002, '16', 'mantis'),
(4, 2003, '12', 'mantis'),
(4, 2004, '8', 'mantis'),
(4, 3001, '24', 'mantis'),
(4, 3002, '16', 'mantis'),
(4, 3003, '20', 'mantis'),
(4, 4001, '4', 'mantis'),
(4, 4002, '8', 'mantis'),
(4, 4003, '6', 'mantis'),
(4, 5001, '16', 'mantis'),
(4, 5002, '10', 'mantis'),
(4, 5003, '8', 'mantis'),
(4, 6001, '12', 'mantis'),
(4, 6002, '16', 'mantis'),
(4, 6003, '8', 'mantis');

-- Task Type values (field_id = 40)
INSERT INTO mantis_custom_field_string_table (field_id, bug_id, value, source_system) VALUES
(40, 1001, 'Feature', 'mantis'),
(40, 1002, 'Feature', 'mantis'),
(40, 1003, 'Feature', 'mantis'),
(40, 1004, 'Client Task', 'mantis'),
(40, 1005, 'Feature', 'mantis'),
(40, 2001, 'Client Task', 'mantis'),
(40, 2002, 'Client Task', 'mantis'),
(40, 2003, 'Internal Task', 'mantis'),
(40, 2004, 'Client Task', 'mantis'),
(40, 3001, 'Feature', 'mantis'),
(40, 3002, 'Feature', 'mantis'),
(40, 3003, 'Feature', 'mantis'),
(40, 4001, 'NDS Task', 'mantis'),
(40, 4002, 'NDS Task', 'mantis'),
(40, 4003, 'NDS Task', 'mantis'),
(40, 5001, 'Client Task', 'mantis'),
(40, 5002, 'Client Task', 'mantis'),
(40, 5003, 'Bug Fix', 'mantis'),
(40, 6001, 'Feature', 'mantis'),
(40, 6002, 'Feature', 'mantis'),
(40, 6003, 'Internal Task', 'mantis');

-- =============================================================================
-- BUGNOTES (Time Tracking)
-- =============================================================================

INSERT INTO mantis_bugnote_table (bug_id, reporter_id, time_tracking, note_text, source_system, date_submitted) VALUES
-- Adhithya's logged time
(1001, 1, 480, 'Initial design complete', 'mantis', NOW() - INTERVAL '5 days'),
(1001, 1, 240, 'Revised based on feedback', 'mantis', NOW() - INTERVAL '2 days'),
(1005, 1, 360, 'Rate limiting research', 'mantis', NOW() - INTERVAL '4 days'),
(1005, 1, 480, 'Implementation in progress', 'mantis', NOW() - INTERVAL '1 day'),
(4001, 1, 120, 'Prepared slides', 'mantis', NOW() - INTERVAL '1 day'),

-- Priya's logged time
(1002, 2, 600, 'OAuth2 setup and configuration', 'mantis', NOW() - INTERVAL '6 days'),
(1002, 2, 480, 'Integration testing', 'mantis', NOW() - INTERVAL '3 days'),
(2001, 2, 960, 'ETL pipeline design', 'mantis', NOW() - INTERVAL '10 days'),
(2001, 2, 720, 'Pipeline implementation', 'mantis', NOW() - INTERVAL '5 days'),
(4003, 2, 180, 'Reviewed 5 PRs', 'mantis', NOW() - INTERVAL '2 days'),

-- Rahul's logged time
(1003, 3, 240, 'UI mockup created', 'mantis', NOW() - INTERVAL '3 days'),
(3001, 3, 720, 'Navigation structure implemented', 'mantis', NOW() - INTERVAL '8 days'),
(3001, 3, 480, 'Bug fixes and refinements', 'mantis', NOW() - INTERVAL '2 days'),
(5003, 3, 540, 'Fixed timeout bug', 'mantis', NOW() - INTERVAL '5 days'),

-- Sneha's logged time
(1004, 4, 360, 'Test cases written', 'mantis', NOW() - INTERVAL '2 days'),
(1004, 4, 240, 'Initial testing round', 'mantis', NOW() - INTERVAL '1 day'),
(5002, 4, 300, 'Security scan initiated', 'mantis', NOW() - INTERVAL '3 days'),

-- Amit's logged time
(2004, 5, 240, 'Data validation tests', 'mantis', NOW() - INTERVAL '2 days'),
(2004, 5, 180, 'Edge case testing', 'mantis', NOW() - INTERVAL '1 day'),

-- Neha's logged time
(2002, 6, 480, 'Dashboard wireframes', 'mantis', NOW() - INTERVAL '7 days'),
(2002, 6, 360, 'Chart components built', 'mantis', NOW() - INTERVAL '3 days'),
(3003, 6, 240, 'Offline sync research', 'mantis', NOW() - INTERVAL '3 days'),

-- Vikram's logged time
(4002, 7, 300, 'Monitoring tools evaluation', 'mantis', NOW() - INTERVAL '4 days'),
(4002, 7, 240, 'Grafana setup', 'mantis', NOW() - INTERVAL '2 days'),

-- Karthik's logged time
(2003, 9, 180, 'Query analysis', 'mantis', NOW() - INTERVAL '4 days'),
(5001, 9, 480, 'Dashboard redesign started', 'mantis', NOW() - INTERVAL '6 days'),
(5001, 9, 360, 'Component migration', 'mantis', NOW() - INTERVAL '2 days'),

-- Divya's logged time
(3002, 10, 420, 'Mobile UI kit created', 'mantis', NOW() - INTERVAL '5 days'),
(3002, 10, 360, 'Component library', 'mantis', NOW() - INTERVAL '2 days');

-- =============================================================================
-- TASK DEPENDENCIES
-- =============================================================================

INSERT INTO task_dependencies (parent_task_id, child_task_id, dependency_type, source_system) VALUES
(1001, 1002, 'blocks', 'mantis'),  -- Auth design blocks OAuth implementation
(1002, 1004, 'blocks', 'mantis'),  -- OAuth blocks testing
(2001, 2002, 'blocks', 'mantis'),  -- ETL blocks visualization
(2001, 2004, 'blocks', 'mantis'),  -- ETL blocks QA
(3002, 3001, 'blocks', 'mantis'),  -- UI design blocks navigation
(3001, 3003, 'blocks', 'mantis'),  -- Navigation blocks offline sync
(1005, 1002, 'relates_to', 'mantis'); -- Rate limiting relates to OAuth

-- =============================================================================
-- ESTIMATION HISTORY (sample data)
-- =============================================================================

INSERT INTO estimation_history (task_id, resource_id, eta_at_creation, eta_current, time_spent_final, accuracy_score, task_type, project_id, is_final, source_system) VALUES
(6001, 1, 12, 12, 14, -16.67, 'Feature', 1, true, 'mantis'),
(6002, 2, 16, 16, 18, -12.50, 'Feature', 1, true, 'mantis'),
(6003, 6, 8, 8, 6, 25.00, 'Internal Task', 2, true, 'mantis'),
(5003, 3, 8, 8, 9, -12.50, 'Bug Fix', 5, true, 'mantis');

-- =============================================================================
-- LEAVE CALENDAR (upcoming leaves)
-- =============================================================================

INSERT INTO leave_calendar (employee_id, start_date, end_date, leave_type, status, notes) VALUES
(1, '2024-12-23', '2024-12-27', 'vacation', 'approved', 'Year-end break'),
(3, '2024-12-30', '2025-01-01', 'vacation', 'approved', 'New Year'),
(5, '2025-01-06', '2025-01-08', 'personal', 'approved', 'Personal work'),
(7, '2024-12-26', '2024-12-27', 'wfh', 'approved', 'Working from home');

-- =============================================================================
-- WORKLOAD SNAPSHOTS (historical data for trends)
-- =============================================================================

INSERT INTO workload_snapshots (employee_id, snapshot_date, total_eta, time_spent, yet_to_spend, available_hours, bandwidth, availability_pct, active_task_count, workload_state, source_system) VALUES
-- Adhithya's trend
(1, CURRENT_DATE - 7, 40, 18, 22, 40, 18, 45.00, 3, 'balanced', 'mantis'),
(1, CURRENT_DATE - 6, 40, 20, 20, 40, 20, 50.00, 3, 'balanced', 'mantis'),
(1, CURRENT_DATE - 5, 44, 22, 22, 40, 18, 45.00, 4, 'balanced', 'mantis'),
(1, CURRENT_DATE - 4, 44, 26, 18, 40, 22, 55.00, 4, 'balanced', 'mantis'),
(1, CURRENT_DATE - 3, 44, 28, 16, 40, 24, 60.00, 4, 'balanced', 'mantis'),
(1, CURRENT_DATE - 2, 40, 30, 10, 40, 30, 75.00, 3, 'underutilized', 'mantis'),
(1, CURRENT_DATE - 1, 40, 32, 8, 40, 32, 80.00, 3, 'underutilized', 'mantis'),

-- Priya's trend (increasing load)
(2, CURRENT_DATE - 7, 50, 20, 30, 40, 10, 25.00, 4, 'at_risk', 'mantis'),
(2, CURRENT_DATE - 6, 56, 24, 32, 40, 8, 20.00, 4, 'at_risk', 'mantis'),
(2, CURRENT_DATE - 5, 62, 28, 34, 40, 6, 15.00, 5, 'overloaded', 'mantis'),
(2, CURRENT_DATE - 4, 62, 32, 30, 40, 10, 25.00, 5, 'at_risk', 'mantis'),
(2, CURRENT_DATE - 3, 62, 36, 26, 40, 14, 35.00, 5, 'at_risk', 'mantis'),
(2, CURRENT_DATE - 2, 62, 40, 22, 40, 18, 45.00, 4, 'balanced', 'mantis'),
(2, CURRENT_DATE - 1, 62, 44, 18, 40, 22, 55.00, 4, 'balanced', 'mantis');

