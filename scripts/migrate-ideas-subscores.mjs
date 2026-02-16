#!/usr/bin/env node

/**
 * Ideas Sub-Scores Migration
 *
 * Idempotent — safe to run multiple times.
 * Adds fun_factor, learning_potential, income_potential columns to the ideas table.
 *
 * Usage:
 *   node scripts/_run-with-env.mjs scripts/migrate-ideas-subscores.mjs
 */

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

import { createSqlFromEnv } from './_db.mjs';

const sql = createSqlFromEnv();

async function run() {
  console.log('\n=== Ideas Sub-Scores Migration ===\n');

  console.log('Adding sub-score columns to ideas table...');
  await sql`ALTER TABLE ideas ADD COLUMN IF NOT EXISTS fun_factor INTEGER DEFAULT 0`;
  console.log('  ✓ fun_factor column added');

  await sql`ALTER TABLE ideas ADD COLUMN IF NOT EXISTS learning_potential INTEGER DEFAULT 0`;
  console.log('  ✓ learning_potential column added');

  await sql`ALTER TABLE ideas ADD COLUMN IF NOT EXISTS income_potential INTEGER DEFAULT 0`;
  console.log('  ✓ income_potential column added');

  console.log('\n✓ Migration complete\n');

  if (sql.end) await sql.end({ timeout: 5 });
}

run().catch((e) => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
