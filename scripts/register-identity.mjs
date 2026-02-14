#!/usr/bin/env node

/**
 * register-identity.mjs
 *
 * Upsert an agent public key into agent_identities.
 *
 * Usage:
 *   node scripts/register-identity.mjs --agent-id cinder --public-key-file secrets/cinder.public.pem
 *
 * Env:
 *   DATABASE_URL (required)
 */

import { readFileSync } from 'node:fs';
import process from 'node:process';
import { createSqlFromEnv } from './_db.mjs';

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

const agentId = getArg('--agent-id');
const publicKeyFile = getArg('--public-key-file');
const orgId = getArg('--org-id') || 'org_default';
const algorithm = getArg('--algorithm') || 'RSASSA-PKCS1-v1_5';

if (!agentId || !publicKeyFile) {
  console.error('Usage: node scripts/register-identity.mjs --agent-id <id> --public-key-file <path> [--org-id <org>] [--algorithm <alg>]');
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('Error: DATABASE_URL is required (set it or use scripts/_run-with-env.mjs).');
  process.exit(1);
}

const publicKey = readFileSync(publicKeyFile, 'utf8');
if (!publicKey.includes('BEGIN PUBLIC KEY')) {
  console.error('Error: public key file does not look like a PEM public key.');
  process.exit(1);
}

const sql = createSqlFromEnv();

const rows = await sql`
  INSERT INTO agent_identities (org_id, agent_id, public_key, algorithm)
  VALUES (${orgId}, ${agentId}, ${publicKey}, ${algorithm})
  ON CONFLICT (org_id, agent_id) DO UPDATE
  SET public_key = EXCLUDED.public_key,
      algorithm = EXCLUDED.algorithm,
      updated_at = CURRENT_TIMESTAMP
  RETURNING org_id, agent_id, algorithm, updated_at
`;

console.log(JSON.stringify({ ok: true, identity: rows[0] }));
