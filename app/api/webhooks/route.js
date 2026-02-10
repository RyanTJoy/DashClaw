export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getOrgId, getOrgRole, getUserId } from '../../lib/org.js';
import { logActivity } from '../../lib/audit.js';
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

// GET /api/webhooks - List webhooks for org (all members)
export async function GET(request) {
  try {
    const orgId = getOrgId(request);
    const sql = getSql();

    const webhooks = await sql`
      SELECT id, url, secret, events, active, failure_count, last_triggered_at, created_at, created_by
      FROM webhooks
      WHERE org_id = ${orgId}
      ORDER BY created_at DESC
    `;

    // Mask secrets: show only last 4 chars
    const masked = webhooks.map(wh => ({
      ...wh,
      secret: wh.secret ? `${'•'.repeat(28)}${wh.secret.slice(-4)}` : null,
    }));

    return NextResponse.json({ webhooks: masked });
  } catch (error) {
    console.error('Webhooks GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
  }
}

// POST /api/webhooks - Create webhook (admin only)
export async function POST(request) {
  try {
    const orgId = getOrgId(request);
    if (getOrgRole(request) !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const sql = getSql();
    const userId = getUserId(request);
    const body = await request.json();
    const { url, events = ['all'] } = body;

    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') {
        return NextResponse.json({ error: 'URL must use HTTPS' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Validate events
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'Events must be a non-empty array' }, { status: 400 });
    }
    for (const evt of events) {
      if (!VALID_SIGNAL_TYPES.includes(evt)) {
        return NextResponse.json({ error: `Invalid event type: ${evt}` }, { status: 400 });
      }
    }

    // Max 10 webhooks per org
    const countRows = await sql`SELECT COUNT(*) as count FROM webhooks WHERE org_id = ${orgId}`;
    if (parseInt(countRows[0].count, 10) >= 10) {
      return NextResponse.json({ error: 'Maximum 10 webhooks per organization' }, { status: 409 });
    }

    const webhookId = `wh_${crypto.randomUUID()}`;
    const secret = crypto.randomBytes(32).toString('hex');
    const now = new Date().toISOString();

    await sql`
      INSERT INTO webhooks (id, org_id, url, secret, events, active, created_by, failure_count, created_at)
      VALUES (${webhookId}, ${orgId}, ${url}, ${secret}, ${JSON.stringify(events)}, 1, ${userId}, 0, ${now})
    `;

    logActivity({
      orgId, actorId: userId, action: 'webhook.created',
      resourceType: 'webhook', resourceId: webhookId,
      details: { url, events }, request,
    }, sql);

    return NextResponse.json({
      webhook: { id: webhookId, url, secret, events, active: 1, created_at: now },
    }, { status: 201 });
  } catch (error) {
    console.error('Webhooks POST error:', error);
    return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 });
  }
}

// DELETE /api/webhooks?id=wh_xxx - Delete webhook (admin only)
export async function DELETE(request) {
  try {
    const orgId = getOrgId(request);
    if (getOrgRole(request) !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('id');
    if (!webhookId || !webhookId.startsWith('wh_')) {
      return NextResponse.json({ error: 'Valid webhook id is required' }, { status: 400 });
    }

    const sql = getSql();
    const userId = getUserId(request);

    const existing = await sql`
      SELECT id FROM webhooks WHERE id = ${webhookId} AND org_id = ${orgId}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    await sql`DELETE FROM webhooks WHERE id = ${webhookId} AND org_id = ${orgId}`;

    logActivity({
      orgId, actorId: userId, action: 'webhook.deleted',
      resourceType: 'webhook', resourceId: webhookId, request,
    }, sql);

    return NextResponse.json({ success: true, deleted: webhookId });
  } catch (error) {
    console.error('Webhooks DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
  }
}
