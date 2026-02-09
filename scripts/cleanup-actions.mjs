#!/usr/bin/env node
/**
 * cleanup-actions.mjs — Delete stale action_records (and optionally loops/assumptions) directly from DB.
 *
 * Usage:
 *   node scripts/_run-with-env.mjs scripts/cleanup-actions.mjs --before "2026-02-09" --dry-run
 *   node scripts/_run-with-env.mjs scripts/cleanup-actions.mjs --before "2026-02-09" --include-loops --include-assumptions
 *
 * Or with own .env.local loading:
 *   node scripts/cleanup-actions.mjs --before "2026-02-09" --dry-run
 *
 * Uses DATABASE_URL directly (no API — action records are an audit trail, no DELETE endpoint).
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = resolve(projectRoot, '.env.local');
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const l of lines) {
    const idx = l.indexOf('=');
    if (idx > 0 && !l.startsWith('#')) {
      const key = l.slice(0, idx).trim();
      if (!process.env[key]) {
        process.env[key] = l.slice(idx + 1).trim();
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--include-loops') {
      args.includeLoops = true;
    } else if (arg === '--include-assumptions') {
      args.includeAssumptions = true;
    } else if (arg.startsWith('--') && i + 1 < argv.length) {
      const key = arg.slice(2);
      args[key] = argv[++i];
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  loadEnv();
  const args = parseArgs(process.argv);

  if (!args.before) {
    console.log(`Usage:
  node scripts/cleanup-actions.mjs --before "2026-02-09" [--include-loops] [--include-assumptions] [--dry-run]

Options:
  --before <date>         Delete records with timestamp_start before this date (ISO format)
  --include-loops         Also delete open_loops for matched actions
  --include-assumptions   Also delete assumptions for matched actions
  --dry-run               Show what would be deleted without deleting`);
    process.exit(0);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('Error: DATABASE_URL not set. Use _run-with-env.mjs or set in .env.local');
    process.exit(1);
  }

  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(dbUrl);

  const cutoff = args.before;

  // Find matching action_records
  const matches = await sql.query(
    `SELECT action_id, agent_id, action_type, declared_goal, status, timestamp_start
     FROM action_records
     WHERE timestamp_start::timestamptz < $1::timestamptz
     ORDER BY timestamp_start ASC`,
    [cutoff]
  );

  console.log(`Found ${matches.length} action record(s) before ${cutoff}`);

  if (matches.length === 0) {
    console.log('Nothing to delete.');
    return;
  }

  for (const r of matches) {
    console.log(`  ${r.action_id}  ${r.agent_id}  ${r.action_type}  ${r.status}  ${r.timestamp_start.slice(0, 19)}`);
  }

  const actionIds = matches.map(r => r.action_id);

  if (args.dryRun) {
    console.log('\n(dry run — nothing deleted)');

    if (args.includeLoops) {
      const loops = await sql.query(
        `SELECT COUNT(*) as cnt FROM open_loops WHERE action_id = ANY($1)`,
        [actionIds]
      );
      console.log(`  Would delete ${loops[0].cnt} open loop(s)`);
    }
    if (args.includeAssumptions) {
      const asms = await sql.query(
        `SELECT COUNT(*) as cnt FROM assumptions WHERE action_id = ANY($1)`,
        [actionIds]
      );
      console.log(`  Would delete ${asms[0].cnt} assumption(s)`);
    }
    return;
  }

  // Count before deleting (Neon DELETE doesn't return row count via .length)
  let loopCount = 0;
  let asmCount = 0;

  if (args.includeLoops) {
    const loops = await sql.query(
      `SELECT COUNT(*) as cnt FROM open_loops WHERE action_id = ANY($1)`,
      [actionIds]
    );
    loopCount = parseInt(loops[0].cnt, 10);
    await sql.query(`DELETE FROM open_loops WHERE action_id = ANY($1)`, [actionIds]);
    console.log(`Deleted ${loopCount} open loop(s)`);
  }

  if (args.includeAssumptions) {
    const asms = await sql.query(
      `SELECT COUNT(*) as cnt FROM assumptions WHERE action_id = ANY($1)`,
      [actionIds]
    );
    asmCount = parseInt(asms[0].cnt, 10);
    await sql.query(`DELETE FROM assumptions WHERE action_id = ANY($1)`, [actionIds]);
    console.log(`Deleted ${asmCount} assumption(s)`);
  }

  await sql.query(`DELETE FROM action_records WHERE action_id = ANY($1)`, [actionIds]);
  console.log(`Deleted ${matches.length} action record(s)`);
  console.log('Done.');
}

main();
