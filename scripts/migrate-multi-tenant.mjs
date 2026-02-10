#!/usr/bin/env node

/**
 * Multi-Tenant Migration Script
 *
 * Idempotent — safe to run multiple times.
 * Adds organizations + api_keys tables, adds org_id to all existing tables,
 * backfills existing data to org_default, makes org_id NOT NULL.
 *
 * Usage:
 *   DATABASE_URL=<neon_url> node scripts/migrate-multi-tenant.mjs
 *   DATABASE_URL=<neon_url> DASHBOARD_API_KEY=<key> node scripts/migrate-multi-tenant.mjs
 */

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

import { neon } from '@neondatabase/serverless';
import { createHash } from 'node:crypto';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

function log(icon, msg) {
  console.log(`  ${icon} ${msg}`);
}

// All tables that need org_id
const TENANT_TABLES = [
  'action_records',
  'open_loops',
  'assumptions',
  'settings',
  'decisions',
  'outcomes',
  'lessons',
  'patterns',
  'ideas',
  'idea_updates',
  'goals',
  'milestones',
  'goal_updates',
  'contacts',
  'interactions',
  'workflows',
  'executions',
  'step_results',
  'scheduled_jobs',
  'token_usage',
  'content',
  'sync_log',
  'token_snapshots',
  'daily_totals',
  'health_snapshots',
  'entities',
  'topics',
  'calendar_events',
  'agent_connections',
  'usage_meters',
];

