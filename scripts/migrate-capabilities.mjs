#!/usr/bin/env node

/**
 * Agent Capabilities Migration
 *
 * Idempotent — safe to run multiple times.
 * Creates agent_capabilities table for storing discovered skills and tools.
 *
 * Usage:
 *   node scripts/_run-with-env.mjs scripts/migrate-capabilities.mjs
 */

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

import { createSqlFromEnv } from './_db.mjs';

const sql = createSqlFromEnv();

async function run() {
  console.log('\n=== Agent Capabilities Migration ===\n');

  console.log('Creating agent_capabilities table...');
  await sql`
    CREATE TABLE IF NOT EXISTS agent_capabilities (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      org_id TEXT NOT NULL REFERENCES organizations(id),
      agent_id TEXT,
      name TEXT NOT NULL,
      capability_type TEXT NOT NULL DEFAULT 'skill',
      description TEXT,
      source_path TEXT,
      file_count INTEGER DEFAULT 1,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  console.log('  ✓ agent_capabilities table created');

  // Add unique constraint (idempotent via IF NOT EXISTS pattern)
  try {
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_capabilities_unique
      ON agent_capabilities (org_id, COALESCE(agent_id, ''), name, capability_type)
    `;
    console.log('  ✓ unique index created');
  } catch (e) {
    if (e.message?.includes('already exists')) {
      console.log('  ✓ unique index already exists');
    } else {
      throw e;
    }
  }

  // Add org_id index for faster lookups
  await sql`
    CREATE INDEX IF NOT EXISTS idx_agent_capabilities_org
    ON agent_capabilities (org_id)
  `;
  console.log('  ✓ org index created');

  console.log('\n✓ Migration complete\n');

  if (sql.end) await sql.end({ timeout: 5 });
}

run().catch((e) => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
