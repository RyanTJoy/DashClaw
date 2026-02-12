export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getOrgId, getOrgRole } from '../../../lib/org.js';

let _sql;
function getSql() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  _sql = neon(url);
  return _sql;
}

// GET /api/orgs/[orgId] - Get org details (admin only)
export async function GET(request, { params }) {
  try {
    const role = getOrgRole(request);
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - admin role required' }, { status: 403 });
    }

    const sql = getSql();
    const { orgId } = await params;

    // SECURITY: Only allow accessing your own org
    const callerOrgId = getOrgId(request);
    if (orgId !== callerOrgId) {
      return NextResponse.json({ error: 'Forbidden - cannot access other organizations' }, { status: 403 });
    }

    const orgs = await sql`
      SELECT * FROM organizations WHERE id = ${orgId}
    `;

    if (orgs.length === 0) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const keyCount = await sql`
      SELECT COUNT(*) as total FROM api_keys WHERE org_id = ${orgId} AND revoked_at IS NULL
    `;

    return NextResponse.json({
      organization: orgs[0],
      active_keys: parseInt(keyCount[0]?.total || '0', 10)
    });
  } catch (error) {
    console.error('Org detail GET error:', error);
    return NextResponse.json({ error: 'An error occurred while fetching the organization' }, { status: 500 });
  }
}

// PATCH /api/orgs/[orgId] - Update org details (admin only)
export async function PATCH(request, { params }) {
  try {
    const role = getOrgRole(request);
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - admin role required' }, { status: 403 });
    }

    const sql = getSql();
    const { orgId } = await params;

    // SECURITY: Only allow updating your own org
    const callerOrgId = getOrgId(request);
    if (orgId !== callerOrgId) {
      return NextResponse.json({ error: 'Forbidden - cannot access other organizations' }, { status: 403 });
    }

    const body = await request.json();

    const existing = await sql`SELECT id FROM organizations WHERE id = ${orgId}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { name, plan } = body;

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 });
      }
      if (name.length > 256) {
        return NextResponse.json({ error: 'name must be 256 characters or fewer' }, { status: 400 });
      }
    }

    if (plan !== undefined) {
      const validPlans = ['free', 'pro', 'team', 'enterprise'];
      if (!validPlans.includes(plan)) {
        return NextResponse.json({ error: `plan must be one of: ${validPlans.join(', ')}` }, { status: 400 });
      }
    }

    const result = await sql`
      UPDATE organizations
      SET name = COALESCE(${name?.trim() || null}, name),
          plan = COALESCE(${plan || null}, plan),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${orgId}
      RETURNING *
    `;

    return NextResponse.json({ organization: result[0] });
  } catch (error) {
    console.error('Org detail PATCH error:', error);
    return NextResponse.json({ error: 'An error occurred while updating the organization' }, { status: 500 });
  }
}
