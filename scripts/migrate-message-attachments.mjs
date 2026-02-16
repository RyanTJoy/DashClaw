#!/usr/bin/env node

/**
 * Message Attachments Migration
 *
 * Idempotent — safe to run multiple times.
 * Creates message_attachments table for storing file attachments on messages.
 *
 * Usage:
 *   node scripts/_run-with-env.mjs scripts/migrate-message-attachments.mjs
 */

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

import { createSqlFromEnv } from './_db.mjs';

const sql = createSqlFromEnv();

async function run() {
  console.log('\n=== Message Attachments Migration ===\n');

  console.log('Creating message_attachments table...');
  await sql`
    CREATE TABLE IF NOT EXISTS message_attachments (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `;
  console.log('  ✓ message_attachments table created');

  await sql`
    CREATE INDEX IF NOT EXISTS idx_message_attachments_message
    ON message_attachments (message_id)
  `;
  console.log('  ✓ message_id index created');

  await sql`
    CREATE INDEX IF NOT EXISTS idx_message_attachments_org
    ON message_attachments (org_id)
  `;
  console.log('  ✓ org_id index created');

  console.log('\n✓ Migration complete\n');

  if (sql.end) await sql.end({ timeout: 5 });
}

run().catch((e) => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
