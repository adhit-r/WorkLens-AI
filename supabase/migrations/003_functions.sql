-- WorkLens AI Database Functions
-- Reusable functions for metric calculations

-- =============================================================================
-- WORKING HOURS CALCULATION
-- =============================================================================

-- Calculate working hours between two dates (excluding weekends and holidays)
CREATE OR REPLACE FUNCTION calculate_working_hours(
    start_date DATE,
    end_date DATE,
    hours_per_day INT DEFAULT 8
)
RETURNS DECIMAL AS $$
DECLARE
    working_days INT := 0;
    current_date DATE := start_date;
BEGIN
    WHILE current_date <= end_date LOOP
        -- Skip weekends (Saturday = 6, Sunday = 0)
        IF EXTRACT(DOW FROM current_date) NOT IN (0, 6) THEN
            -- Skip holidays
            IF NOT EXISTS (SELECT 1 FROM ohrm_holiday WHERE date = current_date) THEN
                working_days := working_days + 1;
            END IF;
        END IF;
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN working_days * hours_per_day;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- RESOURCE WORKLOAD METRICS
-- =============================================================================

-- Get workload metrics for a specific resource
CREATE OR REPLACE FUNCTION get_resource_workload(
    p_employee_id INT,
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_end_date DATE DEFAULT (CURRENT_DATE + INTERVAL '7 days')::DATE,
    p_source_system VARCHAR DEFAULT 'DEFAULT'
)
RETURNS TABLE (
    employee_id INT,
    employee_name TEXT,
    role TEXT,
    total_eta DECIMAL,
    time_spent DECIMAL,
    yet_to_spend DECIMAL,
    working_hours DECIMAL,
    bandwidth DECIMAL,
    availability_pct DECIMAL,
    active_task_count BIGINT,
    workload_state VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH task_metrics AS (
        SELECT 
            e.emp_number,
            CONCAT(e.emp_firstname, ' ', e.emp_lastname) AS emp_name,
            jt.job_title,
            -- ETA from custom field #4
            COALESCE(SUM(
                CASE WHEN cf.field_id = 4 THEN NULLIF(cf.value, '')::DECIMAL ELSE 0 END
            ), 0) AS total_eta,
            -- Time spent from bugnotes (minutes to hours)
            COALESCE(SUM(bn.total_minutes) / 60.0, 0) AS time_spent,
            COUNT(DISTINCT b.id) AS task_count
        FROM hs_hr_employee e
        JOIN ohrm_job_title jt ON jt.id = e.job_title_code
        LEFT JOIN mantis_user_table mu ON LOWER(TRIM(mu.email)) = LOWER(TRIM(e.emp_work_email))
        LEFT JOIN mantis_bug_table b ON b.handler_id = mu.id 
            AND b.source_system = p_source_system
            AND b.status NOT IN (80, 90) -- Active tasks only
            AND b.last_updated >= p_start_date
        LEFT JOIN mantis_custom_field_string_table cf ON cf.bug_id = b.id 
            AND cf.source_system = b.source_system
        LEFT JOIN (
            SELECT bug_id, source_system, SUM(time_tracking) AS total_minutes
            FROM mantis_bugnote_table
            GROUP BY bug_id, source_system
        ) bn ON bn.bug_id = b.id AND bn.source_system = b.source_system
        WHERE e.emp_number = p_employee_id AND e.emp_status = 2
        GROUP BY e.emp_number, e.emp_firstname, e.emp_lastname, jt.job_title
    )
    SELECT 
        tm.emp_number,
        tm.emp_name,
        tm.job_title,
        ROUND(tm.total_eta, 2),
        ROUND(tm.time_spent, 2),
        ROUND(GREATEST(tm.total_eta - tm.time_spent, 0), 2) AS yet_to_spend,
        calculate_working_hours(p_start_date, p_end_date) AS working_hours,
        ROUND(GREATEST(
            calculate_working_hours(p_start_date, p_end_date) - (tm.total_eta - tm.time_spent), 
            0
        ), 2) AS bandwidth,
        ROUND(
            CASE 
                WHEN calculate_working_hours(p_start_date, p_end_date) = 0 THEN 0
                ELSE GREATEST(
                    (calculate_working_hours(p_start_date, p_end_date) - (tm.total_eta - tm.time_spent)) 
                    / calculate_working_hours(p_start_date, p_end_date) * 100,
                    0
                )
            END, 
        2) AS availability_pct,
        tm.task_count,
        CASE 
            WHEN (tm.total_eta - tm.time_spent) > calculate_working_hours(p_start_date, p_end_date) THEN 'overloaded'
            WHEN calculate_working_hours(p_start_date, p_end_date) > 0 
                AND ((calculate_working_hours(p_start_date, p_end_date) - (tm.total_eta - tm.time_spent)) 
                    / calculate_working_hours(p_start_date, p_end_date) * 100) < 20 THEN 'at_risk'
            WHEN calculate_working_hours(p_start_date, p_end_date) > 0 
                AND ((calculate_working_hours(p_start_date, p_end_date) - (tm.total_eta - tm.time_spent)) 
                    / calculate_working_hours(p_start_date, p_end_date) * 100) > 80 
                AND tm.total_eta < 8 THEN 'underutilized'
            WHEN tm.task_count > 0 AND tm.total_eta = 0 THEN 'idle_drift'
            ELSE 'balanced'
        END::VARCHAR AS workload_state
    FROM task_metrics tm;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TEAM WORKLOAD SUMMARY
-- =============================================================================

CREATE OR REPLACE FUNCTION get_team_workload(
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_end_date DATE DEFAULT (CURRENT_DATE + INTERVAL '7 days')::DATE,
    p_source_system VARCHAR DEFAULT 'DEFAULT'
)
RETURNS TABLE (
    employee_id INT,
    employee_name TEXT,
    role TEXT,
    project_name TEXT,
    total_eta DECIMAL,
    time_spent DECIMAL,
    yet_to_spend DECIMAL,
    bandwidth DECIMAL,
    availability_pct DECIMAL,
    over_eta_pct DECIMAL,
    workload_state VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH working_hours AS (
        SELECT calculate_working_hours(p_start_date, p_end_date) AS total_hours
    ),
    task_metrics AS (
        SELECT 
            e.emp_number,
            CONCAT(e.emp_firstname, ' ', e.emp_lastname) AS emp_name,
            jt.job_title,
            p.name AS proj_name,
            COALESCE(SUM(
                CASE WHEN cf.field_id = 4 THEN NULLIF(cf.value, '')::DECIMAL ELSE 0 END
            ), 0) AS eta_sum,
            COALESCE(SUM(bn.total_minutes) / 60.0, 0) AS spent_sum
        FROM hs_hr_employee e
        JOIN ohrm_job_title jt ON jt.id = e.job_title_code
        LEFT JOIN mantis_user_table mu ON LOWER(TRIM(mu.email)) = LOWER(TRIM(e.emp_work_email))
        LEFT JOIN mantis_bug_table b ON b.handler_id = mu.id 
            AND b.source_system = p_source_system
            AND b.status NOT IN (80, 90)
            AND b.last_updated >= p_start_date
        LEFT JOIN mantis_project_table p ON p.id = b.project_id AND p.source_system = b.source_system
        LEFT JOIN mantis_custom_field_string_table cf ON cf.bug_id = b.id 
            AND cf.source_system = b.source_system
        LEFT JOIN (
            SELECT bug_id, source_system, SUM(time_tracking) AS total_minutes
            FROM mantis_bugnote_table
            GROUP BY bug_id, source_system
        ) bn ON bn.bug_id = b.id AND bn.source_system = b.source_system
        WHERE e.emp_status = 2
        GROUP BY e.emp_number, e.emp_firstname, e.emp_lastname, jt.job_title, p.name
    )
    SELECT 
        tm.emp_number,
        tm.emp_name,
        tm.job_title,
        tm.proj_name,
        ROUND(tm.eta_sum, 2),
        ROUND(tm.spent_sum, 2),
        ROUND(GREATEST(tm.eta_sum - tm.spent_sum, 0), 2),
        ROUND(GREATEST(wh.total_hours - (tm.eta_sum - tm.spent_sum), 0), 2),
        ROUND(
            CASE WHEN wh.total_hours = 0 THEN 0
            ELSE GREATEST((wh.total_hours - (tm.eta_sum - tm.spent_sum)) / wh.total_hours * 100, 0)
            END, 2
        ),
        ROUND(
            CASE WHEN tm.eta_sum = 0 THEN 
                CASE WHEN tm.spent_sum > 0 THEN 100 ELSE 0 END
            ELSE ((tm.spent_sum - tm.eta_sum) / tm.eta_sum) * 100
            END, 2
        ),
        CASE 
            WHEN (tm.eta_sum - tm.spent_sum) > wh.total_hours THEN 'overloaded'
            WHEN wh.total_hours > 0 AND ((wh.total_hours - (tm.eta_sum - tm.spent_sum)) / wh.total_hours * 100) < 20 THEN 'at_risk'
            WHEN wh.total_hours > 0 AND ((wh.total_hours - (tm.eta_sum - tm.spent_sum)) / wh.total_hours * 100) > 80 THEN 'underutilized'
            ELSE 'balanced'
        END::VARCHAR
    FROM task_metrics tm
    CROSS JOIN working_hours wh
    ORDER BY tm.emp_name, tm.proj_name;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ESTIMATION ACCURACY
-- =============================================================================

CREATE OR REPLACE FUNCTION get_estimation_accuracy(
    p_employee_id INT DEFAULT NULL,
    p_months_back INT DEFAULT 3
)
RETURNS TABLE (
    employee_id INT,
    employee_name TEXT,
    task_type TEXT,
    total_tasks BIGINT,
    avg_eta DECIMAL,
    avg_actual DECIMAL,
    estimation_bias DECIMAL, -- positive = underestimates
    accuracy_pct DECIMAL,
    trend VARCHAR -- 'improving', 'stable', 'declining'
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        eh.resource_id,
        CONCAT(e.emp_firstname, ' ', e.emp_lastname),
        eh.task_type,
        COUNT(*),
        ROUND(AVG(eh.eta_at_creation), 2),
        ROUND(AVG(eh.time_spent_final), 2),
        ROUND(AVG(eh.time_spent_final - eh.eta_at_creation), 2),
        ROUND(AVG(eh.accuracy_score), 2),
        'stable'::VARCHAR -- TODO: Calculate trend from time series
    FROM estimation_history eh
    JOIN hs_hr_employee e ON e.emp_number = eh.resource_id
    WHERE eh.is_final = TRUE
        AND eh.recorded_at >= CURRENT_DATE - (p_months_back || ' months')::INTERVAL
        AND (p_employee_id IS NULL OR eh.resource_id = p_employee_id)
    GROUP BY eh.resource_id, e.emp_firstname, e.emp_lastname, eh.task_type;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- BLOCKED TASKS (for dependency graph)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_blocked_tasks(
    p_source_system VARCHAR DEFAULT 'DEFAULT'
)
RETURNS TABLE (
    task_id INT,
    task_name VARCHAR,
    blocked_by_count BIGINT,
    blocking_count BIGINT,
    total_blocked_eta DECIMAL,
    critical_path BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH blocked_counts AS (
        SELECT 
            child_task_id AS task_id,
            COUNT(*) AS blocked_by
        FROM task_dependencies
        WHERE source_system = p_source_system
        GROUP BY child_task_id
    ),
    blocking_counts AS (
        SELECT 
            parent_task_id AS task_id,
            COUNT(*) AS blocking,
            SUM(
                COALESCE(
                    (SELECT NULLIF(value, '')::DECIMAL FROM mantis_custom_field_string_table 
                     WHERE bug_id = child_task_id AND field_id = 4 LIMIT 1),
                    0
                )
            ) AS blocked_eta
        FROM task_dependencies
        WHERE source_system = p_source_system
        GROUP BY parent_task_id
    )
    SELECT 
        b.id,
        b.summary,
        COALESCE(bc.blocked_by, 0),
        COALESCE(blc.blocking, 0),
        COALESCE(blc.blocked_eta, 0),
        (COALESCE(blc.blocking, 0) > 2)::BOOLEAN -- Critical if blocking 3+ tasks
    FROM mantis_bug_table b
    LEFT JOIN blocked_counts bc ON bc.task_id = b.id
    LEFT JOIN blocking_counts blc ON blc.task_id = b.id
    WHERE b.source_system = p_source_system
        AND b.status NOT IN (80, 90)
        AND (bc.blocked_by > 0 OR blc.blocking > 0);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- LEAVE IMPACT ANALYSIS
-- =============================================================================

CREATE OR REPLACE FUNCTION analyze_leave_impact(
    p_employee_id INT,
    p_start_date DATE,
    p_end_date DATE,
    p_source_system VARCHAR DEFAULT 'DEFAULT'
)
RETURNS TABLE (
    remaining_eta DECIMAL,
    tasks_at_risk INT,
    blocking_tasks INT,
    blocked_eta DECIMAL,
    team_bandwidth_impact DECIMAL,
    recommendations JSONB
) AS $$
DECLARE
    v_remaining_eta DECIMAL;
    v_tasks_at_risk INT;
    v_blocking_tasks INT;
    v_blocked_eta DECIMAL;
    v_team_bandwidth_before DECIMAL;
    v_team_bandwidth_after DECIMAL;
BEGIN
    -- Get employee's remaining ETA
    SELECT COALESCE(SUM(
        CASE WHEN cf.field_id = 4 THEN NULLIF(cf.value, '')::DECIMAL ELSE 0 END
    ) - COALESCE(SUM(bn.total_minutes) / 60.0, 0), 0)
    INTO v_remaining_eta
    FROM mantis_bug_table b
    JOIN mantis_user_table mu ON mu.id = b.handler_id AND mu.source_system = b.source_system
    JOIN hs_hr_employee e ON LOWER(TRIM(e.emp_work_email)) = LOWER(TRIM(mu.email))
    LEFT JOIN mantis_custom_field_string_table cf ON cf.bug_id = b.id AND cf.source_system = b.source_system
    LEFT JOIN (
        SELECT bug_id, source_system, SUM(time_tracking) AS total_minutes
        FROM mantis_bugnote_table GROUP BY bug_id, source_system
    ) bn ON bn.bug_id = b.id AND bn.source_system = b.source_system
    WHERE e.emp_number = p_employee_id
        AND b.status NOT IN (80, 90)
        AND b.source_system = p_source_system;

    -- Count tasks with due dates during leave
    SELECT COUNT(*)
    INTO v_tasks_at_risk
    FROM mantis_bug_table b
    JOIN mantis_user_table mu ON mu.id = b.handler_id AND mu.source_system = b.source_system
    JOIN hs_hr_employee e ON LOWER(TRIM(e.emp_work_email)) = LOWER(TRIM(mu.email))
    WHERE e.emp_number = p_employee_id
        AND b.status NOT IN (80, 90)
        AND b.due_date BETWEEN p_start_date AND p_end_date
        AND b.source_system = p_source_system;

    -- Count tasks blocking others
    SELECT COUNT(DISTINCT td.parent_task_id), COALESCE(SUM(
        (SELECT NULLIF(value, '')::DECIMAL FROM mantis_custom_field_string_table 
         WHERE bug_id = td.child_task_id AND field_id = 4 LIMIT 1)
    ), 0)
    INTO v_blocking_tasks, v_blocked_eta
    FROM task_dependencies td
    JOIN mantis_bug_table b ON b.id = td.parent_task_id
    JOIN mantis_user_table mu ON mu.id = b.handler_id AND mu.source_system = b.source_system
    JOIN hs_hr_employee e ON LOWER(TRIM(e.emp_work_email)) = LOWER(TRIM(mu.email))
    WHERE e.emp_number = p_employee_id
        AND b.status NOT IN (80, 90)
        AND td.source_system = p_source_system;

    RETURN QUERY SELECT 
        ROUND(v_remaining_eta, 2),
        v_tasks_at_risk,
        COALESCE(v_blocking_tasks, 0),
        ROUND(COALESCE(v_blocked_eta, 0), 2),
        ROUND(v_remaining_eta / NULLIF(calculate_working_hours(p_start_date, p_end_date), 0) * 100, 2),
        jsonb_build_object(
            'reassign_blocking_tasks', v_blocking_tasks > 0,
            'extend_due_dates', v_tasks_at_risk > 0,
            'notify_dependencies', v_blocked_eta > 0
        );
END;
$$ LANGUAGE plpgsql;

