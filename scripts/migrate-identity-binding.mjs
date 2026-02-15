#!/usr/bin/env node

/**
 * Identity Binding Migration Script
 *
 * Adds agent_identities table and updates action_records for cryptographic signatures.
 *
 * Usage:
 *   DATABASE_URL=<db_url> node scripts/migrate-identity-binding.mjs
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

const sql = createSqlFromEnv();

function log(icon, msg) {
  console.log(`  ${icon} ${msg}`);
}

async function run() {
  console.log('\n🔒 Starting Identity Binding Migration...\n');

  try {
    // 1. Create agent_identities table
    console.log('Step 1: Creating agent_identities table...');
    await sql`
      CREATE TABLE IF NOT EXISTS agent_identities (
        id SERIAL PRIMARY KEY,
        org_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        public_key TEXT NOT NULL,
        algorithm TEXT NOT NULL DEFAULT 'RSASSA-PKCS1-v1_5',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Unique constraint: one key per agent per org
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_identities_unique 
      ON agent_identities (org_id, agent_id)
    `;
    log('✅', 'agent_identities table created');

    // 2. Add signature columns to action_records
    console.log('Step 2: Adding signature columns to action_records...');
    
    // Check if columns exist first to avoid errors
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'action_records'
    `;
    const columnNames = columns.map(c => c.column_name);

    if (!columnNames.includes('signature')) {
      await sql`ALTER TABLE action_records ADD COLUMN signature TEXT`;
      log('➕', 'Added signature column');
    } else {
      log('✓', 'signature column already exists');
    }

    if (!columnNames.includes('verified')) {
      await sql`ALTER TABLE action_records ADD COLUMN verified BOOLEAN DEFAULT FALSE`;
      log('➕', 'Added verified column');
    } else {
      log('✓', 'verified column already exists');
    }

    console.log('\n🎉 Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  }
}

run();
