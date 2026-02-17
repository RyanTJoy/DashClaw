#!/usr/bin/env node

/**
 * Prompt Injection Scans Migration
 *
 * Idempotent — safe to run multiple times.
 * Creates prompt_injection_scans table for storing scan metadata.
 *
 * Usage:
 *   node scripts/_run-with-env.mjs scripts/migrate-prompt-injection.mjs
 */

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

import { createSqlFromEnv } from './_db.mjs';

const sql = createSqlFromEnv();

async function run() {
  console.log('\n=== Prompt Injection Scans Migration ===\n');

  console.log('Creating prompt_injection_scans table...');
  await sql`
    CREATE TABLE IF NOT EXISTS prompt_injection_scans (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      agent_id TEXT,
      content_hash TEXT NOT NULL,
      findings_count INTEGER DEFAULT 0,
      critical_count INTEGER DEFAULT 0,
      categories TEXT DEFAULT '[]',
      risk_level TEXT DEFAULT 'none',
      recommendation TEXT DEFAULT 'allow',
      source TEXT,
      scanned_at TEXT NOT NULL
    )
  `;
  console.log('  ✓ prompt_injection_scans table created');

  console.log('Creating indexes...');
  await sql`
    CREATE INDEX IF NOT EXISTS idx_pi_scans_org ON prompt_injection_scans(org_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_pi_scans_time ON prompt_injection_scans(org_id, scanned_at DESC)
  `;
  console.log('  ✓ indexes created');

  console.log('\n✅ Prompt injection migration complete.\n');
  await sql.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
