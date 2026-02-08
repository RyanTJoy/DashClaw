export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { validateActionOutcome } from '../../../lib/validate.js';
import { getOrgId } from '../../../lib/org.js';

let _sql;
function getSql() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  _sql = neon(url);
  return _sql;
}

export async function GET(request, { params }) {
  try {
    const sql = getSql();
    const orgId = getOrgId(request);
    const { actionId } = await params;

    const [actions, loops, assumptions] = await Promise.all([
      sql`SELECT * FROM action_records WHERE action_id = ${actionId} AND org_id = ${orgId}`,
      sql`SELECT * FROM open_loops WHERE action_id = ${actionId} AND org_id = ${orgId} ORDER BY created_at DESC`,
      sql`SELECT * FROM assumptions WHERE action_id = ${actionId} AND org_id = ${orgId} ORDER BY created_at DESC`
    ]);

    if (actions.length === 0) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    return NextResponse.json({
      action: actions[0],
      open_loops: loops,
      assumptions
    });
  } catch (error) {
    console.error('Action detail GET error:', error);
    return NextResponse.json({ error: 'An error occurred while fetching the action' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const sql = getSql();
    const orgId = getOrgId(request);
    const { actionId } = await params;
    const body = await request.json();

    const { valid, data, errors } = validateActionOutcome(body);
    if (!valid) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    // Check action exists
    const existing = await sql`SELECT action_id FROM action_records WHERE action_id = ${actionId} AND org_id = ${orgId}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    // Build dynamic SET clause for outcome fields only
    const setClauses = [];
    const values = [];
    let paramIdx = 1;

    if (data.status !== undefined) {
      setClauses.push(`status = $${paramIdx++}`);
      values.push(data.status);
    }
    if (data.output_summary !== undefined) {
      setClauses.push(`output_summary = $${paramIdx++}`);
      values.push(data.output_summary);
    }
    if (data.side_effects !== undefined) {
      setClauses.push(`side_effects = $${paramIdx++}`);
      values.push(JSON.stringify(data.side_effects));
    }
    if (data.artifacts_created !== undefined) {
      setClauses.push(`artifacts_created = $${paramIdx++}`);
      values.push(JSON.stringify(data.artifacts_created));
    }
    if (data.error_message !== undefined) {
      setClauses.push(`error_message = $${paramIdx++}`);
      values.push(data.error_message);
    }
    if (data.timestamp_end !== undefined) {
      setClauses.push(`timestamp_end = $${paramIdx++}`);
      values.push(data.timestamp_end);
    }
    if (data.duration_ms !== undefined) {
      setClauses.push(`duration_ms = $${paramIdx++}`);
      values.push(data.duration_ms);
    }
    if (data.cost_estimate !== undefined) {
      setClauses.push(`cost_estimate = $${paramIdx++}`);
      values.push(data.cost_estimate);
    }

    const query = `UPDATE action_records SET ${setClauses.join(', ')} WHERE action_id = $${paramIdx++} AND org_id = $${paramIdx++} RETURNING *`;
    values.push(actionId, orgId);

    const result = await sql.query(query, values);

    return NextResponse.json({ action: result[0] });
  } catch (error) {
    console.error('Action detail PATCH error:', error);
    return NextResponse.json({ error: 'An error occurred while updating the action' }, { status: 500 });
  }
}