async function run() {
  console.log('\n=== Multi-Tenant Migration ===\n');

  // Step 1: Create organizations table
  console.log('Step 1: Creating organizations table...');
  await sql`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      plan TEXT DEFAULT 'free',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  log('✅', 'organizations table ready');

  // Step 2: Create api_keys table
  console.log('Step 2: Creating api_keys table...');
  await sql`
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
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_org_id ON api_keys(org_id)`;
  log('✅', 'api_keys table ready');

  // Step 3: Create default organization
  console.log('Step 3: Creating default organization...');
  await sql`
    INSERT INTO organizations (id, name, slug, plan)
    VALUES ('org_default', 'Default Organization', 'default', 'pro')
    ON CONFLICT (id) DO NOTHING
  `;
  log('✅', 'org_default exists');

  // Step 4: Seed admin key from DASHBOARD_API_KEY (if set)
  const dashboardKey = process.env.DASHBOARD_API_KEY;
  if (dashboardKey) {
    console.log('Step 4: Seeding admin API key from DASHBOARD_API_KEY...');
    const keyHash = createHash('sha256').update(dashboardKey).digest('hex');
    const keyPrefix = dashboardKey.substring(0, 8);
    const keyId = 'key_default_admin';

    await sql`
      INSERT INTO api_keys (id, org_id, key_hash, key_prefix, label, role)
      VALUES (${keyId}, 'org_default', ${keyHash}, ${keyPrefix}, 'Legacy Dashboard Key', 'admin')
      ON CONFLICT (id) DO UPDATE SET
        key_hash = EXCLUDED.key_hash,
        key_prefix = EXCLUDED.key_prefix
    `;
    log('✅', `Admin key seeded (prefix: ${keyPrefix}...)`);
  } else {
    console.log('Step 4: No DASHBOARD_API_KEY set — skipping admin key seed');
    log('⚠️', 'Set DASHBOARD_API_KEY and re-run to seed admin key');
  }

  // Step 5: Add org_id column to all existing tables
  console.log('Step 5: Adding org_id column to existing tables...');
  for (const table of TENANT_TABLES) {
    try {
      await sql.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS org_id TEXT`, []);
      log('✅', `${table}.org_id column ready`);
    } catch (err) {
      // Table might not exist yet — that's fine, schema creation will handle it
      if (err.message?.includes('does not exist')) {
        log('⚠️', `${table} does not exist — skipping (will be created by schema)`);
      } else {
        throw err;
      }
    }
  }

  // Step 6: Backfill existing data to org_default
  console.log('Step 6: Backfilling org_id = org_default...');
  for (const table of TENANT_TABLES) {
    try {
      const result = await sql.query(
        `UPDATE ${table} SET org_id = 'org_default' WHERE org_id IS NULL`,
        []
      );
      const count = result?.length || 0;
      if (count > 0) {
        log('✅', `${table}: backfilled ${count} rows`);
      } else {
        log('✅', `${table}: no rows to backfill`);
      }
    } catch (err) {
      if (err.message?.includes('does not exist')) {
        log('⚠️', `${table} does not exist — skipping backfill`);
      } else {
        throw err;
      }
    }
  }

  // Step 7: Set org_id NOT NULL + add indexes
  console.log('Step 7: Setting NOT NULL constraints and indexes...');
  for (const table of TENANT_TABLES) {
    try {
      // Set default for new rows
      await sql.query(
        `ALTER TABLE ${table} ALTER COLUMN org_id SET DEFAULT 'org_default'`,
        []
      );
      // Make NOT NULL
      await sql.query(
        `ALTER TABLE ${table} ALTER COLUMN org_id SET NOT NULL`,
        []
      );
      // Add index
      await sql.query(
        `CREATE INDEX IF NOT EXISTS idx_${table}_org_id ON ${table}(org_id)`,
        []
      );
      log('✅', `${table}: NOT NULL + index ready`);
    } catch (err) {
      if (err.message?.includes('does not exist')) {
        log('⚠️', `${table} does not exist — skipping constraints`);
      } else if (err.message?.includes('contains null values')) {
        log('❌', `${table}: still has NULL org_id values — run backfill again`);
        throw err;
      } else {
        throw err;
      }
    }
  }

  // Step 8: Fix settings table (composite unique key)
  console.log('Step 8: Fixing settings table composite key...');
  try {
    // Check if settings table exists and has a 'key' column
    const settingsCols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'settings' AND column_name = 'key'
    `;
    if (settingsCols.length > 0) {
      // Drop old PK if it was on 'key' alone
      await sql`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'settings_pkey'
            AND conrelid = 'settings'::regclass
          ) THEN
            ALTER TABLE settings DROP CONSTRAINT settings_pkey;
          END IF;
        END $$
      `;
      // Add serial ID if not present
      const hasId = await sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'settings' AND column_name = 'id'
      `;
      if (hasId.length === 0) {
        await sql`ALTER TABLE settings ADD COLUMN id SERIAL`;
      }
      // Add PK on id
      await sql`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'settings_pkey'
            AND conrelid = 'settings'::regclass
          ) THEN
            ALTER TABLE settings ADD PRIMARY KEY (id);
          END IF;
        END $$
      `;
      // Add composite unique constraint
      await sql`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'settings_org_key_unique'
          ) THEN
            ALTER TABLE settings ADD CONSTRAINT settings_org_key_unique UNIQUE (org_id, key);
          END IF;
        END $$
      `;
      log('✅', 'settings: composite key (org_id, key) ready');
    } else {
      log('⚠️', 'settings table has no key column — skipping PK fix');
    }
  } catch (err) {
    if (err.message?.includes('does not exist')) {
      log('⚠️', 'settings table does not exist — skipping PK fix');
    } else {
      // Non-fatal: log and continue
      log('⚠️', `settings PK fix: ${err.message}`);
    }
  }

  // Step 9: Fix workflows unique constraint
  console.log('Step 9: Fixing workflows unique constraint...');
  try {
    await sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'workflows_name_key'
        ) THEN
          ALTER TABLE workflows DROP CONSTRAINT workflows_name_key;
        END IF;
      END $$
    `;
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'workflows_org_name_unique'
        ) THEN
          ALTER TABLE workflows ADD CONSTRAINT workflows_org_name_unique UNIQUE (org_id, name);
        END IF;
      END $$
    `;
    log('✅', 'workflows: unique (org_id, name) ready');
  } catch (err) {
    if (err.message?.includes('does not exist')) {
      log('⚠️', 'workflows table does not exist — skipping constraint fix');
    } else {
      log('⚠️', `workflows constraint fix: ${err.message}`);
    }
  }

  // Step 10: Add agent_id to settings table for per-agent integrations
  console.log('Step 10: Adding agent_id to settings table...');
  try {
    const settingsExists = await sql`
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'settings' AND table_schema = 'public'
    `;
    if (settingsExists.length > 0) {
      // Add agent_id column (nullable — NULL means org-level default)
      await sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS agent_id TEXT`;

      // Drop old constraint if it exists
      await sql`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'settings_org_key_unique'
          ) THEN
            ALTER TABLE settings DROP CONSTRAINT settings_org_key_unique;
          END IF;
        END $$
      `;

      // Create new functional unique index (COALESCE handles NULL agent_id)
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS settings_org_agent_key_unique
        ON settings (org_id, COALESCE(agent_id, ''), key)
      `;

      // Add index on agent_id for fast per-agent lookups
      await sql`CREATE INDEX IF NOT EXISTS idx_settings_agent_id ON settings(agent_id)`;

      log('✅', 'settings: agent_id column + functional unique index ready');
    } else {
      log('⚠️', 'settings table does not exist — skipping agent_id migration');
    }
  } catch (err) {
    log('⚠️', `settings agent_id migration: ${err.message}`);
  }

  // Step 11: Create agent_connections table
  console.log('Step 11: Creating agent_connections table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS agent_connections (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL DEFAULT 'org_default',
        agent_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        auth_type TEXT NOT NULL DEFAULT 'api_key',
        plan_name TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        metadata TEXT,
        reported_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS agent_connections_org_agent_provider_unique
      ON agent_connections (org_id, agent_id, provider)
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_agent_connections_agent_id ON agent_connections(agent_id)`;
    log('✅', 'agent_connections table + indexes ready');
  } catch (err) {
    log('⚠️', `agent_connections migration: ${err.message}`);
  }

  // Step 12: Create token_snapshots + daily_totals tables (with agent_id)
  console.log('Step 12: Creating token_snapshots + daily_totals tables...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS token_snapshots (
        id SERIAL PRIMARY KEY,
        org_id TEXT NOT NULL DEFAULT 'org_default',
        agent_id TEXT,
        timestamp TEXT NOT NULL,
        tokens_in INTEGER,
        tokens_out INTEGER,
        context_used INTEGER,
        context_max INTEGER,
        context_pct REAL,
        hourly_pct_left REAL,
        weekly_pct_left REAL,
        compactions INTEGER,
        model TEXT,
        session_key TEXT
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_token_snapshots_org_id ON token_snapshots(org_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_token_snapshots_agent_id ON token_snapshots(agent_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_token_snapshots_timestamp ON token_snapshots(timestamp)`;
    log('✅', 'token_snapshots table + indexes ready');
  } catch (err) {
    log('⚠️', `token_snapshots migration: ${err.message}`);
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS daily_totals (
        id SERIAL PRIMARY KEY,
        org_id TEXT NOT NULL DEFAULT 'org_default',
        agent_id TEXT,
        date TEXT NOT NULL,
        total_tokens_in INTEGER DEFAULT 0,
        total_tokens_out INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        peak_context_pct REAL DEFAULT 0,
        snapshots_count INTEGER DEFAULT 0
      )
    `;
    // Functional unique: per-agent daily totals (NULL agent_id = org-wide aggregate)
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS daily_totals_org_agent_date_unique
      ON daily_totals (org_id, COALESCE(agent_id, ''), date)
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_totals_org_id ON daily_totals(org_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_totals_agent_id ON daily_totals(agent_id)`;
    log('✅', 'daily_totals table + indexes ready');
  } catch (err) {
    log('⚠️', `daily_totals migration: ${err.message}`);
  }

  // Step 13: Create health_snapshots, entities, topics tables (memory health)
  console.log('Step 13: Creating memory health tables...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS health_snapshots (
        id SERIAL PRIMARY KEY,
        org_id TEXT NOT NULL DEFAULT 'org_default',
        timestamp TEXT NOT NULL,
        health_score INTEGER DEFAULT 0,
        total_files INTEGER DEFAULT 0,
        total_lines INTEGER DEFAULT 0,
        total_size_kb INTEGER DEFAULT 0,
        memory_md_lines INTEGER DEFAULT 0,
        oldest_daily_file TEXT,
        newest_daily_file TEXT,
        days_with_notes INTEGER DEFAULT 0,
        avg_lines_per_day REAL DEFAULT 0,
        potential_duplicates INTEGER DEFAULT 0,
        stale_facts_count INTEGER DEFAULT 0
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_health_snapshots_org_id ON health_snapshots(org_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_health_snapshots_timestamp ON health_snapshots(timestamp)`;
    log('✅', 'health_snapshots table + indexes ready');
  } catch (err) {
    log('⚠️', `health_snapshots migration: ${err.message}`);
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS entities (
        id SERIAL PRIMARY KEY,
        org_id TEXT NOT NULL DEFAULT 'org_default',
        name TEXT NOT NULL,
        type TEXT DEFAULT 'other',
        mention_count INTEGER DEFAULT 1
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_entities_org_id ON entities(org_id)`;
    log('✅', 'entities table + index ready');
  } catch (err) {
    log('⚠️', `entities migration: ${err.message}`);
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS topics (
        id SERIAL PRIMARY KEY,
        org_id TEXT NOT NULL DEFAULT 'org_default',
        name TEXT NOT NULL,
        mention_count INTEGER DEFAULT 1
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_topics_org_id ON topics(org_id)`;
    log('✅', 'topics table + index ready');
  } catch (err) {
    log('⚠️', `topics migration: ${err.message}`);
  }

  // Step 14: Create waitlist table (pre-auth, no org_id)
  console.log('Step 14: Creating waitlist table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS waitlist (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        signed_up_at TEXT NOT NULL,
        signup_count INTEGER DEFAULT 1,
        source TEXT DEFAULT 'landing_page',
        notes TEXT
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_waitlist_signed_up_at ON waitlist(signed_up_at)`;
    log('✅', 'waitlist table + indexes ready');
  } catch (err) {
    log('⚠️', `waitlist migration: ${err.message}`);
  }

  // Step 15: Users table (NextAuth integration)
  console.log('Step 15: Creating users table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL DEFAULT 'org_default',
        email TEXT NOT NULL,
        name TEXT,
        image TEXT,
        provider TEXT NOT NULL,
        provider_account_id TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        created_at TEXT NOT NULL,
        last_login_at TEXT NOT NULL
      )
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_provider_account_unique ON users(provider, provider_account_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    log('✅', 'users table + indexes ready');
  } catch (err) {
    log('⚠️', `users migration: ${err.message}`);
  }

  // Step 16: Add agent_id to content, contacts, interactions, goals, milestones, workflows, executions
  console.log('Step 16: Adding agent_id to data tables...');
  const agentIdTables = ['content', 'contacts', 'interactions', 'goals', 'milestones', 'workflows', 'executions'];
  for (const table of agentIdTables) {
    try {
      await sql.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS agent_id TEXT`);
      await sql.query(`CREATE INDEX IF NOT EXISTS idx_${table}_agent_id ON ${table}(agent_id)`);
      log('✅', `${table}: agent_id column + index ready`);
    } catch (err) {
      log('⚠️', `${table} agent_id migration: ${err.message}`);
    }
  }

  // Step 17: Create invites table (team invitations)
  console.log('Step 17: Creating invites table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS invites (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'member',
        token TEXT UNIQUE NOT NULL,
        invited_by TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        accepted_by TEXT,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_invites_org_id ON invites(org_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status)`;
    log('✅', 'invites table + indexes ready');
  } catch (err) {
    log('⚠️', `invites migration: ${err.message}`);
  }

  // Step 18: Add Stripe billing columns to organizations
  console.log('Step 18: Adding Stripe billing columns to organizations...');
  try {
    await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`;
    await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT`;
    await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active'`;
    await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS current_period_end TEXT`;
    await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TEXT`;
    await sql`CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id ON organizations(stripe_customer_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_organizations_stripe_subscription_id ON organizations(stripe_subscription_id)`;
    log('✅', 'organizations: Stripe billing columns + indexes ready');
  } catch (err) {
    log('⚠️', `organizations Stripe columns: ${err.message}`);
  }

  // Step 19: Create usage_meters table (billing quota fast path)
  console.log('Step 19: Creating usage_meters table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS usage_meters (
        id SERIAL PRIMARY KEY,
        org_id TEXT NOT NULL DEFAULT 'org_default',
        period TEXT NOT NULL,
        resource TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        last_reconciled_at TEXT,
        updated_at TEXT NOT NULL
      )
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS usage_meters_org_period_resource_unique
      ON usage_meters (org_id, period, resource)
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_usage_meters_org_id ON usage_meters(org_id)`;
    log('✅', 'usage_meters table + indexes ready');
  } catch (err) {
    log('⚠️', `usage_meters migration: ${err.message}`);
  }

  // Verification
  console.log('\n=== Verification ===\n');

  const orgCheck = await sql`SELECT * FROM organizations WHERE id = 'org_default'`;
  log(orgCheck.length > 0 ? '✅' : '❌', `org_default exists: ${orgCheck.length > 0}`);

  const colCheck = await sql`
    SELECT table_name, is_nullable
    FROM information_schema.columns
    WHERE column_name = 'org_id'
    AND table_schema = 'public'
    ORDER BY table_name
  `;
  log('📊', `Tables with org_id: ${colCheck.length}`);
  const nullableTables = colCheck.filter(c => c.is_nullable === 'YES');
  if (nullableTables.length > 0) {
    log('⚠️', `Tables with nullable org_id: ${nullableTables.map(t => t.table_name).join(', ')}`);
  } else {
    log('✅', 'All org_id columns are NOT NULL');
  }

  if (dashboardKey) {
    const keyCheck = await sql`SELECT id, key_prefix, role FROM api_keys WHERE org_id = 'org_default'`;
    log(keyCheck.length > 0 ? '✅' : '❌', `Admin key exists: ${keyCheck.length > 0}`);
  }

  console.log('\n=== Migration Complete ===\n');
}

run().catch(err => {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
});
