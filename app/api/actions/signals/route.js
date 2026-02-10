export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getOrgId } from '../../../lib/org.js';

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
    const filterAgentId = searchParams.get('agent_id');

    // Run all signal queries in parallel
    const [autonomySpikes, highImpact, repeatedFailures, staleLoops, assumptionDrift, staleAssumptions, staleRunning] = await Promise.all([
      // Autonomy spikes: >10 actions in the last hour per agent
      sql`
        SELECT agent_id, agent_name, COUNT(*) as action_count
        FROM action_records
        WHERE timestamp_start::timestamptz > NOW() - INTERVAL '1 hour'
          AND org_id = ${orgId}
        GROUP BY agent_id, agent_name
        HAVING COUNT(*) > 10
        ORDER BY action_count DESC
      `,
      // High-impact low-oversight: irreversible + high risk + no authorization scope
      sql`
        SELECT action_id, agent_id, agent_name, declared_goal, risk_score, action_type
        FROM action_records
        WHERE reversible = 0
          AND org_id = ${orgId}
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
          AND org_id = ${orgId}
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
          AND ol.org_id = ${orgId}
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
          AND a.org_id = ${orgId}
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
          AND a.org_id = ${orgId}
          AND a.invalidated = 0
          AND a.created_at < NOW() - INTERVAL '14 days'
        ORDER BY a.created_at ASC
        LIMIT 10
      `,
      // Stale running actions: status=running for >4 hours
      sql`
        SELECT action_id, agent_id, agent_name, declared_goal, timestamp_start, risk_score
        FROM action_records
        WHERE status = 'running'
          AND org_id = ${orgId}
          AND timestamp_start::timestamptz < NOW() - INTERVAL '4 hours'
        ORDER BY timestamp_start ASC
        LIMIT 10
      `
    ]);

    const signals = [];

    // Process autonomy spikes
    for (const spike of autonomySpikes) {
      signals.push({
        type: 'autonomy_spike',
        severity: parseInt(spike.action_count, 10) > 20 ? 'red' : 'amber',
        label: `Autonomy spike: ${spike.agent_name || spike.agent_id} (${spike.action_count} actions/hr)`,
        detail: `This agent performed ${spike.action_count} actions in the last hour, which is above the threshold of 10.`,
        help: 'High action frequency may indicate runaway behavior. Review recent actions and consider throttling.',
        agent_id: spike.agent_id
      });
    }

    // Process high-impact low-oversight
    for (const action of highImpact) {
      signals.push({
        type: 'high_impact_low_oversight',
        severity: parseInt(action.risk_score, 10) >= 90 ? 'red' : 'amber',
        label: `Unscoped high-risk action: ${action.declared_goal?.substring(0, 50) || 'Unknown'}`,
        detail: `${action.agent_name || action.agent_id} is running an irreversible action (risk: ${action.risk_score}) without authorization scope.`,
        help: 'High-risk irreversible actions should have explicit authorization_scope set. Review and add oversight.',
        agent_id: action.agent_id,
        action_id: action.action_id
      });
    }

    // Process repeated failures
    for (const fail of repeatedFailures) {
      signals.push({
        type: 'repeated_failures',
        severity: parseInt(fail.failure_count, 10) > 5 ? 'red' : 'amber',
        label: `Repeated failures: ${fail.agent_name || fail.agent_id} (${fail.failure_count} in 24h)`,
        detail: `This agent has failed ${fail.failure_count} times in the last 24 hours, which is above the threshold of 3.`,
        help: 'Repeated failures suggest a systematic issue. Check error messages and recent code changes.',
        agent_id: fail.agent_id
      });
    }

    // Process stale open loops
    for (const loop of staleLoops) {
      const hoursOld = Math.round((Date.now() - new Date(loop.created_at).getTime()) / (1000 * 60 * 60));
      signals.push({
        type: 'stale_loop',
        severity: hoursOld > 96 ? 'red' : 'amber',
        label: `Stale open loop (${hoursOld}h): ${loop.description?.substring(0, 50) || 'Unknown'}`,
        detail: `Open loop for ${loop.agent_name || loop.agent_id || 'unknown agent'} has been unresolved for ${hoursOld} hours.`,
        help: 'Stale loops indicate blocked work. Resolve or cancel the loop to unblock the agent.',
        agent_id: loop.agent_id,
        loop_id: loop.loop_id
      });
    }

    // Process assumption drift (multiple invalidations in 7 days)
    for (const drift of assumptionDrift) {
      signals.push({
        type: 'assumption_drift',
        severity: parseInt(drift.invalidation_count, 10) >= 4 ? 'red' : 'amber',
        label: `Assumption drift: ${drift.agent_name || drift.agent_id} (${drift.invalidation_count} invalidated)`,
        detail: `${drift.invalidation_count} assumptions invalidated in the last 7 days, indicating the agent's model of the environment may be outdated.`,
        help: 'Frequent assumption invalidations suggest changing conditions. Review agent configuration and data sources.',
        agent_id: drift.agent_id
      });
    }

    // Process stale assumptions (unvalidated >14 days)
    for (const asm of staleAssumptions) {
      const daysOld = Math.round((Date.now() - new Date(asm.created_at).getTime()) / (1000 * 60 * 60 * 24));
      signals.push({
        type: 'stale_assumption',
        severity: daysOld > 30 ? 'red' : 'amber',
        label: `Stale assumption (${daysOld}d): ${asm.assumption?.substring(0, 50) || 'Unknown'}`,
        detail: `This assumption has not been validated for ${daysOld} days and may no longer be accurate.`,
        help: 'Unvalidated assumptions can lead to incorrect decisions. Validate or invalidate to keep the knowledge base current.',
        agent_id: asm.agent_id,
        assumption_id: asm.assumption_id
      });
    }

    // Process stale running actions (>4 hours)
    for (const action of staleRunning) {
      const hoursRunning = Math.round((Date.now() - new Date(action.timestamp_start).getTime()) / (1000 * 60 * 60));
      signals.push({
        type: 'stale_running_action',
        severity: hoursRunning > 24 ? 'red' : 'amber',
        label: `Stale running action (${hoursRunning}h): ${action.declared_goal?.substring(0, 60) || 'Unknown goal'}`,
        detail: `${action.agent_name || action.agent_id} has had this action running for ${hoursRunning} hours. Consider checking if it's stuck or should be marked as completed/failed.`,
        help: 'Actions running for extended periods may indicate a stuck process. Check the agent logs or manually update the action status.',
        agent_id: action.agent_id,
        action_id: action.action_id
      });
    }

    // Post-filter by agent_id if requested
    const filteredSignals = filterAgentId
      ? signals.filter(s => s.agent_id === filterAgentId)
      : signals;

    // Sort: red first, then amber
    filteredSignals.sort((a, b) => {
      if (a.severity === 'red' && b.severity !== 'red') return -1;
      if (a.severity !== 'red' && b.severity === 'red') return 1;
      return 0;
    });

    return NextResponse.json({
      signals: filteredSignals,
      counts: {
        red: filteredSignals.filter(s => s.severity === 'red').length,
        amber: filteredSignals.filter(s => s.severity === 'amber').length,
        total: filteredSignals.length
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
