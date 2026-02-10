export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getOrgId, getOrgRole, getUserId } from '../../../lib/org.js';

let _sql;
function getSql() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const { neon } = require('@neondatabase/serverless');
  _sql = neon(url);
  return _sql;
}

const VALID_ROLES = ['admin', 'member'];

// PATCH /api/team/[userId] - Change member role (admin only)
export async function PATCH(request, { params }) {
  try {
    const orgId = getOrgId(request);
    const callerRole = getOrgRole(request);
    const callerId = getUserId(request);

    if (orgId === 'org_default') {
      return NextResponse.json({ error: 'Complete onboarding first', needsOnboarding: true }, { status: 403 });
    }
    if (callerRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId } = await params;
    if (!userId || !userId.startsWith('usr_')) {
      return NextResponse.json({ error: 'Valid user id is required' }, { status: 400 });
    }

    const body = await request.json();
    const newRole = body.role;
    if (!newRole || !VALID_ROLES.includes(newRole)) {
      return NextResponse.json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
    }

    const sql = getSql();

    // Verify target user is in the same org
    const targetUser = await sql`
      SELECT id, role FROM users WHERE id = ${userId} AND org_id = ${orgId}
    `;
    if (targetUser.length === 0) {
      return NextResponse.json({ error: 'User not found in this workspace' }, { status: 404 });
    }

    // Guard: cannot leave org with zero admins
    if (targetUser[0].role === 'admin' && newRole === 'member') {
      const adminCount = await sql`
        SELECT COUNT(*) as count FROM users WHERE org_id = ${orgId} AND role = 'admin'
      `;
      if (parseInt(adminCount[0].count) <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last admin. Promote another member to admin first.' },
          { status: 409 }
        );
      }
    }

    await sql`
      UPDATE users SET role = ${newRole} WHERE id = ${userId} AND org_id = ${orgId}
    `;

    return NextResponse.json({ success: true, userId, role: newRole });
  } catch (error) {
    console.error('Team member PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 });
  }
}

// DELETE /api/team/[userId] - Remove member from org (admin only)
// Also supports ?action=leave for self-removal
export async function DELETE(request, { params }) {
  try {
    const orgId = getOrgId(request);
    const callerRole = getOrgRole(request);
    const callerId = getUserId(request);

    if (orgId === 'org_default') {
      return NextResponse.json({ error: 'Complete onboarding first', needsOnboarding: true }, { status: 403 });
    }

    const { userId } = await params;
    if (!userId || !userId.startsWith('usr_')) {
      return NextResponse.json({ error: 'Valid user id is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const isSelfLeave = userId === callerId && action === 'leave';

    // Self-leave: any member can leave, admin check not needed
    // Admin remove: only admins can remove others
    if (!isSelfLeave) {
      if (callerRole !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
      if (userId === callerId) {
        return NextResponse.json(
          { error: 'Cannot remove yourself. Use the Leave Workspace button instead.' },
          { status: 409 }
        );
      }
    }

    const sql = getSql();

    // Verify target user is in the same org
    const targetUser = await sql`
      SELECT id, role FROM users WHERE id = ${userId} AND org_id = ${orgId}
    `;
    if (targetUser.length === 0) {
      return NextResponse.json({ error: 'User not found in this workspace' }, { status: 404 });
    }

    // Guard: cannot remove/leave as last admin
    if (targetUser[0].role === 'admin') {
      const adminCount = await sql`
        SELECT COUNT(*) as count FROM users WHERE org_id = ${orgId} AND role = 'admin'
      `;
      if (parseInt(adminCount[0].count) <= 1) {
        return NextResponse.json(
          { error: isSelfLeave ? 'Cannot leave as the last admin. Promote another member first.' : 'Cannot remove the last admin.' },
          { status: 409 }
        );
      }
    }

    // Move user back to org_default with role member
    await sql`
      UPDATE users SET org_id = 'org_default', role = 'member' WHERE id = ${userId}
    `;

    return NextResponse.json({ success: true, removed: userId });
  } catch (error) {
    console.error('Team member DELETE error:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
