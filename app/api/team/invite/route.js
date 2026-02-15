export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getOrgId, getOrgRole, getUserId } from '../../../lib/org.js';
import { checkQuotaFast, getOrgPlan } from '../../../lib/usage.js';
import { logActivity } from '../../../lib/audit.js';
import { getSql } from '../../../lib/db.js';
import crypto from 'crypto';

// Ensure invites table exists (fallback for pre-migration deploys)
let _tableChecked = false;
async function ensureTable(sql) {
  if (_tableChecked) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS invites (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'member',
        token TEXT UNIQUE NOT NULL,
        invited_by TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        accepted_by TEXT,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_invites_org_id ON invites(org_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status)`;
    _tableChecked = true;
  } catch {
    _tableChecked = true;
  }
}

const VALID_ROLES = ['admin', 'member'];

function requireAdmin(request) {
  const orgId = getOrgId(request);
  const role = getOrgRole(request);
  const userId = getUserId(request);
  if (orgId === 'org_default') {
    return { error: NextResponse.json({ error: 'Complete onboarding first', needsOnboarding: true }, { status: 403 }) };
  }
  if (role !== 'admin') {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  }
  return { orgId, userId };
}

// POST /api/team/invite - Create invite link (admin only)
export async function POST(request) {
  try {
    const auth = requireAdmin(request);
    if (auth.error) return auth.error;
    const { orgId, userId } = auth;

    const body = await request.json();
    const email = body.email ? String(body.email).trim().toLowerCase() : null;
    const role = body.role && VALID_ROLES.includes(body.role) ? body.role : 'member';

    // Basic email validation if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const sql = getSql();
    await ensureTable(sql);

    // Quota check: members (fast meter path)
    const plan = await getOrgPlan(orgId, sql);
    const membersQuota = await checkQuotaFast(orgId, 'members', plan, sql);
    if (!membersQuota.allowed) {
      return NextResponse.json(
        { error: 'Team member limit reached. Upgrade your plan.', code: 'QUOTA_EXCEEDED', usage: membersQuota.usage, limit: membersQuota.limit },
        { status: 402 }
      );
    }

    const inviteId = `inv_${crypto.randomUUID()}`;
    const token = crypto.randomBytes(32).toString('hex'); // 64 hex chars
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    await sql`
      INSERT INTO invites (id, org_id, email, role, token, invited_by, status, expires_at, created_at)
      VALUES (${inviteId}, ${orgId}, ${email}, ${role}, ${token}, ${userId}, 'pending', ${expiresAt}, ${now})
    `;

    // SECURITY: Use NEXTAUTH_URL as canonical origin to prevent header injection phishing.
    // Falls back to request URL origin only as a last resort.
    const origin = process.env.NEXTAUTH_URL
      ? new URL(process.env.NEXTAUTH_URL).origin
      : new URL(request.url).origin;
    const inviteUrl = `${origin}/invite/${token}`;

    logActivity({
      orgId, actorId: userId, action: 'invite.created',
      resourceType: 'invite', resourceId: inviteId,
      details: { email, role }, request,
    }, sql);

    return NextResponse.json({
      invite: {
        id: inviteId,
        token,
        email,
        role,
        expires_at: expiresAt,
        invite_url: inviteUrl,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Team invite POST error:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}

// GET /api/team/invite - List pending invites (admin only)
export async function GET(request) {
  try {
    const auth = requireAdmin(request);
    if (auth.error) return auth.error;
    const { orgId } = auth;

    const sql = getSql();
    await ensureTable(sql);

    const invites = await sql`
      SELECT id, email, role, status, expires_at, created_at
      FROM invites
      WHERE org_id = ${orgId}
        AND status = 'pending'
        AND expires_at::timestamptz > NOW()
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ invites });
  } catch (error) {
    console.error('Team invite GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
}

// DELETE /api/team/invite?id=inv_xxx - Revoke invite (admin only)
export async function DELETE(request) {
  try {
    const auth = requireAdmin(request);
    if (auth.error) return auth.error;
    const { orgId } = auth;

    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get('id');

    if (!inviteId || !inviteId.startsWith('inv_')) {
      return NextResponse.json({ error: 'Valid invite id is required' }, { status: 400 });
    }

    const sql = getSql();
    await ensureTable(sql);

    const existing = await sql`
      SELECT id, status FROM invites WHERE id = ${inviteId} AND org_id = ${orgId}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }
    if (existing[0].status !== 'pending') {
      return NextResponse.json({ error: 'Invite is not pending' }, { status: 409 });
    }

    await sql`
      UPDATE invites SET status = 'revoked' WHERE id = ${inviteId} AND org_id = ${orgId}
    `;

    logActivity({
      orgId, actorId: auth.userId, action: 'invite.revoked',
      resourceType: 'invite', resourceId: inviteId, request,
    }, sql);

    return NextResponse.json({ success: true, revoked: inviteId });
  } catch (error) {
    console.error('Team invite DELETE error:', error);
    return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 });
  }
}
