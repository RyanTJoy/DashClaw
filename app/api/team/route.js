export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getOrgId, getUserId } from '../../lib/org.js';

let _sql;
function getSql() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const { neon } = require('@neondatabase/serverless');
  _sql = neon(url);
  return _sql;
}

// GET /api/team - List members + org info for caller's org
export async function GET(request) {
  try {
    const orgId = getOrgId(request);
    if (orgId === 'org_default') {
      return NextResponse.json(
        { error: 'Complete onboarding to manage your team', needsOnboarding: true },
        { status: 403 }
      );
    }

    const sql = getSql();

    const [orgRows, members] = await Promise.all([
      sql`SELECT id, name, slug, plan FROM organizations WHERE id = ${orgId}`,
      sql`
        SELECT id, email, name, image, role, created_at, last_login_at
        FROM users
        WHERE org_id = ${orgId}
        ORDER BY created_at ASC
      `,
    ]);

    const org = orgRows.length > 0 ? orgRows[0] : null;
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const userId = getUserId(request);

    return NextResponse.json({
      org,
      members: members.map((m) => ({
        ...m,
        is_self: m.id === userId,
      })),
      member_count: members.length,
    });
  } catch (error) {
    console.error('Team API GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  }
}
