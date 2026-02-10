export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getOrgId, getUserId } from '../../lib/org.js';
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

const VALID_SIGNAL_TYPES = [
  'all', 'autonomy_spike', 'high_impact_low_oversight', 'repeated_failures',
  'stale_loop', 'assumption_drift', 'stale_assumption', 'stale_running_action'
];

// GET /api/notifications - Get current user's preferences
export async function GET(request) {
  try {
    const orgId = getOrgId(request);
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const sql = getSql();
    const rows = await sql`
      SELECT id, channel, enabled, signal_types, created_at, updated_at
      FROM notification_preferences
      WHERE org_id = ${orgId} AND user_id = ${userId}
      ORDER BY channel
    `;

    return NextResponse.json({ preferences: rows });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch notification preferences' }, { status: 500 });
  }
}

// POST /api/notifications - Upsert preferences
export async function POST(request) {
  try {
    const orgId = getOrgId(request);
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const sql = getSql();
    const body = await request.json();
    const { channel = 'email', enabled = true, signal_types = ['all'] } = body;

    if (channel !== 'email') {
      return NextResponse.json({ error: 'Only email channel is currently supported' }, { status: 400 });
    }

    if (!Array.isArray(signal_types) || signal_types.length === 0) {
      return NextResponse.json({ error: 'signal_types must be a non-empty array' }, { status: 400 });
    }
    for (const st of signal_types) {
      if (!VALID_SIGNAL_TYPES.includes(st)) {
        return NextResponse.json({ error: `Invalid signal type: ${st}` }, { status: 400 });
      }
    }

    const now = new Date().toISOString();
    const prefId = `np_${crypto.randomUUID()}`;
    const enabledInt = enabled ? 1 : 0;
    const typesStr = JSON.stringify(signal_types);

    await sql`
      INSERT INTO notification_preferences (id, org_id, user_id, channel, enabled, signal_types, created_at, updated_at)
      VALUES (${prefId}, ${orgId}, ${userId}, ${channel}, ${enabledInt}, ${typesStr}, ${now}, ${now})
      ON CONFLICT (org_id, user_id, channel) DO UPDATE SET
        enabled = ${enabledInt},
        signal_types = ${typesStr},
        updated_at = ${now}
    `;

    return NextResponse.json({ success: true, channel, enabled, signal_types });
  } catch (error) {
    console.error('Notifications POST error:', error);
    return NextResponse.json({ error: 'Failed to update notification preferences' }, { status: 500 });
  }
}
