/**
 * Database Schema Context Builder
 * Provides comprehensive database schema and rules to LLM for SQL generation
 */

export class SchemaContextBuilder {
  /**
   * Get comprehensive database schema context for LLM
   */
  static getSchemaContext(): string {
    return `DATABASE SCHEMA (PostgreSQL):

=== MANTIS TABLES ===

1. mantis_bug_table (Tasks/Issues)
   Columns:
   - id (INTEGER, PRIMARY KEY): Task ID
   - project_id (INTEGER): References mantis_project_table.id
   - reporter_id (INTEGER): References mantis_user_table.id
   - handler_id (INTEGER): References mantis_user_table.id (assigned to)
   - status (INTEGER): Task status code
   - resolution (INTEGER): Resolution code
   - priority (INTEGER): Priority level
   - severity (INTEGER): Severity level
   - summary (VARCHAR): Task title/summary
   - description (TEXT): Task description
   - date_submitted (TIMESTAMP): Creation date
   - last_updated (TIMESTAMP): Last modification date
   - due_date (DATE): Due date
   - eta (NUMERIC): Estimated time (deprecated, use custom_field_string_table)
   - source_system (VARCHAR): Always 'mantis' for Mantis data

2. mantis_bugnote_table (Time Tracking & Notes)
   Columns:
   - id (INTEGER, PRIMARY KEY): Note ID
   - bug_id (INTEGER): References mantis_bug_table.id
   - reporter_id (INTEGER): References mantis_user_table.id
   - note_text (TEXT): Note content
   - time_tracking (INTEGER): Time spent in MINUTES
   - date_submitted (TIMESTAMP): Note creation date
   - source_system (VARCHAR): Always 'mantis'

3. mantis_project_table (Projects)
   Columns:
   - id (INTEGER, PRIMARY KEY): Project ID
   - name (VARCHAR): Project name
   - status (INTEGER): Project status
   - enabled (BOOLEAN): Is project active
   - source_system (VARCHAR): Always 'mantis'

4. mantis_user_table (Users)
   Columns:
   - id (INTEGER, PRIMARY KEY): User ID
   - username (VARCHAR): Login username
   - email (VARCHAR): Email address
   - realname (VARCHAR): Display name
   - enabled (BOOLEAN): Is user active
   - source_system (VARCHAR): Always 'mantis'

5. mantis_custom_field_string_table (Custom Fields)
   Columns:
   - field_id (INTEGER): Custom field ID
     - field_id = 4: ETA in HOURS (stored as string, convert with CAST)
     - field_id = 40 or 54: Task Type (e.g., 'Bug', 'Feature', 'NDS', 'Internal')
   - bug_id (INTEGER): References mantis_bug_table.id
   - value (VARCHAR): Field value
   - source_system (VARCHAR): Always 'mantis'

=== HRMS TABLES ===

6. hs_hr_employee (Employees)
   Columns:
   - emp_number (INTEGER, PRIMARY KEY): Employee ID
   - emp_firstname (VARCHAR): First name
   - emp_lastname (VARCHAR): Last name
   - emp_work_email (VARCHAR): Work email
   - job_title_code (INTEGER): References ohrm_job_title.id
   - emp_status (INTEGER): Employment status
   - source_system (VARCHAR): Always 'hrms'

7. ohrm_job_title (Job Titles)
   Columns:
   - id (INTEGER, PRIMARY KEY): Job title ID
   - job_title (VARCHAR): Job title name (e.g., 'Developer', 'QA Engineer', 'Tech Lead')
   - source_system (VARCHAR): Always 'hrms'

=== RELATIONSHIPS ===

- mantis_bug_table.handler_id → mantis_user_table.id
- mantis_bug_table.project_id → mantis_project_table.id
- mantis_bugnote_table.bug_id → mantis_bug_table.id
- mantis_custom_field_string_table.bug_id → mantis_bug_table.id
- hs_hr_employee.job_title_code → ohrm_job_title.id
- mantis_user_table.email = hs_hr_employee.emp_work_email (join key)

=== STATUS & RESOLUTION CODES ===

Status Codes (mantis_bug_table.status):
  10 = New
  20 = Feedback
  30 = Acknowledged
  40 = Confirmed
  50 = Assigned
  60 = Movedout
  70 = Deferred
  80 = Resolved
  90 = Closed
  100 = Reopen

Resolution Codes (mantis_bug_table.resolution):
  10 = Open
  20 = Fixed
  30 = Reopened
  40 = Unable to Reproduce
  50 = Duplicate
  60 = No Change Required
  70 = Not Fixable
  80 = Suspended
  90 = Wont Fix

Active Tasks: status NOT IN (80, 90) AND (resolution IS NULL OR resolution = 10)

=== CRITICAL SQL RULES ===

1. SOURCE_SYSTEM ENFORCEMENT (MANDATORY):
   - EVERY join MUST include: table1.source_system = table2.source_system
   - Example: 
     SELECT * FROM mantis_bug_table b
     JOIN mantis_project_table p ON b.project_id = p.id 
       AND b.source_system = p.source_system
     WHERE b.source_system = 'mantis'

2. ETA RETRIEVAL:
   - ETA is in mantis_custom_field_string_table with field_id = 4
   - Value is stored as VARCHAR, convert: CAST(value AS NUMERIC)
   - Join: mantis_custom_field_string_table.bug_id = mantis_bug_table.id
   - Always filter: field_id = 4 AND source_system = 'mantis'

3. TIME TRACKING:
   - Time is in MINUTES in mantis_bugnote_table.time_tracking
   - Convert to hours: SUM(time_tracking) / 60.0
   - Group by bug_id to get total time per task

4. TASK TYPE:
   - In mantis_custom_field_string_table with field_id IN (40, 54)
   - Join same as ETA but filter: field_id IN (40, 54)

5. USER-EMPLOYEE JOIN:
   - Join key: mantis_user_table.email = hs_hr_employee.emp_work_email
   - Always include source_system checks for both tables

6. DATE FILTERS:
   - Use CURRENT_DATE for today
   - Use DATE_TRUNC('week', CURRENT_DATE) for week start
   - Exclude weekends: EXTRACT(DOW FROM date_column) NOT IN (0, 6)
   - Exclude holidays: Check against leave_calendar table if available

7. METRIC CALCULATIONS:
   - Time Spent (hours): SUM(mantis_bugnote_table.time_tracking) / 60.0
   - Yet-to-Spend (hours): CAST(eta_custom_field.value AS NUMERIC) - (time_spent)
   - Availability: (total_working_hours - yet_to_spend) / total_working_hours * 100
   - Bandwidth: (time_spent + yet_to_spend) / total_working_hours * 100

8. OUTPUT FORMATTING:
   - NEVER return raw status/resolution codes
   - Use CASE statements to convert:
     CASE 
       WHEN status = 10 THEN 'New'
       WHEN status = 20 THEN 'Feedback'
       ...
     END AS status_label

=== EXAMPLE QUERIES ===

Example 1: Get active tasks for a team member
SELECT 
  b.id,
  b.summary,
  p.name AS project_name,
  CASE 
    WHEN b.status = 10 THEN 'New'
    WHEN b.status = 50 THEN 'Assigned'
    ...
  END AS status,
  CAST(eta.value AS NUMERIC) AS eta_hours,
  COALESCE(SUM(n.time_tracking), 0) / 60.0 AS time_spent_hours
FROM mantis_bug_table b
JOIN mantis_project_table p ON b.project_id = p.id 
  AND b.source_system = p.source_system
LEFT JOIN mantis_custom_field_string_table eta 
  ON b.id = eta.bug_id 
  AND eta.field_id = 4 
  AND b.source_system = eta.source_system
LEFT JOIN mantis_bugnote_table n 
  ON b.id = n.bug_id 
  AND b.source_system = n.source_system
JOIN mantis_user_table u ON b.handler_id = u.id
JOIN hs_hr_employee e ON u.email = e.emp_work_email
WHERE b.source_system = 'mantis'
  AND b.status NOT IN (80, 90)
  AND e.emp_number = :employee_id
GROUP BY b.id, b.summary, p.name, b.status, eta.value;

Example 2: Team bandwidth overview
SELECT 
  e.emp_number,
  e.emp_firstname || ' ' || e.emp_lastname AS employee_name,
  jt.job_title,
  SUM(CAST(eta.value AS NUMERIC)) AS total_eta_hours,
  SUM(COALESCE(n.time_tracking, 0)) / 60.0 AS total_time_spent_hours,
  (SUM(CAST(eta.value AS NUMERIC)) - SUM(COALESCE(n.time_tracking, 0)) / 60.0) AS yet_to_spend_hours
FROM hs_hr_employee e
JOIN ohrm_job_title jt ON e.job_title_code = jt.id 
  AND e.source_system = jt.source_system
JOIN mantis_user_table u ON u.email = e.emp_work_email
JOIN mantis_bug_table b ON b.handler_id = u.id
JOIN mantis_custom_field_string_table eta 
  ON b.id = eta.bug_id 
  AND eta.field_id = 4 
  AND b.source_system = eta.source_system
LEFT JOIN mantis_bugnote_table n 
  ON b.id = n.bug_id 
  AND b.source_system = n.source_system
WHERE e.source_system = 'hrms'
  AND b.source_system = 'mantis'
  AND b.status NOT IN (80, 90)
GROUP BY e.emp_number, e.emp_firstname, e.emp_lastname, jt.job_title;

=== DOMAIN RESTRICTIONS ===

ONLY answer queries related to:
- Workload, tasks, projects, team capacity
- Time tracking, ETA, bandwidth, availability
- Task status, delivery risk, project health
- Team member performance (aggregated, not individual shaming)
- Leave impact, dependencies, resource allocation

If query is unrelated (e.g., weather, general knowledge, personal advice), respond with "code red".`;
  }

