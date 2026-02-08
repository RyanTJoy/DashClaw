export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

let _sql;
function getSql() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  _sql = neon(url);
  return _sql;
}

export async function GET() {
  try {
    const sql = getSql();

    // Run all signal queries in parallel
    const [autonomySpikes, highImpact, repeatedFailures, staleLoops, assumptionDrift, staleAssumptions] = await Promise.all([
      // Autonomy spikes: >10 actions in the last hour per agent
      sql`
        SELECT agent_id, agent_name, COUNT(*) as action_count
        FROM action_records
        WHERE timestamp_start::timestamptz > NOW() - INTERVAL '1 hour'
        GROUP BY agent_id, agent_name
        HAVING COUNT(*) > 10
        ORDER BY action_count DESC
      `,
      // High-impact low-oversight: irreversible + high risk + no authorization scope
      sql`
        SELECT action_id, agent_id, agent_name, declared_goal, risk_score, action_type
        FROM action_records
        WHERE reversible = 0
          AND risk_score >= 70
          AND (authorization_scope IS NULL OR authorization_scope = '')
          AND status = 'running'
        ORDER BY risk_score DESC
        LIMIT 10
      `,
      // Repeated failures: >3 failures in last 24h per agent
      sql`
        SELECT agent_id, agent_name, COUNT(*) as failure_count
        FROM action_records
        WHERE status = 'failed'
          AND timestamp_start::timestamptz > NOW() - INTERVAL '24 hours'
        GROUP BY agent_id, agent_name
        HAVING COUNT(*) > 3
        ORDER BY failure_count DESC
      `,
      // Stale open loops: open for more than 48 hours
      sql`
        SELECT ol.loop_id, ol.description, ol.priority, ol.loop_type, ol.created_at,
               ar.agent_id, ar.agent_name, ar.declared_goal
        FROM open_loops ol
        LEFT JOIN action_records ar ON ol.action_id = ar.action_id
        WHERE ol.status = 'open'
          AND ol.created_at < NOW() - INTERVAL '48 hours'
        ORDER BY ol.created_at ASC
        LIMIT 10
      `,
      // Assumption drift: agents with multiple invalidations in 7 days
      sql`
        SELECT ar.agent_id, ar.agent_name, COUNT(*) as invalidation_count
        FROM assumptions a
        LEFT JOIN action_records ar ON a.action_id = ar.action_id
        WHERE a.invalidated = 1
          AND a.invalidated_at IS NOT NULL
          AND a.invalidated_at::timestamptz > NOW() - INTERVAL '7 days'
        GROUP BY ar.agent_id, ar.agent_name
        HAVING COUNT(*) >= 2
        ORDER BY invalidation_count DESC
      `,
      // Stale assumptions: unvalidated for more than 14 days
      sql`
        SELECT a.assumption_id, a.assumption, a.created_at, a.action_id,
               ar.agent_id, ar.agent_name
        FROM assumptions a
        LEFT JOIN action_records ar ON a.action_id = ar.action_id
        WHERE a.validated = 0
          AND a.invalidated = 0
          AND a.created_at < NOW() - INTERVAL '14 days'
        ORDER BY a.created_at ASC
        LIMIT 10
      `
    ]);

    const signals = [];

    // Process autonomy spikes
    for (const spike of autonomySpikes) {
      signals.push({
        type: 'autonomy_spike',
        severity: parseInt(spike.action_count, 10) > 20 ? 'red' : 'amber',
        label: `Autonomy spike: ${spike.agent_name || spike.agent_id}`,
        detail: `${spike.action_count} actions in the last hour`,
        agent_id: spike.agent_id
      });
    }

    // Process high-impact low-oversight
    for (const action of highImpact) {
      signals.push({
        type: 'high_impact_low_oversight',
        severity: parseInt(action.risk_score, 10) >= 90 ? 'red' : 'amber',
        label: `Unscoped high-risk action`,
        detail: `${action.agent_name || action.agent_id}: ${action.declared_goal} (risk: ${action.risk_score})`,
        agent_id: action.agent_id,
        action_id: action.action_id
      });
    }

    // Process repeated failures
    for (const fail of repeatedFailures) {
      signals.push({
        type: 'repeated_failures',
        severity: parseInt(fail.failure_count, 10) > 5 ? 'red' : 'amber',
        label: `Repeated failures: ${fail.agent_name || fail.agent_id}`,
        detail: `${fail.failure_count} failures in the last 24 hours`,
        agent_id: fail.agent_id
      });
    }

    // Process stale open loops
    for (const loop of staleLoops) {
      const hoursOld = Math.round((Date.now() - new Date(loop.created_at).getTime()) / (1000 * 60 * 60));
      signals.push({
        type: 'stale_loop',
        severity: hoursOld > 96 ? 'red' : 'amber',
        label: `Stale loop (${hoursOld}h)`,
        detail: `${loop.description}`,
        agent_id: loop.agent_id,
        loop_id: loop.loop_id
      });
    }

    // Process assumption drift (multiple invalidations in 7 days)
    for (const drift of assumptionDrift) {
      signals.push({
        type: 'assumption_drift',
        severity: parseInt(drift.invalidation_count, 10) >= 4 ? 'red' : 'amber',
        label: `Assumption drift: ${drift.agent_name || drift.agent_id}`,
        detail: `${drift.invalidation_count} assumptions invalidated in 7 days`,
        agent_id: drift.agent_id
      });
    }

    // Process stale assumptions (unvalidated >14 days)
    for (const asm of staleAssumptions) {
      const daysOld = Math.round((Date.now() - new Date(asm.created_at).getTime()) / (1000 * 60 * 60 * 24));
      signals.push({
        type: 'stale_assumption',
        severity: daysOld > 30 ? 'red' : 'amber',
        label: `Stale assumption (${daysOld}d)`,
        detail: `${asm.assumption}`,
        agent_id: asm.agent_id,
        assumption_id: asm.assumption_id
      });
    }

    // Sort: red first, then amber
    signals.sort((a, b) => {
      if (a.severity === 'red' && b.severity !== 'red') return -1;
      if (a.severity !== 'red' && b.severity === 'red') return 1;
      return 0;
    });

    return NextResponse.json({
      signals,
      counts: {
        red: signals.filter(s => s.severity === 'red').length,
        amber: signals.filter(s => s.severity === 'amber').length,
        total: signals.length
      },
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Risk Signals API error:', error);
    return NextResponse.json(
      { error: 'An error occurred while computing risk signals', signals: [], counts: { red: 0, amber: 0, total: 0 } },
      { status: 500 }
    );
  }
}
