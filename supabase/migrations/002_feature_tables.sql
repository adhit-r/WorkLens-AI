-- WorkLens AI Feature Tables
-- Additional tables for new features

-- =============================================================================
-- TASK DEPENDENCIES
-- =============================================================================

CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_task_id INT NOT NULL REFERENCES mantis_bug_table(id) ON DELETE CASCADE,
    child_task_id INT NOT NULL REFERENCES mantis_bug_table(id) ON DELETE CASCADE,
    dependency_type VARCHAR(20) DEFAULT 'blocks', -- 'blocks', 'relates_to', 'duplicates'
    source_system VARCHAR(50) NOT NULL DEFAULT 'DEFAULT',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(parent_task_id, child_task_id, source_system)
);

CREATE INDEX idx_dep_parent ON task_dependencies(parent_task_id);
CREATE INDEX idx_dep_child ON task_dependencies(child_task_id);

-- =============================================================================
-- ESTIMATION HISTORY (for accuracy tracking)
-- =============================================================================

CREATE TABLE estimation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id INT NOT NULL REFERENCES mantis_bug_table(id) ON DELETE CASCADE,
    resource_id INT REFERENCES hs_hr_employee(emp_number),
    eta_at_creation DECIMAL(10,2),
    eta_current DECIMAL(10,2),
    time_spent_final DECIMAL(10,2),
    accuracy_score DECIMAL(5,2), -- (eta - actual) / eta * 100
    task_type VARCHAR(100),
    project_id INT REFERENCES mantis_project_table(id),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    is_final BOOLEAN DEFAULT FALSE, -- true when task is closed
    source_system VARCHAR(50) NOT NULL DEFAULT 'DEFAULT'
);

CREATE INDEX idx_est_resource ON estimation_history(resource_id);
CREATE INDEX idx_est_task ON estimation_history(task_id);
CREATE INDEX idx_est_recorded ON estimation_history(recorded_at);

-- =============================================================================
-- LEAVE CALENDAR
-- =============================================================================

CREATE TABLE leave_calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id INT NOT NULL REFERENCES hs_hr_employee(emp_number),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    leave_type VARCHAR(50) DEFAULT 'vacation', -- 'vacation', 'sick', 'personal', 'wfh'
    status VARCHAR(20) DEFAULT 'approved', -- 'pending', 'approved', 'rejected'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_leave_employee ON leave_calendar(employee_id);
CREATE INDEX idx_leave_dates ON leave_calendar(start_date, end_date);

-- =============================================================================
-- DIGEST PREFERENCES
-- =============================================================================

CREATE TABLE digest_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_id INT REFERENCES hs_hr_employee(emp_number),
    email_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    digest_time TIME DEFAULT '08:00:00', -- Preferred delivery time
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    include_team_snapshot BOOLEAN DEFAULT TRUE,
    include_risk_alerts BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =============================================================================
-- CALENDAR SYNC (Google Calendar tokens)
-- =============================================================================

CREATE TABLE calendar_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_id INT REFERENCES hs_hr_employee(emp_number),
    provider VARCHAR(20) DEFAULT 'google', -- 'google', 'outlook'
    access_token TEXT,
    refresh_token TEXT,
    token_expiry TIMESTAMPTZ,
    calendar_id VARCHAR(255), -- Which calendar to sync
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- =============================================================================
-- CACHED CALENDAR EVENTS (for bandwidth calculation)
-- =============================================================================

CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_id INT REFERENCES hs_hr_employee(emp_number),
    external_id VARCHAR(255), -- Google Calendar event ID
    title VARCHAR(500),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_minutes INT GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time)) / 60
    ) STORED,
    is_all_day BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'confirmed', -- 'confirmed', 'tentative', 'cancelled'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cal_events_user ON calendar_events(user_id);
CREATE INDEX idx_cal_events_time ON calendar_events(start_time, end_time);

-- =============================================================================
-- WORKLOAD SNAPSHOTS (for trend analysis)
-- =============================================================================

CREATE TABLE workload_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id INT NOT NULL REFERENCES hs_hr_employee(emp_number),
    snapshot_date DATE NOT NULL,
    total_eta DECIMAL(10,2) DEFAULT 0,
    time_spent DECIMAL(10,2) DEFAULT 0,
    yet_to_spend DECIMAL(10,2) DEFAULT 0,
    available_hours DECIMAL(10,2) DEFAULT 0,
    bandwidth DECIMAL(10,2) DEFAULT 0,
    availability_pct DECIMAL(5,2) DEFAULT 0,
    active_task_count INT DEFAULT 0,
    workload_state VARCHAR(20), -- 'overloaded', 'at_risk', 'balanced', 'underutilized', 'idle_drift'
    source_system VARCHAR(50) NOT NULL DEFAULT 'DEFAULT',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, snapshot_date, source_system)
);

CREATE INDEX idx_snapshot_employee ON workload_snapshots(employee_id);
CREATE INDEX idx_snapshot_date ON workload_snapshots(snapshot_date);

-- =============================================================================
-- RISK ALERTS
-- =============================================================================

CREATE TABLE risk_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type VARCHAR(50) NOT NULL, -- 'eta_inflation', 'silent_overrun', 'phantom_bandwidth', 'load_concentration', 'project_sinkhole'
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    entity_type VARCHAR(20) NOT NULL, -- 'task', 'employee', 'project', 'team'
    entity_id VARCHAR(100) NOT NULL, -- ID of the affected entity
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB, -- Additional context
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_type ON risk_alerts(alert_type);
CREATE INDEX idx_alerts_entity ON risk_alerts(entity_type, entity_id);
CREATE INDEX idx_alerts_unresolved ON risk_alerts(is_resolved) WHERE is_resolved = FALSE;

-- =============================================================================
-- CHAT HISTORY (for context)
-- =============================================================================

CREATE TABLE chat_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    sql_query TEXT, -- Generated SQL if applicable
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_session ON chat_history(session_id);
CREATE INDEX idx_chat_user ON chat_history(user_id);

-- =============================================================================
-- USER ROLES (for permission system)
-- =============================================================================

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_id INT REFERENCES hs_hr_employee(emp_number),
    role VARCHAR(30) NOT NULL DEFAULT 'individual_contributor',
    -- Roles: 'individual_contributor', 'manager', 'program_manager', 'leadership', 'hr'
    team_id INT, -- For managers: which team they manage
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE hs_hr_employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE workload_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_calendar ENABLE ROW LEVEL SECURITY;

-- Users can only see their own calendar data
CREATE POLICY "Users can view own calendar connections"
    ON calendar_connections FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own calendar connections"
    ON calendar_connections FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own calendar events"
    ON calendar_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own digest preferences"
    ON digest_preferences FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own chat history"
    ON chat_history FOR ALL
    USING (auth.uid() = user_id);

-- Leave calendar: users see own, managers see team
CREATE POLICY "Users can view own leave"
    ON leave_calendar FOR SELECT
    USING (
        employee_id IN (
            SELECT emp_number FROM hs_hr_employee e
            JOIN auth.users u ON LOWER(e.emp_work_email) = LOWER(u.email)
            WHERE u.id = auth.uid()
        )
    );

-- Workload snapshots follow same pattern
CREATE POLICY "Users can view own workload snapshots"
    ON workload_snapshots FOR SELECT
    USING (
        employee_id IN (
            SELECT emp_number FROM hs_hr_employee e
            JOIN auth.users u ON LOWER(e.emp_work_email) = LOWER(u.email)
            WHERE u.id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role IN ('manager', 'program_manager', 'leadership', 'hr')
        )
    );