  /**
   * Get SQL rules context (from SQL_Query_Rules.txt)
   */
  static getSQLRulesContext(): string {
    return `=== MANDATORY SQL GENERATION RULES ===

1. SOURCE_SYSTEM FILTERING (CRITICAL - MANDATORY):
   - Every Mantis table has a source_system column
   - EVERY join MUST enforce: table1.source_system = table2.source_system
   - Any SQL missing source_system filters is INVALID
   - Example project join:
     JOIN (
       SELECT id, source_system, MIN(name) AS name
       FROM mantis_project_table
       GROUP BY id, source_system
     ) p ON b.project_id = p.id AND p.source_system = b.source_system

2. JOIN PATTERNS (PostgreSQL syntax):
   - Tasks → Projects: b.project_id = p.id AND b.source_system = p.source_system
   - Tasks → Users: b.handler_id = u.id AND b.source_system = u.source_system
   - Tasks → ETA: b.id = eta.bug_id AND eta.field_id = 4 AND b.source_system = eta.source_system
   - Tasks → Task Type: b.id = cf.bug_id AND cf.field_id IN (40, 54) AND b.source_system = cf.source_system
   - Time Tracking (aggregated):
     LEFT JOIN (
       SELECT bug_id, source_system, SUM(time_tracking) AS total_minutes
       FROM mantis_bugnote_table
       GROUP BY bug_id, source_system
     ) n ON n.bug_id = b.id AND n.source_system = b.source_system
   - Users → Employees: LOWER(TRIM(u.email)) = LOWER(TRIM(e.emp_work_email))

3. ACTIVE TASK FILTER (MANDATORY for workload metrics):
   - Active tasks: b.status NOT IN (80, 90)
   - For "current tasks" queries: b.status IN (40, 50) AND (b.resolution IS NULL OR b.resolution = 10)
   - Workload metrics (Bandwidth, Availability, Utilization) MUST only include active tasks

4. METRIC CALCULATIONS (STRICT FORMULAS):
   - ETA(h): SUM(CAST(eta.value AS NUMERIC)) WHERE field_id = 4, treat null/empty as 0, ROUND to 2 decimals
   - Time Spent(h): SUM(time_tracking) / 60.0, treat null as 0, ROUND to 2 decimals
   - Yet-to-Spend(h): ETA(h) - Time Spent(h), ROUND to 2 decimals
   - Bandwidth(h): TotalWorkingHours - Yet-to-Spend(h), if < 0 then 0, ROUND to 2 decimals
   - Availability(%): If Bandwidth <= 0 then 0%, else (Bandwidth / TotalWorkingHours) * 100, ROUND to 2 decimals
   - Over ETA(%): If ETA = 0/null then 100%, else ((Time Spent - ETA) / ETA) * 100, ROUND to 2 decimals
   - Under ETA(%): If ETA = 0 then 0%, else ((ETA - Time Spent) / ETA) * 100, ROUND to 2 decimals
   - Remarks: If Time Spent > ETA then 'Over ETA', else 'Within ETA'

5. PERIOD HANDLING:
   - Week: DATE_TRUNC('week', CURRENT_DATE) to DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days'
   - Month: DATE_TRUNC('month', CURRENT_DATE) to DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'
   - Total Working Hours: Count working days (exclude weekends and holidays) * 8 hours

6. DATE FILTERS:
   - Default: This month (if not specified)
   - Use: b.last_updated >= start_date AND b.last_updated <= end_date
   - Exclude weekends: EXTRACT(DOW FROM date_column) NOT IN (0, 6)
   - Exclude holidays: Check against leave_calendar table if available

7. STATUS & RESOLUTION MAPPING (MANDATORY - NEVER show raw codes):
   Status Labels:
   - 10 = 'New'
   - 20 = 'Feedback'
   - 30 = 'Acknowledged'
   - 40 = 'Confirmed'
   - 50 = 'Assigned'
   - 60 = 'Movedout'
   - 70 = 'Deferred'
   - 80 = 'Resolved'
   - 90 = 'Closed'
   - 100 = 'Reopen'
   
   Resolution Labels:
   - 10 = 'Open'
   - 20 = 'Fixed'
   - 30 = 'Reopened'
   - 40 = 'Unable to Reproduce'
   - 50 = 'Duplicate'
   - 60 = 'No Change Required'
   - 70 = 'Not Fixable'
   - 80 = 'Suspended'
   - 90 = "Won't Fix"
   
   ALWAYS use CASE statements to convert codes to labels in SELECT.

8. BUSINESS RULES:
   - Person name filter: LOWER(CONCAT(e.emp_firstname, ' ', e.emp_lastname)) LIKE LOWER('%name%')
   - Task type keywords:
     * "internal task" / "nds" => LOWER(cf.value) LIKE '%nds%'
     * "client task" => LOWER(cf.value) LIKE '%client%'
   - Status keywords:
     * "Yet to Start" => status = 40
     * "Assigned" => status = 50
   - "Bug ID" and "Mantis ID" are the same field (bug_id), display header as "MANTIS ID"

9. OUTPUT FORMATTING:
   - Always use human-readable labels (CASE statements for status/resolution)
   - Include: PROJECT, TASK TYPE, RESOURCE NAME, ETA(h), TIME SPENT(h), REMAINING BANDWIDTH(h), UTILIZATION(%), AVAILABILITY(%)
   - Group by: PROJECT, TASK TYPE, RESOURCE NAME (and other non-aggregated columns)
   - Order by: REMAINING BANDWIDTH(h) ASC
   - Use PostgreSQL syntax (no LIMIT/OFFSET, use FETCH/LIMIT properly)

10. AGGREGATIONS:
    - Always use appropriate GROUP BY
    - Use COALESCE for NULL handling
    - Use CAST or :: for type conversions
    - Always ROUND to 2 decimals for metrics

11. DOMAIN RESTRICTIONS:
    ONLY answer queries related to:
    - Bandwidth, Allocation, Utilization, ETA
    - Mantis/HRMS data, Tasks/Bugs, Projects
    - Developers, QA, Employees, Roles
    - Time spent, Project reports, Forecast
    - Combined reports
    
    If query is NOT related to above topics → respond with "code red" (exactly, no other text)`;
  }

