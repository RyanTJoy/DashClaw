-- OpenClaw Pro Dashboard Schema for Neon
-- Created: 2026-02-04
-- Updated: 2026-02-08 (multi-tenant: org_id on all tables)

-- ============================================
-- MULTI-TENANCY
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT DEFAULT 'free',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id),
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    label TEXT DEFAULT 'default',
    role TEXT DEFAULT 'member',
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_org_id ON api_keys(org_id);

-- Seed default organization
INSERT INTO organizations (id, name, slug, plan)
VALUES ('org_default', 'Default Organization', 'default', 'pro')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- LEARNING DATABASE
-- ============================================

CREATE TABLE IF NOT EXISTS decisions (
    id SERIAL PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'org_default',
    timestamp TEXT NOT NULL,
    decision TEXT NOT NULL,
    context TEXT,
    reasoning TEXT,
    tags TEXT,
    outcome TEXT DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS idx_decisions_org_id ON decisions(org_id);

CREATE TABLE IF NOT EXISTS outcomes (
    id SERIAL PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'org_default',
    decision_id INTEGER NOT NULL REFERENCES decisions(id),
    timestamp TEXT NOT NULL,
    result TEXT NOT NULL,
    notes TEXT,
    impact_score INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_outcomes_org_id ON outcomes(org_id);

CREATE TABLE IF NOT EXISTS lessons (
    id SERIAL PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'org_default',
    timestamp TEXT NOT NULL,
    lesson TEXT NOT NULL,
    source_decisions TEXT,
    confidence INTEGER DEFAULT 50,
    times_validated INTEGER DEFAULT 0,
    times_contradicted INTEGER DEFAULT 0,
    tags TEXT
);
CREATE INDEX IF NOT EXISTS idx_lessons_org_id ON lessons(org_id);

CREATE TABLE IF NOT EXISTS patterns (
    id SERIAL PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'org_default',
    pattern_name TEXT NOT NULL,
    description TEXT,
    best_approach TEXT,
    success_rate REAL DEFAULT 0,
    sample_size INTEGER DEFAULT 0,
    tags TEXT
);
CREATE INDEX IF NOT EXISTS idx_patterns_org_id ON patterns(org_id);

-- ============================================
-- INSPIRATION/IDEAS
-- ============================================

CREATE TABLE IF NOT EXISTS ideas (
    id SERIAL PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'org_default',
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT,
    captured_at TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    score INTEGER DEFAULT 0,
    effort_estimate TEXT,
    impact_estimate TEXT,
    fun_factor INTEGER DEFAULT 5,
    learning_potential INTEGER DEFAULT 5,
    income_potential INTEGER DEFAULT 0,
    notes TEXT,
    shipped_at TEXT,
    shipped_url TEXT
);
CREATE INDEX IF NOT EXISTS idx_ideas_org_id ON ideas(org_id);

CREATE TABLE IF NOT EXISTS idea_updates (
    id SERIAL PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'org_default',
    idea_id INTEGER NOT NULL REFERENCES ideas(id),
    timestamp TEXT NOT NULL,
    update_type TEXT,
    content TEXT
);
CREATE INDEX IF NOT EXISTS idx_idea_updates_org_id ON idea_updates(org_id);

-- ============================================
-- GOALS
-- ============================================

CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'org_default',
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    created_at TEXT NOT NULL,
    target_date TEXT,
    progress INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    completed_at TEXT,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_goals_org_id ON goals(org_id);

CREATE TABLE IF NOT EXISTS milestones (
    id SERIAL PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'org_default',
    goal_id INTEGER NOT NULL REFERENCES goals(id),
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS idx_milestones_org_id ON milestones(org_id);

CREATE TABLE IF NOT EXISTS goal_updates (
    id SERIAL PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'org_default',
    goal_id INTEGER NOT NULL REFERENCES goals(id),
    timestamp TEXT NOT NULL,
    update_type TEXT,
    content TEXT
);
CREATE INDEX IF NOT EXISTS idx_goal_updates_org_id ON goal_updates(org_id);

-- ============================================
-- RELATIONSHIPS/CRM
-- ============================================

CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'org_default',
    name TEXT NOT NULL,
    platform TEXT NOT NULL,
    handle TEXT,
    platform_id TEXT,
    temperature TEXT DEFAULT 'warm',
    status TEXT DEFAULT 'active',
    first_contact DATE,
    last_contact DATE,
    next_followup DATE,
    opportunity_type TEXT,
    opportunity_value TEXT,
    notes TEXT,
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_contacts_org_id ON contacts(org_id);

CREATE TABLE IF NOT EXISTS interactions (
    id SERIAL PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'org_default',
    contact_id INTEGER NOT NULL REFERENCES contacts(id),
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type TEXT NOT NULL,
    direction TEXT NOT NULL,
    platform TEXT,
    platform_ref TEXT,
    summary TEXT,
    sentiment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_interactions_org_id ON interactions(org_id);

-- ============================================
-- WORKFLOWS
-- ============================================

CREATE TABLE IF NOT EXISTS workflows (
    id SERIAL PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'org_default',
    name TEXT NOT NULL,
    description TEXT,
    steps TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_run TEXT,
    run_count INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    CONSTRAINT workflows_org_name_unique UNIQUE (org_id, name)
);
CREATE INDEX IF NOT EXISTS idx_workflows_org_id ON workflows(org_id);

CREATE TABLE IF NOT EXISTS executions (
    id SERIAL PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'org_default',
    workflow_id INTEGER REFERENCES workflows(id),
    started_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT DEFAULT 'running',
    steps_completed INTEGER DEFAULT 0,
    total_steps INTEGER,
    output TEXT,
    error TEXT
);
CREATE INDEX IF NOT EXISTS idx_executions_org_id ON executions(org_id);

CREATE TABLE IF NOT EXISTS step_results (
    id SERIAL PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'org_default',
    execution_id INTEGER REFERENCES executions(id),
    step_index INTEGER,
    step_name TEXT,
    started_at TEXT,
    completed_at TEXT,
    status TEXT,
    output TEXT,
    error TEXT
);
CREATE INDEX IF NOT EXISTS idx_step_results_org_id ON step_results(org_id);

CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id SERIAL PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'org_default',
    workflow_name TEXT NOT NULL,
    schedule TEXT NOT NULL,
    description TEXT,
    enabled INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    last_run TEXT,
    next_run TEXT,
    run_count INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_org_id ON scheduled_jobs(org_id);

-- ============================================
-- TOKEN TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS token_usage (
    id SERIAL PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'org_default',
    timestamp TEXT NOT NULL,
    model TEXT,
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    operation TEXT,
    session_id TEXT,
    cost_estimate REAL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_token_usage_org_id ON token_usage(org_id);

-- ============================================
-- CONTENT TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS content (
    id SERIAL PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'org_default',
    title TEXT NOT NULL,
    platform TEXT NOT NULL,
    url TEXT,
    status TEXT DEFAULT 'draft',
    created_at TEXT NOT NULL,
    published_at TEXT,
    engagement_score INTEGER DEFAULT 0,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_content_org_id ON content(org_id);

-- ============================================
-- SYNC METADATA
-- ============================================

CREATE TABLE IF NOT EXISTS sync_log (
    id SERIAL PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'org_default',
    table_name TEXT NOT NULL,
    last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    records_synced INTEGER DEFAULT 0,
    status TEXT DEFAULT 'success',
    error TEXT
);
CREATE INDEX IF NOT EXISTS idx_sync_log_org_id ON sync_log(org_id);

-- ============================================
-- CALENDAR
-- ============================================

CREATE TABLE IF NOT EXISTS calendar_events (
    id SERIAL PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'org_default',
    summary TEXT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    location TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_calendar_events_org_id ON calendar_events(org_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);

-- ============================================
-- SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'org_default',
    key TEXT NOT NULL,
    value TEXT,
    category TEXT DEFAULT 'general',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT settings_org_key_unique UNIQUE (org_id, key)
);
CREATE INDEX IF NOT EXISTS idx_settings_org_id ON settings(org_id);

-- ============================================
-- ACTION RECORDS (Agent Operations Control Plane)
-- ============================================

CREATE TABLE IF NOT EXISTS action_records (
    id SERIAL PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'org_default',
    -- Identity
    action_id TEXT UNIQUE NOT NULL,
    agent_id TEXT NOT NULL,
    agent_name TEXT,
    swarm_id TEXT,
    parent_action_id TEXT,
    -- Intent
    action_type TEXT NOT NULL,
    declared_goal TEXT NOT NULL,
    reasoning TEXT,
    authorization_scope TEXT,
    -- Context
    trigger TEXT,
    systems_touched TEXT DEFAULT '[]',
    input_summary TEXT,
    -- Action
    status TEXT DEFAULT 'running',
    reversible INTEGER DEFAULT 1,
    risk_score INTEGER DEFAULT 0,
    confidence INTEGER DEFAULT 50,
    -- Outcome
    output_summary TEXT,
    side_effects TEXT DEFAULT '[]',
    artifacts_created TEXT DEFAULT '[]',
    error_message TEXT,
    -- Meta
    timestamp_start TEXT NOT NULL,
    timestamp_end TEXT,
    duration_ms INTEGER,
    cost_estimate REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_action_records_org_id ON action_records(org_id);
CREATE INDEX IF NOT EXISTS idx_action_records_agent_id ON action_records(agent_id);
CREATE INDEX IF NOT EXISTS idx_action_records_swarm_id ON action_records(swarm_id);
CREATE INDEX IF NOT EXISTS idx_action_records_status ON action_records(status);
CREATE INDEX IF NOT EXISTS idx_action_records_action_type ON action_records(action_type);
CREATE INDEX IF NOT EXISTS idx_action_records_risk_score ON action_records(risk_score);
CREATE INDEX IF NOT EXISTS idx_action_records_timestamp_start ON action_records(timestamp_start);

CREATE TABLE IF NOT EXISTS open_loops (
    id SERIAL PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'org_default',
    loop_id TEXT UNIQUE NOT NULL,
    action_id TEXT NOT NULL REFERENCES action_records(action_id),
    loop_type TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    priority TEXT DEFAULT 'medium',
    owner TEXT,
    resolution TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_open_loops_org_id ON open_loops(org_id);
CREATE INDEX IF NOT EXISTS idx_open_loops_action_id ON open_loops(action_id);
CREATE INDEX IF NOT EXISTS idx_open_loops_status ON open_loops(status);
CREATE INDEX IF NOT EXISTS idx_open_loops_priority ON open_loops(priority);

CREATE TABLE IF NOT EXISTS assumptions (
    id SERIAL PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'org_default',
    assumption_id TEXT UNIQUE NOT NULL,
    action_id TEXT NOT NULL REFERENCES action_records(action_id),
    assumption TEXT NOT NULL,
    basis TEXT,
    validated INTEGER DEFAULT 0,
    validated_at TEXT,
    invalidated INTEGER DEFAULT 0,
    invalidated_reason TEXT,
    invalidated_at TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assumptions_org_id ON assumptions(org_id);
CREATE INDEX IF NOT EXISTS idx_assumptions_action_id ON assumptions(action_id);
CREATE INDEX IF NOT EXISTS idx_assumptions_validated ON assumptions(validated);
