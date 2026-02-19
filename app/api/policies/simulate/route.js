export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getSql } from '../../../lib/db.js';
import { getOrgId } from '../../../lib/org.js';
import { evaluatePolicy } from '../../../lib/guard.js';

/**
 * POST /api/policies/simulate — Dry-run a policy against historical actions.
 * Body: { policy_type, rules (Object), days? }
 */
export async function POST(request) {
  try {
    const sql = getSql();
    const orgId = getOrgId(request);
    const body = await request.json();

    const { policy_type, rules, days = 7 } = body;

    if (!policy_type || !rules) {
      return NextResponse.json({ error: 'policy_type and rules are required' }, { status: 400 });
    }

    // Fetch historical actions
    // Limit to 200 actions to avoid overloading the simulation (especially for semantic/behavioral checks)
    const actions = await sql`
      SELECT action_id, agent_id, agent_name, action_type, declared_goal, risk_score, 
             systems_touched, reversible, timestamp_start, status
      FROM action_records
      WHERE org_id = ${orgId}
        AND timestamp_start::timestamptz > NOW() - INTERVAL '1 day' * ${parseInt(days, 10)}
      ORDER BY timestamp_start DESC
      LIMIT 200
    `;

    if (actions.length === 0) {
      return NextResponse.json({
        summary: { total: 0, matches: 0, block: 0, warn: 0, require_approval: 0, allow: 0 },
        matches: [],
        message: 'No historical actions found in the specified window.'
      });
    }

    const simulationResults = [];
    const counts = { total: actions.length, matches: 0, block: 0, warn: 0, require_approval: 0, allow: 0 };

    const dummyPolicy = { id: 'sim_1', name: 'Simulation Policy', policy_type };

    // Run evaluations
    for (const action of actions) {
      const context = {
        ...action,
        // Ensure systems_touched is parsed if it's a string from DB
        systems_touched: typeof action.systems_touched === 'string' ? JSON.parse(action.systems_touched) : action.systems_touched
      };

      const result = await evaluatePolicy(dummyPolicy, rules, context, sql, orgId);
      
      if (result && result.action !== 'allow') {
        counts.matches++;
        counts[result.action]++;
        simulationResults.push({
          action_id: action.action_id,
          goal: action.declared_goal,
          agent_name: action.agent_name || action.agent_id,
          timestamp: action.timestamp_start,
          original_status: action.status,
          simulated_action: result.action,
          simulated_reason: result.reason
        });
      } else {
        counts.allow++;
      }
    }

    return NextResponse.json({
      summary: counts,
      matches: simulationResults,
      sample_size: actions.length,
      window_days: days
    });
  } catch (err) {
    console.error('[POLICIES/SIMULATE] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