  /**
   * Get example queries for common patterns
   */
  static getExampleQueries(): string {
    return `=== EXAMPLE QUERY PATTERNS ===

Example 1: Get active tasks for a team member
SELECT 
  b.id AS mantis_id,
  b.summary AS task_summary,
  p.name AS project_name,
  CASE 
    WHEN b.status = 10 THEN 'New'
    WHEN b.status = 50 THEN 'Assigned'
    WHEN b.status = 40 THEN 'Confirmed'
    ELSE 'Other'
  END AS status_label,
  CAST(COALESCE(eta.value, '0') AS NUMERIC) AS eta_hours,
  COALESCE(SUM(n.time_tracking), 0) / 60.0 AS time_spent_hours
FROM mantis_bug_table b
JOIN mantis_project_table p ON b.project_id = p.id 
  AND b.source_system = p.source_system
LEFT JOIN mantis_custom_field_string_table eta 
  ON b.id = eta.bug_id 
  AND eta.field_id = 4 
  AND b.source_system = eta.source_system
LEFT JOIN mantis_bugnote_table n 
  ON b.id = n.bug_id 
  AND b.source_system = n.source_system
JOIN mantis_user_table u ON b.handler_id = u.id
  AND b.source_system = u.source_system
JOIN hs_hr_employee e ON LOWER(TRIM(u.email)) = LOWER(TRIM(e.emp_work_email))
WHERE b.source_system = 'mantis'
  AND b.status NOT IN (80, 90)
  AND e.emp_number = :employee_id
GROUP BY b.id, b.summary, p.name, b.status, eta.value;

Example 2: Team bandwidth overview
SELECT 
  e.emp_number,
  e.emp_firstname || ' ' || e.emp_lastname AS employee_name,
  jt.job_title,
  ROUND(SUM(CAST(COALESCE(eta.value, '0') AS NUMERIC)), 2) AS total_eta_hours,
  ROUND(SUM(COALESCE(n.time_tracking, 0)) / 60.0, 2) AS total_time_spent_hours,
  ROUND(SUM(CAST(COALESCE(eta.value, '0') AS NUMERIC)) - SUM(COALESCE(n.time_tracking, 0)) / 60.0, 2) AS yet_to_spend_hours
FROM hs_hr_employee e
JOIN ohrm_job_title jt ON e.job_title_code = jt.id 
  AND e.source_system = jt.source_system
JOIN mantis_user_table u ON LOWER(TRIM(u.email)) = LOWER(TRIM(e.emp_work_email))
JOIN mantis_bug_table b ON b.handler_id = u.id
  AND b.source_system = u.source_system
JOIN mantis_custom_field_string_table eta 
  ON b.id = eta.bug_id 
  AND eta.field_id = 4 
  AND b.source_system = eta.source_system
LEFT JOIN (
  SELECT bug_id, source_system, SUM(time_tracking) AS time_tracking
  FROM mantis_bugnote_table
  GROUP BY bug_id, source_system
) n ON b.id = n.bug_id AND b.source_system = n.source_system
WHERE e.source_system = 'hrms'
  AND b.source_system = 'mantis'
  AND b.status NOT IN (80, 90)
GROUP BY e.emp_number, e.emp_firstname, e.emp_lastname, jt.job_title;

Example 3: Project task summary
SELECT 
  p.name AS project_name,
  COUNT(DISTINCT b.id) AS active_task_count,
  ROUND(SUM(CAST(COALESCE(eta.value, '0') AS NUMERIC)), 2) AS total_eta_hours,
  ROUND(SUM(COALESCE(n.time_tracking, 0)) / 60.0, 2) AS total_time_spent_hours,
  CASE 
    WHEN COUNT(DISTINCT b.id) FILTER (WHERE b.status = 50) > 0 THEN 'In Progress'
    WHEN COUNT(DISTINCT b.id) FILTER (WHERE b.status = 40) > 0 THEN 'Confirmed'
    ELSE 'New'
  END AS project_status
FROM mantis_project_table p
JOIN mantis_bug_table b ON b.project_id = p.id
  AND b.source_system = p.source_system
LEFT JOIN mantis_custom_field_string_table eta 
  ON b.id = eta.bug_id 
  AND eta.field_id = 4 
  AND b.source_system = eta.source_system
LEFT JOIN (
  SELECT bug_id, source_system, SUM(time_tracking) AS time_tracking
  FROM mantis_bugnote_table
  GROUP BY bug_id, source_system
) n ON b.id = n.bug_id AND b.source_system = n.source_system
WHERE p.source_system = 'mantis'
  AND b.status NOT IN (80, 90)
GROUP BY p.name;`;
  }

  /**
   * Get full context for LLM (schema + rules + examples)
   */
  static getFullContext(): string {
    return `${this.getSchemaContext()}\n\n${this.getSQLRulesContext()}\n\n${this.getExampleQueries()}`;
  }
}

