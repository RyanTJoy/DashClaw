#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { scoreAndStoreActionEpisode } from '../app/lib/learningLoop.service.js';

function parseArgInt(name, fallback, min, max) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix));
  if (!raw) return fallback;
  const value = parseInt(raw.slice(prefix.length), 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(value, max));
}

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const lookbackDays = parseArgInt('lookback-days', 90, 1, 730);
  const perOrgLimit = parseArgInt('per-org-limit', 5000, 100, 50000);

  const sql = neon(url);
  const orgs = await sql`SELECT id FROM organizations ORDER BY id`;
  const summary = [];

  for (const org of orgs) {
    const rows = await sql.query(
      `
        SELECT action_id
        FROM action_records
        WHERE org_id = $1
          AND timestamp_start::timestamptz > NOW() - INTERVAL '1 day' * $2
        ORDER BY timestamp_start DESC
        LIMIT $3
      `,
      [org.id, lookbackDays, perOrgLimit]
    );

    let scored = 0;
    for (const row of rows) {
      const result = await scoreAndStoreActionEpisode(sql, org.id, row.action_id);
      if (result) scored++;
    }

    summary.push({
      org_id: org.id,
      actions_considered: rows.length,
      episodes_scored: scored,
    });
  }

  console.log(JSON.stringify({ summary, options: { lookbackDays, perOrgLimit } }, null, 2));
}

run().catch((error) => {
  console.error(`Episode backfill failed: ${error.message}`);
  process.exit(1);
});

