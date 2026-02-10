export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getOrgId } from '../../../lib/org.js';
import { randomUUID } from 'node:crypto';

export async function GET(request) {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const orgId = getOrgId(request);
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const conditions = ['org_id = $1'];
    const params = [orgId];
    let idx = 2;

    if (agentId) { conditions.push(`agent_id = $${idx}`); params.push(agentId); idx++; }
    if (status) { conditions.push(`status = $${idx}`); params.push(status); idx++; }

    const where = conditions.join(' AND ');
    const rows = await sql.query(
      `SELECT * FROM context_threads WHERE ${where} ORDER BY updated_at DESC LIMIT $${idx}`,
      [...params, limit]
    );

    return NextResponse.json({ threads: rows, total: rows.length });
  } catch (error) {
    console.error('Context threads GET error:', error);
    return NextResponse.json({ error: 'An error occurred while fetching threads' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const orgId = getOrgId(request);
    const body = await request.json();

    const { name, summary, agent_id } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const id = `ct_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const now = new Date().toISOString();

    const result = await sql`
      INSERT INTO context_threads (id, org_id, agent_id, name, summary, status, created_at, updated_at)
      VALUES (${id}, ${orgId}, ${agent_id || null}, ${name}, ${summary || null}, 'active', ${now}, ${now})
      ON CONFLICT (org_id, COALESCE(agent_id, ''), name)
      DO UPDATE SET summary = COALESCE(EXCLUDED.summary, context_threads.summary), status = 'active', updated_at = ${now}
      RETURNING *
    `;

    return NextResponse.json({ thread: result[0], thread_id: result[0].id }, { status: 201 });
  } catch (error) {
    console.error('Context threads POST error:', error);
    return NextResponse.json({ error: 'An error occurred while creating thread' }, { status: 500 });
  }
}
