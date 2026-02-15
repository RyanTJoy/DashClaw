#!/usr/bin/env node

/**
 * cleanup-org-default.mjs — Remove all data from org_default.
 *
 * Keeps the org_default organization row and user rows intact
 * (new users still land on org_default before creating their workspace).
 * Clears all agent data, settings, keys, logs, etc.
 *
 * Usage:
 *   DATABASE_URL=<db_url> node scripts/cleanup-org-default.mjs --dry-run
 *   DATABASE_URL=<db_url> node scripts/cleanup-org-default.mjs
 */

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

import { createSqlFromEnv } from './_db.mjs';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');
const sql = createSqlFromEnv();

// All tables with org_id that should be cleared.
// Ordered to respect foreign key constraints (children first).
const TABLES_TO_CLEAR = [
  // FK children first
  'context_entries',
  'webhook_deliveries',
  'step_results',
  'milestones',
  'goal_updates',
  'idea_updates',
  'interactions',
  'executions',
  // Then parents
  'action_records',
  'open_loops',
  'assumptions',
  'settings',
  'decisions',
  'outcomes',
  'lessons',
  'patterns',
  'ideas',
  'goals',
  'contacts',
  'workflows',
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
  'activity_logs',
  'webhooks',
  'notification_preferences',
  'signal_snapshots',
  'handoffs',
  'context_points',
  'context_threads',
  'snippets',
  'user_observations',
  'user_preferences',
  'user_moods',
  'user_approaches',
  'security_findings',
  'agent_messages',
  'message_threads',
  'shared_docs',
  'guard_policies',
  'guard_decisions',
  'api_keys',
  'invites',
];

async function run() {
  console.log(`\n=== Cleanup org_default${dryRun ? ' (DRY RUN)' : ''} ===\n`);

  let totalDeleted = 0;

  for (const table of TABLES_TO_CLEAR) {
    try {
      // Check if table exists
      const exists = await sql`
        SELECT 1 FROM information_schema.tables
        WHERE table_name = ${table} AND table_schema = 'public'
      `;
      if (exists.length === 0) {
        console.log(`  - ${table}: table does not exist, skipping`);
        continue;
      }

      // Check if table has org_id column
      const hasOrgId = await sql`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = ${table} AND column_name = 'org_id' AND table_schema = 'public'
      `;
      if (hasOrgId.length === 0) {
        console.log(`  - ${table}: no org_id column, skipping`);
        continue;
      }

      // Count rows
      const countResult = await sql.query(
        `SELECT COUNT(*) as cnt FROM ${table} WHERE org_id = $1`,
        ['org_default']
      );
      const count = parseInt(countResult[0]?.cnt || '0', 10);

      if (count === 0) {
        console.log(`  - ${table}: 0 rows`);
        continue;
      }

      if (dryRun) {
        console.log(`  * ${table}: ${count} rows (would delete)`);
      } else {
        await sql.query(
          `DELETE FROM ${table} WHERE org_id = $1`,
          ['org_default']
        );
        console.log(`  ✓ ${table}: deleted ${count} rows`);
      }
      totalDeleted += count;
    } catch (err) {
      console.error(`  ✗ ${table}: ${err.message}`);
    }
  }

  console.log(`\nTotal: ${totalDeleted} rows ${dryRun ? 'would be' : ''} deleted`);

  if (dryRun) {
    console.log('\nRe-run without --dry-run to execute.');
  } else {
    console.log('\norg_default data cleared. The organization row and user rows are preserved.');
    console.log('New users will still land on org_default and see the onboarding checklist.');
  }
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
