export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getOrgId, getOrgRole } from '../../lib/org.js';
import crypto from 'crypto';

let _sql;
function getSql() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const { neon } = require('@neondatabase/serverless');
  _sql = neon(url);
  return _sql;
}

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function generateApiKey() {
  const random = crypto.randomBytes(16).toString('hex');
  return `oc_live_${random}`;
}

// GET /api/keys - List API keys for the user's org
export async function GET(request) {
  try {
    const orgId = getOrgId(request);
    if (orgId === 'org_default') {
      return NextResponse.json(
        { error: 'Complete onboarding to manage API keys', needsOnboarding: true },
        { status: 403 }
      );
    }

    const sql = getSql();
    const keys = await sql`
      SELECT id, key_prefix, label, role, last_used_at, created_at, revoked_at
      FROM api_keys
      WHERE org_id = ${orgId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Keys API GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
  }
}

// POST /api/keys - Generate a new API key (admin only)
export async function POST(request) {
  try {
    const orgId = getOrgId(request);
    if (orgId === 'org_default') {
      return NextResponse.json(
        { error: 'Complete onboarding to manage API keys', needsOnboarding: true },
        { status: 403 }
      );
    }
    if (getOrgRole(request) !== 'admin') {
      return NextResponse.json({ error: 'Admin access required to generate API keys' }, { status: 403 });
    }

    const body = await request.json();
    const { label = 'API Key' } = body;

    if (typeof label !== 'string' || label.length > 256) {
      return NextResponse.json({ error: 'Label must be a string of 256 characters or fewer' }, { status: 400 });
    }

    const sql = getSql();
    const rawKey = generateApiKey();
    const keyHash = hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 8);
    const keyId = `key_${crypto.randomUUID()}`;

    await sql`
      INSERT INTO api_keys (id, org_id, key_hash, key_prefix, label, role)
      VALUES (${keyId}, ${orgId}, ${keyHash}, ${keyPrefix}, ${label}, 'admin')
    `;

    return NextResponse.json({
      key: {
        id: keyId,
        raw_key: rawKey,
        prefix: keyPrefix,
        label,
        role: 'admin',
        warning: 'Save this key now. It will not be shown again.'
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Keys API POST error:', error);
    return NextResponse.json({ error: 'Failed to generate API key' }, { status: 500 });
  }
}

// DELETE /api/keys?id=key_xxx - Revoke an API key (admin only)
export async function DELETE(request) {
  try {
    const orgId = getOrgId(request);
    if (orgId === 'org_default') {
      return NextResponse.json(
        { error: 'Complete onboarding to manage API keys', needsOnboarding: true },
        { status: 403 }
      );
    }
    if (getOrgRole(request) !== 'admin') {
      return NextResponse.json({ error: 'Admin access required to revoke API keys' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId || !keyId.startsWith('key_')) {
      return NextResponse.json({ error: 'Valid key id is required' }, { status: 400 });
    }

    const sql = getSql();
    const existing = await sql`
      SELECT id, revoked_at FROM api_keys WHERE id = ${keyId} AND org_id = ${orgId}
    `;

    if (existing.length === 0) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }
    if (existing[0].revoked_at) {
      return NextResponse.json({ error: 'API key is already revoked' }, { status: 409 });
    }

    await sql`
      UPDATE api_keys SET revoked_at = CURRENT_TIMESTAMP WHERE id = ${keyId} AND org_id = ${orgId}
    `;

    return NextResponse.json({ success: true, revoked: keyId });
  } catch (error) {
    console.error('Keys API DELETE error:', error);
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
  }
}
