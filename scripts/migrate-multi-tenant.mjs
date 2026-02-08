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
