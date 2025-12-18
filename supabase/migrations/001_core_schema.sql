-- WorkLens AI Core Schema
-- Replicates DWH Mantis + HRMS structure for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- HRMS TABLES
-- =============================================================================

-- Job Titles / Roles
CREATE TABLE ohrm_job_title (
    id SERIAL PRIMARY KEY,
    job_title VARCHAR(100) NOT NULL,
    job_description VARCHAR(400),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees
CREATE TABLE hs_hr_employee (
    emp_number SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    emp_lastname VARCHAR(100) NOT NULL,
    emp_firstname VARCHAR(100) NOT NULL,
    emp_middle_name VARCHAR(100),
    emp_status INT DEFAULT 2, -- 2 = active
    job_title_code INT REFERENCES ohrm_job_title(id),
    emp_work_email VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Holidays
CREATE TABLE ohrm_holiday (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    description VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- MANTIS TABLES
-- =============================================================================

-- Users (linked to HRMS via email)
CREATE TABLE mantis_user_table (
    id SERIAL PRIMARY KEY,
    username VARCHAR(191) NOT NULL,
    realname VARCHAR(191),
    email VARCHAR(191) NOT NULL,
    enabled SMALLINT DEFAULT 1,
    source_system VARCHAR(50) NOT NULL DEFAULT 'DEFAULT',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(email, source_system)
);

-- Projects
CREATE TABLE mantis_project_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    status SMALLINT DEFAULT 10, -- 10 = development
    enabled SMALLINT DEFAULT 1,
    description TEXT,
    source_system VARCHAR(50) NOT NULL DEFAULT 'DEFAULT',
    category_id INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE mantis_category_table (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES mantis_project_table(id),
    user_id INT REFERENCES mantis_user_table(id),
    name VARCHAR(128) NOT NULL,
    status INT DEFAULT 0,
    source_system VARCHAR(50) NOT NULL DEFAULT 'DEFAULT',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom Fields Definition
CREATE TABLE mantis_custom_field_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    possible_values TEXT,
    default_value VARCHAR(255),
    source_system VARCHAR(50) NOT NULL DEFAULT 'DEFAULT',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bugs/Tasks (main table)
CREATE TABLE mantis_bug_table (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES mantis_project_table(id),
    reporter_id INT REFERENCES mantis_user_table(id),
    handler_id INT REFERENCES mantis_user_table(id),
    status SMALLINT NOT NULL DEFAULT 10,
    -- Status codes:
    -- 10 = New, 20 = Feedback, 30 = Acknowledged, 40 = Confirmed
    -- 50 = Assigned, 60 = Movedout, 70 = Deferred, 80 = Resolved
    -- 90 = Closed, 100 = Reopen
    resolution SMALLINT DEFAULT 10,
    -- Resolution codes:
    -- 10 = Open, 20 = Fixed, 30 = Reopened, 40 = Unable to reproduce
    -- 50 = Not fixable, 60 = Duplicate, 70 = No change required
    -- 80 = Suspended, 90 = Won't fix
    eta SMALLINT DEFAULT 0, -- Estimation time in hours
    bug_text_id INT,
    category_id INT REFERENCES mantis_category_table(id),
    summary VARCHAR(500),
    source_system VARCHAR(50) NOT NULL DEFAULT 'DEFAULT',
    date_submitted TIMESTAMPTZ DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    inserted_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom Field Values (linked to bugs)
CREATE TABLE mantis_custom_field_string_table (
    id SERIAL PRIMARY KEY,
    field_id INT NOT NULL REFERENCES mantis_custom_field_table(id),
    bug_id INT NOT NULL REFERENCES mantis_bug_table(id),
    value VARCHAR(255),
    source_system VARCHAR(50) NOT NULL DEFAULT 'DEFAULT',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(field_id, bug_id, source_system)
);

-- Bug Notes (time tracking)
CREATE TABLE mantis_bugnote_table (
    id SERIAL PRIMARY KEY,
    bug_id INT NOT NULL REFERENCES mantis_bug_table(id),
    reporter_id INT REFERENCES mantis_user_table(id),
    time_tracking INT DEFAULT 0, -- Time in minutes
    note_text TEXT,
    source_system VARCHAR(50) NOT NULL DEFAULT 'DEFAULT',
    last_modified TIMESTAMPTZ DEFAULT NOW(),
    date_submitted TIMESTAMPTZ DEFAULT NOW(),
    inserted_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES for Performance
-- =============================================================================

CREATE INDEX idx_bug_handler ON mantis_bug_table(handler_id);
CREATE INDEX idx_bug_project ON mantis_bug_table(project_id);
CREATE INDEX idx_bug_status ON mantis_bug_table(status);
CREATE INDEX idx_bug_source_system ON mantis_bug_table(source_system);
CREATE INDEX idx_bug_last_updated ON mantis_bug_table(last_updated);
CREATE INDEX idx_bugnote_bug ON mantis_bugnote_table(bug_id);
CREATE INDEX idx_custom_field_bug ON mantis_custom_field_string_table(bug_id);
CREATE INDEX idx_employee_email ON hs_hr_employee(emp_work_email);
CREATE INDEX idx_user_email ON mantis_user_table(email);

-- =============================================================================
-- HELPER VIEWS
-- =============================================================================

-- View: Status labels
CREATE OR REPLACE VIEW v_status_labels AS
SELECT 10 AS status_code, 'New' AS status_label
UNION ALL SELECT 20, 'Feedback'
UNION ALL SELECT 30, 'Acknowledged'
UNION ALL SELECT 40, 'Confirmed'
UNION ALL SELECT 50, 'Assigned'
UNION ALL SELECT 60, 'Movedout'
UNION ALL SELECT 70, 'Deferred'
UNION ALL SELECT 80, 'Resolved'
UNION ALL SELECT 90, 'Closed'
UNION ALL SELECT 100, 'Reopen';

-- View: Resolution labels
CREATE OR REPLACE VIEW v_resolution_labels AS
SELECT 10 AS resolution_code, 'Open' AS resolution_label
UNION ALL SELECT 20, 'Fixed'
UNION ALL SELECT 30, 'Reopened'
UNION ALL SELECT 40, 'Unable to reproduce'
UNION ALL SELECT 50, 'Not fixable'
UNION ALL SELECT 60, 'Duplicate'
UNION ALL SELECT 70, 'No change required'
UNION ALL SELECT 80, 'Suspended'
UNION ALL SELECT 90, 'Won''t fix';

-- View: Combined task details with labels
CREATE OR REPLACE VIEW v_task_details AS
SELECT 
    b.id AS task_id,
    b.summary AS task_name,
    p.name AS project_name,
    b.project_id,
    b.handler_id,
    CONCAT(e.emp_firstname, ' ', e.emp_lastname) AS handler_name,
    e.emp_work_email AS handler_email,
    jt.job_title AS handler_role,
    b.status,
    sl.status_label,
    b.resolution,
    rl.resolution_label,
    b.eta,
    COALESCE(cf_eta.value, '0')::DECIMAL AS custom_eta,
    cf_type.value AS task_type,
    b.date_submitted,
    b.due_date,
    b.last_updated,
    b.source_system
FROM mantis_bug_table b
LEFT JOIN mantis_project_table p ON p.id = b.project_id AND p.source_system = b.source_system
LEFT JOIN mantis_user_table u ON u.id = b.handler_id AND u.source_system = b.source_system
LEFT JOIN hs_hr_employee e ON LOWER(TRIM(u.email)) = LOWER(TRIM(e.emp_work_email))
LEFT JOIN ohrm_job_title jt ON jt.id = e.job_title_code
LEFT JOIN v_status_labels sl ON sl.status_code = b.status
LEFT JOIN v_resolution_labels rl ON rl.resolution_code = b.resolution
LEFT JOIN mantis_custom_field_string_table cf_eta 
    ON cf_eta.bug_id = b.id AND cf_eta.field_id = 4 AND cf_eta.source_system = b.source_system
LEFT JOIN mantis_custom_field_string_table cf_type 
    ON cf_type.bug_id = b.id AND cf_type.field_id IN (40, 54) AND cf_type.source_system = b.source_system;


