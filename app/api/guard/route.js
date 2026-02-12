export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getOrgId } from '../../lib/org';
import { validateGuardInput } from '../../lib/validate';
import { evaluateGuard } from '../../lib/guard';

let _sql;
function getSql() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const { neon } = require('@neondatabase/serverless');
  _sql = neon(url);
  return _sql;
}

/**
 * POST /api/guard — Evaluate guard policies for a proposed action.
 * Returns allow/warn/block/require_approval.
 *
 * Body: { action_type, risk_score?, agent_id?, systems_touched?, reversible?, declared_goal? }
 * Query: ?include_signals=true (optional, adds live signal warnings)
 */
export async function POST(request) {
  try {
    const orgId = getOrgId(request);
    const body = await request.json();
    const { valid, data, errors } = validateGuardInput(body);

    if (!valid) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    const sql = getSql();
    const includeSignals = request.nextUrl.searchParams.get('include_signals') === 'true';

    let computeSignalsFn = null;
    if (includeSignals) {
      const { computeSignals } = await import('../../lib/signals');
      computeSignalsFn = computeSignals;
    }

    const result = await evaluateGuard(orgId, data, sql, {
      includeSignals,
      computeSignals: computeSignalsFn,
    });

    const status = (result.decision === 'block' || result.decision === 'require_approval') ? 403 : 200;
    return NextResponse.json(result, { status });
  } catch (err) {
    console.error('[GUARD] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/guard — List recent guard decisions.
 *
 * Query: ?agent_id=X&decision=block&limit=20&offset=0
 */
export async function GET(request) {
  try {
    const orgId = getOrgId(request);
    const sql = getSql();
    const { searchParams } = request.nextUrl;

    const agentId = searchParams.get('agent_id');
    const decision = searchParams.get('decision');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 1000);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const conditions = ['org_id = $1'];
    const params = [orgId];
    let idx = 2;

    if (agentId) {
      conditions.push(`agent_id = $${idx++}`);
      params.push(agentId);
    }
    if (decision) {
      conditions.push(`decision = $${idx++}`);
      params.push(decision);
    }

    const where = conditions.join(' AND ');
    const query = `SELECT * FROM guard_decisions WHERE ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const countQuery = `SELECT COUNT(*) as total FROM guard_decisions WHERE ${where}`;
    const countParams = params.slice(0, -2);

    const [decisions, countResult] = await Promise.all([
      sql.query(query, params),
      sql.query(countQuery, countParams),
    ]);

    // Stats for last 24h
    const statsRows = await sql`
      SELECT
        COUNT(*) as total_24h,
        COUNT(*) FILTER (WHERE decision = 'block') as blocks_24h,
        COUNT(*) FILTER (WHERE decision = 'warn') as warns_24h,
        COUNT(*) FILTER (WHERE decision = 'require_approval') as approvals_24h
      FROM guard_decisions
      WHERE org_id = ${orgId}
        AND created_at::timestamptz > NOW() - INTERVAL '24 hours'
    `;

    return NextResponse.json({
      decisions,
      total: parseInt(countResult[0]?.total || '0', 10),
      stats: statsRows[0] || {},
      limit,
      offset,
    });
  } catch (err) {
    console.error('[GUARD] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
