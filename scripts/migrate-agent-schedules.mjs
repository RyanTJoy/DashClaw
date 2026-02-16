#!/usr/bin/env node

/**
 * Agent Schedules Migration
 *
 * Idempotent — safe to run multiple times.
 * Creates agent_schedules table for tracking recurring agent tasks and heartbeats.
 *
 * Usage:
 *   node scripts/_run-with-env.mjs scripts/migrate-agent-schedules.mjs
 */

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

import { createSqlFromEnv } from './_db.mjs';

const sql = createSqlFromEnv();

async function run() {
  console.log('\n=== Agent Schedules Migration ===\n');

  console.log('Creating agent_schedules table...');
  await sql`
    CREATE TABLE IF NOT EXISTS agent_schedules (
      id SERIAL PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id),
      agent_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      cron_expression TEXT NOT NULL,
      enabled BOOLEAN DEFAULT true,
      last_run TIMESTAMPTZ,
      next_run TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✓ agent_schedules table created');

  await sql`
    CREATE INDEX IF NOT EXISTS idx_agent_schedules_org_agent
    ON agent_schedules(org_id, agent_id)
  `;
  console.log('  ✓ org+agent index created');

  console.log('\n✓ Migration complete\n');

  if (sql.end) await sql.end({ timeout: 5 });
}

run().catch((e) => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
