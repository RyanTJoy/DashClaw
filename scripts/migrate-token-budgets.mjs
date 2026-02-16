#!/usr/bin/env node

/**
 * Token Budgets Migration Script
 * Adds configurable token budget limits per org/agent.
 */

import './_load-env.mjs';
import { createSqlFromEnv } from './_db.mjs';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL || DATABASE_URL.includes('<YOUR_NEON_DATABASE_URL>')) {
  console.error('DATABASE_URL is required and must be a valid connection string');
  process.exit(1);
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

const sql = createSqlFromEnv();

async function run() {
  console.log('\n=== Token Budgets Migration ===\n');

  try {
    console.log('Step 1: Creating token_budgets table...');
    await sql`
      CREATE TABLE IF NOT EXISTS token_budgets (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        org_id TEXT NOT NULL,
        agent_id TEXT DEFAULT NULL,
        daily_limit INTEGER NOT NULL DEFAULT 18000,
        weekly_limit INTEGER NOT NULL DEFAULT 126000,
        monthly_limit INTEGER NOT NULL DEFAULT 540000,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(org_id, COALESCE(agent_id, ''))
      )
    `;
    console.log('  ✅ token_budgets table ready');

    console.log('\n=== Migration complete ===\n');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
