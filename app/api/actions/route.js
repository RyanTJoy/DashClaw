export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { validateActionRecord } from '../../lib/validate.js';
import { getOrgId, getOrgRole } from '../../lib/org.js';
import { checkQuotaFast, getOrgPlan, incrementMeter } from '../../lib/usage.js';
import { verifyAgentSignature } from '../../lib/identity.js';
import { estimateCost } from '../../lib/billing.js';
import { EVENTS, publishOrgEvent } from '../../lib/events.js';
import { generateActionEmbedding, isEmbeddingsEnabled } from '../../lib/embeddings.js';
import { evaluateGuard } from '../../lib/guard.js';
import {
  createActionRecord,
  hasAgentAction,
  insertActionEmbedding,
  listActions,
} from '../../lib/repositories/actions.repository.js';
import crypto from 'crypto';

let _sql;
function getSql() {
  if (_sql) return _sql;
  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL is not set in production. Connection failed.');
    }
    console.warn('[API] DATABASE_URL not set. In-memory mock driver is NO LONGER SUPPORTED. Please set DATABASE_URL.');
    // Return a dummy that fails gracefully
    return {
      query: async () => [],
      execute: async () => []
    };
  }
  _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

export async function GET(request) {
  try {
    const sql = getSql();
    const orgId = getOrgId(request);
    const { searchParams } = new URL(request.url);

    const agent_id = searchParams.get('agent_id') || undefined;
    const swarm_id = searchParams.get('swarm_id') || undefined;
    const status = searchParams.get('status') || undefined;
    const action_type = searchParams.get('action_type') || undefined;
    const risk_min = searchParams.get('risk_min') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await listActions(sql, orgId, {
      agent_id,
      swarm_id,
      status,
      action_type,
      risk_min,
      limit,
      offset,
    });

    return NextResponse.json({
      actions: result.actions,
      total: result.total,
      stats: result.stats,
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
        const existing = await hasAgentAction(sql, orgId, data.agent_id);
        if (!existing) {
          return NextResponse.json(
            { error: 'Agent limit reached. Upgrade your plan.', code: 'QUOTA_EXCEEDED', usage: agentsQuota.usage, limit: agentsQuota.limit },
            { status: 402 }
          );
        }
      } else {
        const existing = await hasAgentAction(sql, orgId, data.agent_id);
        isNewAgent = !existing;
      }
    }

    // Generate action_id if not provided
    const action_id = data.action_id || `act_${crypto.randomUUID()}`;
    const timestamp_start = data.timestamp_start || new Date().toISOString();

    // Identity Verification (MANDATORY in production)
    const signature = body._signature || null;
    let verified = false;

    if (!signature && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Signature required for action records in production' }, { status: 401 });
    }

    if (signature && data.agent_id) {
      // verify against the exact payload received (minus signature)
      const { _signature: s, ...payload } = body;
      verified = await verifyAgentSignature(orgId, data.agent_id, payload, signature, sql);
      
      if (!verified && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Invalid agent signature' }, { status: 401 });
      }
    }

    // BEHAVIOR GUARD EVALUATION
    const guardDecision = await evaluateGuard(orgId, {
      ...data,
      agent_id: data.agent_id
    }, sql);

    if (guardDecision.decision === 'block') {
      return NextResponse.json({ 
        error: 'Action blocked by policy', 
        decision: guardDecision 
      }, { status: 403 });
    }

    const isPendingApproval = guardDecision.decision === 'require_approval';
    const actionStatus = isPendingApproval ? 'pending_approval' : (data.status || 'running');

    // Auto-calculate cost if tokens are provided
    let costEstimate = data.cost_estimate || 0;
    if ((data.tokens_in || data.tokens_out) && !data.cost_estimate) {
      costEstimate = estimateCost(data.tokens_in || 0, data.tokens_out || 0, data.model);
    }

    const createdAction = await createActionRecord(sql, {
      orgId,
      action_id,
      data,
      actionStatus,
      costEstimate,
      signature,
      verified,
      timestamp_start,
    });

    // Fire-and-forget meter increments (don't block response)
    const meterUpdates = [incrementMeter(orgId, 'actions_per_month', sql)];
    if (isNewAgent) {
      meterUpdates.push(incrementMeter(orgId, 'agents', sql));
    }
    
    // Background indexing for behavioral anomaly detection
    const indexAction = async () => {
      if (!isEmbeddingsEnabled()) return;
      try {
        const embedding = await generateActionEmbedding(data);
        if (embedding) {
          await insertActionEmbedding(sql, {
            orgId,
            agentId: data.agent_id,
            actionId: action_id,
            embedding,
          });
        }
      } catch (e) {
        console.warn('[API] Background indexing failed:', e.message);
      }
    };

    Promise.all([...meterUpdates, indexAction()]).catch(() => {});

    const response = NextResponse.json({ 
      action: createdAction, 
      action_id,
      decision: guardDecision
    }, { status: isPendingApproval ? 202 : 201 });
    
    // Emit real-time event
    void publishOrgEvent(EVENTS.ACTION_CREATED, {
      orgId,
      action: createdAction,
    });

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
