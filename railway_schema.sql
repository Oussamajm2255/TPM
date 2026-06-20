-- ============================================================
-- TPM Audit — Railway PostgreSQL Schema
-- Run this in Railway's SQL editor after creating your DB
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Projects & Structure
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
    password TEXT NOT NULL,
    display_name TEXT,
    role TEXT DEFAULT 'technician',
    active BOOLEAN DEFAULT TRUE
);

-- 3. Checklist
CREATE TABLE checklists (
    id SERIAL PRIMARY KEY,
    title TEXT,
    header_fields JSONB,
    items JSONB,
    action_fields JSONB
);

-- 4. Planning & Tasks
CREATE TABLE planning (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    technician_id TEXT REFERENCES users(id),
    project_id TEXT REFERENCES projects(id),
    line_id TEXT REFERENCES lines(id),
    status TEXT DEFAULT 'todo',
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
    technician_id TEXT REFERENCES users(id),
    auditeur TEXT,
    superviseur TEXT,
    gap_leader TEXT,
    project_id TEXT REFERENCES projects(id),
    project_name TEXT,
    line_id TEXT REFERENCES lines(id),
    line_name TEXT,
    machine_issues JSONB,
    answers JSONB,
    actions JSONB,
    score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Notifications (realtime disabled in local mode, used with Supabase otherwise)
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    title TEXT,
    message TEXT,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Settings
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX idx_planning_date ON planning(date);
CREATE INDEX idx_planning_technician ON planning(technician_id);
CREATE INDEX idx_audits_date ON audits(date);
CREATE INDEX idx_audits_project ON audits(project_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);
