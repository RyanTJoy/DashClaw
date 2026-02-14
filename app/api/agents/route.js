import { NextResponse } from 'next/server';
import { getSql } from '../../lib/db.js';
import { getOrgId } from '../../lib/org.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  try {
    const sql = getSql();
    const orgId = getOrgId(request);

    const isMissingTable = (err) =>
      String(err?.code || '').includes('42P01') || String(err?.message || '').includes('does not exist');

    const byId = new Map();

    // Primary signal: action_records (most complete metadata).
    try {
      const rows = await sql`
        SELECT agent_id, MAX(agent_name) as agent_name, COUNT(*) as action_count,
          MAX(timestamp_start) as last_active
        FROM action_records
        WHERE org_id = ${orgId}
        GROUP BY agent_id
      `;
      for (const r of (rows || [])) {
        if (!r.agent_id) continue;
        byId.set(r.agent_id, {
          agent_id: r.agent_id,
          agent_name: r.agent_name || r.agent_id,
          action_count: Number(r.action_count || 0),
          last_active: r.last_active || null,
        });
      }
    } catch (err) {
      if (!isMissingTable(err)) throw err;
    }

    // Fallbacks: include agents that only have goals/learning imported (e.g. bootstrap).
    const mergeAgent = (agentId, fields = {}) => {
      if (!agentId) return;
      const existing = byId.get(agentId) || {
        agent_id: agentId,
        agent_name: agentId,
        action_count: 0,
        last_active: null,
      };
      byId.set(agentId, { ...existing, ...fields });
    };

    try {
      const rows = await sql`
        SELECT agent_id, COUNT(*) as goal_count, MAX(created_at) as last_goal
        FROM goals
        WHERE org_id = ${orgId} AND agent_id IS NOT NULL
        GROUP BY agent_id
      `;
      for (const r of (rows || [])) {
        mergeAgent(r.agent_id, { goal_count: Number(r.goal_count || 0), last_goal: r.last_goal || null });
      }
    } catch (err) {
      if (!isMissingTable(err)) throw err;
    }

    try {
      const rows = await sql`
        SELECT agent_id, COUNT(*) as decision_count, MAX(timestamp) as last_decision
        FROM decisions
        WHERE org_id = ${orgId} AND agent_id IS NOT NULL
        GROUP BY agent_id
      `;
      for (const r of (rows || [])) {
        mergeAgent(r.agent_id, { decision_count: Number(r.decision_count || 0), last_decision: r.last_decision || null });
      }
    } catch (err) {
      if (!isMissingTable(err)) throw err;
    }

    const agents = [...byId.values()]
      .map((a) => {
        const candidates = [a.last_active, a.last_goal, a.last_decision].filter(Boolean);
        const last_active = candidates.length ? candidates.sort().slice(-1)[0] : null;
        return { ...a, last_active };
      })
      .sort((a, b) => String(b.last_active || '').localeCompare(String(a.last_active || '')));

    const url = new URL(request.url);
    const includeConnections = url.searchParams.get('include_connections') === 'true';

    if (includeConnections && agents.length > 0) {
      try {
        const connections = await sql`
          SELECT * FROM agent_connections
          WHERE org_id = ${orgId}
          ORDER BY updated_at DESC
        `;
        const connMap = {};
        for (const conn of (connections || [])) {
          if (!connMap[conn.agent_id]) connMap[conn.agent_id] = [];
          connMap[conn.agent_id].push(conn);
        }
        for (const agent of agents) {
          agent.connections = connMap[agent.agent_id] || [];
        }
      } catch (err) {
        // Table may not exist yet — attach empty arrays
        for (const agent of agents) {
          agent.connections = [];
        }
      }
    }

    return NextResponse.json({
      agents: agents || [],
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Agents API error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching agents', agents: [] },
      { status: 500 }
    );
  }
}
