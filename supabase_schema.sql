-- 1. Tables for Projects & Structure
DROP TABLE IF EXISTS audit_answers;
DROP TABLE IF EXISTS audits;
DROP TABLE IF EXISTS planning;
DROP TABLE IF EXISTS checklist_items;
DROP TABLE IF EXISTS machines;
DROP TABLE IF EXISTS lines;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;

CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE lines (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL
);

CREATE TABLE machines (
    id TEXT PRIMARY KEY,
    line_id TEXT REFERENCES lines(id) ON DELETE CASCADE,
    code TEXT NOT NULL
);

-- 2. Users (Role-based access)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    role TEXT DEFAULT 'technician'
);

-- 3. Checklist Items
CREATE TABLE checklist_items (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    type TEXT NOT NULL,
    weight INTEGER DEFAULT 1
);

-- 4. Planning & Tasks
CREATE TABLE planning (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    technician_id TEXT REFERENCES users(id),
    project_id TEXT REFERENCES projects(id),
    line_id TEXT REFERENCES lines(id),
    status TEXT DEFAULT 'scheduled',
    unplanned BOOLEAN DEFAULT FALSE,
    reason TEXT,
    rescheduled BOOLEAN DEFAULT FALSE,
    overflow BOOLEAN DEFAULT FALSE
);

-- 5. Completed Audits
CREATE TABLE audits (
    id TEXT PRIMARY KEY,
    plan_id TEXT REFERENCES planning(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    auditor_id TEXT REFERENCES users(id),
    project_id TEXT REFERENCES projects(id),
    line_id TEXT REFERENCES lines(id),
    machine_id TEXT,
    supervisor TEXT,
    gap_leader TEXT,
    score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Audit Answers
CREATE TABLE audit_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id TEXT REFERENCES audits(id) ON DELETE CASCADE,
    question_id TEXT REFERENCES checklist_items(id),
    value TEXT, -- 'yes', 'no', 'na'
    comment TEXT,
    problem TEXT,
    action TEXT,
    responsible TEXT,
    deadline DATE,
    status TEXT
);
