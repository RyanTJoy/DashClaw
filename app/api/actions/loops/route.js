export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { validateOpenLoop } from '../../../lib/validate.js';
import { getOrgId } from '../../../lib/org.js';
import crypto from 'crypto';

let _sql;
function getSql() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  _sql = neon(url);
  return _sql;
}

export async function GET(request) {
  try {
    const sql = getSql();
    const orgId = getOrgId(request);
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const loop_type = searchParams.get('loop_type');
    const priority = searchParams.get('priority');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const agent_id = searchParams.get('agent_id');

    let paramIdx = 1;
    const conditions = [`ol.org_id = $${paramIdx++}`];
    const params = [orgId];

    if (status) {
      conditions.push(`ol.status = $${paramIdx++}`);
      params.push(status);
    }
    if (loop_type) {
      conditions.push(`ol.loop_type = $${paramIdx++}`);
      params.push(loop_type);
    }
    if (priority) {
      conditions.push(`ol.priority = $${paramIdx++}`);
      params.push(priority);
    }
    if (agent_id) {
      conditions.push(`ar.agent_id = $${paramIdx++}`);
      params.push(agent_id);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT ol.*, ar.agent_id, ar.agent_name, ar.declared_goal, ar.action_type
      FROM open_loops ol
      LEFT JOIN action_records ar ON ol.action_id = ar.action_id
      ${where}
      ORDER BY
        CASE ol.priority
          WHEN 'critical' THEN 0
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END,
        ol.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;
    params.push(limit, offset);

    const countQuery = `SELECT COUNT(*) as total FROM open_loops ol ${where}`;
    const countParams = params.slice(0, -2);

    const [loops, countResult, stats] = await Promise.all([
      sql.query(query, params),
      sql.query(countQuery, countParams),
      sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'open') as open_count,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
          COUNT(*) FILTER (WHERE priority = 'critical' AND status = 'open') as critical_open,
          COUNT(*) FILTER (WHERE priority = 'high' AND status = 'open') as high_open
        FROM open_loops
        WHERE org_id = ${orgId}
      `
    ]);

    return NextResponse.json({
      loops,
      total: parseInt(countResult[0]?.total || '0', 10),
      stats: stats[0] || {},
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Open Loops API GET error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching open loops', loops: [], stats: {} },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const sql = getSql();
    const orgId = getOrgId(request);
    const body = await request.json();

    const { valid, data, errors } = validateOpenLoop(body);
    if (!valid) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    // Verify parent action exists
    const action = await sql`SELECT action_id FROM action_records WHERE action_id = ${data.action_id} AND org_id = ${orgId}`;
    if (action.length === 0) {
      return NextResponse.json({ error: 'Parent action not found' }, { status: 404 });
    }

    const loop_id = data.loop_id || `loop_${crypto.randomUUID()}`;

    const result = await sql`
      INSERT INTO open_loops (
        org_id, loop_id, action_id, loop_type, description,
        status, priority, owner
      ) VALUES (
        ${orgId},
        ${loop_id},
        ${data.action_id},
        ${data.loop_type},
        ${data.description},
        ${data.status || 'open'},
        ${data.priority || 'medium'},
        ${data.owner || null}
      )
      RETURNING *
    `;

    return NextResponse.json({ loop: result[0], loop_id }, { status: 201 });
  } catch (error) {
    console.error('Open Loops API POST error:', error);
    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
      return NextResponse.json({ error: 'Loop with this loop_id already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'An error occurred while creating the open loop' }, { status: 500 });
  }
}
