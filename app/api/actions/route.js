export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { validateActionRecord } from '../../lib/validate.js';
import { getOrgId, getOrgRole } from '../../lib/org.js';
import { checkQuotaFast, getOrgPlan, incrementMeter } from '../../lib/billing.js';
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

    const agent_id = searchParams.get('agent_id');
    const swarm_id = searchParams.get('swarm_id');
    const status = searchParams.get('status');
    const action_type = searchParams.get('action_type');
    const risk_min = searchParams.get('risk_min');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build filtered query
    let paramIdx = 1;
    const conditions = [`org_id = $${paramIdx++}`];
    const params = [orgId];

    if (agent_id) {
      conditions.push(`agent_id = $${paramIdx++}`);
      params.push(agent_id);
    }
    if (swarm_id) {
      conditions.push(`swarm_id = $${paramIdx++}`);
      params.push(swarm_id);
    }
    if (status) {
      conditions.push(`status = $${paramIdx++}`);
      params.push(status);
    }
    if (action_type) {
      conditions.push(`action_type = $${paramIdx++}`);
      params.push(action_type);
    }
    if (risk_min) {
      conditions.push(`risk_score >= $${paramIdx++}`);
      params.push(parseInt(risk_min, 10));
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Use raw SQL string since neon tagged templates don't support dynamic WHERE
    const query = `SELECT * FROM action_records ${where} ORDER BY timestamp_start DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const countQuery = `SELECT COUNT(*) as total FROM action_records ${where}`;
    const countParams = params.slice(0, -2);

    const [actions, countResult] = await Promise.all([
      sql.query(query, params),
      sql.query(countQuery, countParams)
    ]);

    // Stats aggregation (uses same filters as list query)
    const statsQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'running') as running,
        COUNT(*) FILTER (WHERE risk_score >= 70) as high_risk,
        COALESCE(AVG(risk_score), 0) as avg_risk,
        COALESCE(SUM(cost_estimate), 0) as total_cost
      FROM action_records ${where}
    `;
    const stats = await sql.query(statsQuery, countParams);

    return NextResponse.json({
      actions,
      total: parseInt(countResult[0]?.total || '0', 10),
      stats: stats[0] || {},
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Actions API GET error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching actions', actions: [], stats: {} },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const sql = getSql();
    const orgId = getOrgId(request);
    const body = await request.json();

    const { valid, data, errors } = validateActionRecord(body);
    if (!valid) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    // Quota check: actions per month (fast meter path)
    const plan = await getOrgPlan(orgId, sql);
    const actionsQuota = await checkQuotaFast(orgId, 'actions_per_month', plan, sql);
    if (!actionsQuota.allowed) {
      return NextResponse.json(
        { error: 'Monthly action limit exceeded. Upgrade your plan.', code: 'QUOTA_EXCEEDED', usage: actionsQuota.usage, limit: actionsQuota.limit },
        { status: 402 }
      );
    }

    // Quota check: agents (only block new agent_ids)
    let isNewAgent = false;
    if (data.agent_id) {
      const agentsQuota = await checkQuotaFast(orgId, 'agents', plan, sql);
      if (!agentsQuota.allowed) {
        // Check if this agent already exists (existing agents are allowed)
        const existing = await sql`
          SELECT 1 FROM action_records WHERE org_id = ${orgId} AND agent_id = ${data.agent_id} LIMIT 1
        `;
        if (existing.length === 0) {
          return NextResponse.json(
            { error: 'Agent limit reached. Upgrade your plan.', code: 'QUOTA_EXCEEDED', usage: agentsQuota.usage, limit: agentsQuota.limit },
            { status: 402 }
          );
        }
      } else {
        // Check if this is a new agent for meter increment
        const existing = await sql`
          SELECT 1 FROM action_records WHERE org_id = ${orgId} AND agent_id = ${data.agent_id} LIMIT 1
        `;
        isNewAgent = existing.length === 0;
      }
    }

    // Generate action_id if not provided
    const action_id = data.action_id || `act_${crypto.randomUUID()}`;
    const timestamp_start = data.timestamp_start || new Date().toISOString();

    const result = await sql`
      INSERT INTO action_records (
        org_id, action_id, agent_id, agent_name, swarm_id, parent_action_id,
        action_type, declared_goal, reasoning, authorization_scope,
        trigger, systems_touched, input_summary,
        status, reversible, risk_score, confidence,
        output_summary, side_effects, artifacts_created, error_message,
        timestamp_start, timestamp_end, duration_ms, cost_estimate
      ) VALUES (
        ${orgId},
        ${action_id},
        ${data.agent_id},
        ${data.agent_name || null},
        ${data.swarm_id || null},
        ${data.parent_action_id || null},
        ${data.action_type},
        ${data.declared_goal},
        ${data.reasoning || null},
        ${data.authorization_scope || null},
        ${data.trigger || null},
        ${JSON.stringify(data.systems_touched || [])},
        ${data.input_summary || null},
        ${data.status || 'running'},
        ${data.reversible !== undefined ? (data.reversible ? 1 : 0) : 1},
        ${data.risk_score || 0},
        ${data.confidence || 50},
        ${data.output_summary || null},
        ${JSON.stringify(data.side_effects || [])},
        ${JSON.stringify(data.artifacts_created || [])},
        ${data.error_message || null},
        ${timestamp_start},
        ${data.timestamp_end || null},
        ${data.duration_ms || null},
        ${data.cost_estimate || 0}
      )
      RETURNING *
    `;

    // Fire-and-forget meter increments (don't block response)
    const meterUpdates = [incrementMeter(orgId, 'actions_per_month', sql)];
    if (isNewAgent) {
      meterUpdates.push(incrementMeter(orgId, 'agents', sql));
    }
    Promise.all(meterUpdates).catch(() => {});

    const response = NextResponse.json({ action: result[0], action_id }, { status: 201 });
    if (actionsQuota.warning) {
      response.headers.set('x-quota-warning', `actions_per_month at ${actionsQuota.percent}%`);
    }
    return response;
  } catch (error) {
    console.error('Actions API POST error:', error);
    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
      return NextResponse.json({ error: 'Action with this action_id already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'An error occurred while creating the action' }, { status: 500 });
  }
}

/**
 * DELETE /api/actions — Delete actions by filter (admin only).
 *
 * Query params (at least one required):
 *   ?before=2026-02-01   — delete actions with timestamp_start before this date
 *   ?agent_id=X          — scope to a specific agent
 *   ?status=completed    — scope to a specific status
 *   ?action_id=act_xxx   — delete a single action by ID
 */
export async function DELETE(request) {
  try {
    const sql = getSql();
    const orgId = getOrgId(request);
    const role = getOrgRole(request);

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const before = searchParams.get('before');
    const agentId = searchParams.get('agent_id');
    const status = searchParams.get('status');
    const actionId = searchParams.get('action_id');

    // Single action deletion
    if (actionId) {
      // Also clean up related loops + assumptions
      await sql`DELETE FROM open_loops WHERE action_id = ${actionId} AND org_id = ${orgId}`;
      await sql`DELETE FROM assumptions WHERE action_id = ${actionId} AND org_id = ${orgId}`;
      const result = await sql`DELETE FROM action_records WHERE action_id = ${actionId} AND org_id = ${orgId} RETURNING action_id`;
      return NextResponse.json({ deleted: result.length, action_ids: result.map(r => r.action_id) });
    }

    // Bulk deletion requires at least one filter to prevent accidental wipe
    if (!before && !agentId && !status) {
      return NextResponse.json({ error: 'At least one filter required: before, agent_id, or status' }, { status: 400 });
    }

    let paramIdx = 1;
    const conditions = [`org_id = $${paramIdx++}`];
    const params = [orgId];

    if (before) {
      conditions.push(`timestamp_start::timestamptz < $${paramIdx++}::timestamptz`);
      params.push(before);
    }
    if (agentId) {
      conditions.push(`agent_id = $${paramIdx++}`);
      params.push(agentId);
    }
    if (status) {
      conditions.push(`status = $${paramIdx++}`);
      params.push(status);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    // Clean up related loops + assumptions first
    await sql.query(
      `DELETE FROM open_loops WHERE org_id = $1 AND action_id IN (SELECT action_id FROM action_records ${where})`,
      params
    );
    await sql.query(
      `DELETE FROM assumptions WHERE org_id = $1 AND action_id IN (SELECT action_id FROM action_records ${where})`,
      params
    );

    const result = await sql.query(
      `DELETE FROM action_records ${where} RETURNING action_id`,
      params
    );

    return NextResponse.json({ deleted: result.length });
  } catch (error) {
    console.error('Actions API DELETE error:', error);
    return NextResponse.json({ error: 'An error occurred while deleting actions' }, { status: 500 });
  }
}
