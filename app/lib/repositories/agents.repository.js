function isMissingTable(err) {
  return String(err?.code || '').includes('42P01') || String(err?.message || '').includes('does not exist');
}

function maxIso(a, b) {
  if (!a) return b || null;
  if (!b) return a || null;
  return String(a) > String(b) ? a : b;
}

/**
 * Build an agent list for an org without requiring action_records to exist.
 * Intended to support bootstrap/import flows where goals/decisions exist before actions.
 */
export async function listAgentsForOrg(sql, orgId) {
  const byId = new Map();

  // Primary signal: action_records (most complete metadata).
  try {
    const rows = await sql.query(
      `
        SELECT agent_id, MAX(agent_name) as agent_name, COUNT(*) as action_count,
          MAX(timestamp_start) as last_active
        FROM action_records
        WHERE org_id = $1
        GROUP BY agent_id
      `,
      [orgId]
    );
    for (const r of rows || []) {
      if (!r.agent_id) continue;
      byId.set(r.agent_id, {
        agent_id: r.agent_id,
        agent_name: r.agent_name || r.agent_id,
        action_count: Number(r.action_count || 0),
        last_active: r.last_active || null,
        last_goal: null,
        last_decision: null,
      });
    }
  } catch (err) {
    if (!isMissingTable(err)) throw err;
  }

  const mergeAgent = (agentId, fields = {}) => {
    if (!agentId) return;
    const existing = byId.get(agentId) || {
      agent_id: agentId,
      agent_name: agentId,
      action_count: 0,
      last_active: null,
      last_goal: null,
      last_decision: null,
    };
    byId.set(agentId, { ...existing, ...fields });
  };

  // Fallback: goals imported without actions.
  try {
    const rows = await sql.query(
      `
        SELECT agent_id, COUNT(*) as goal_count, MAX(created_at) as last_goal
        FROM goals
        WHERE org_id = $1 AND agent_id IS NOT NULL
        GROUP BY agent_id
      `,
      [orgId]
    );
    for (const r of rows || []) {
      mergeAgent(r.agent_id, { goal_count: Number(r.goal_count || 0), last_goal: r.last_goal || null });
    }
  } catch (err) {
    if (!isMissingTable(err)) throw err;
  }

  // Fallback: decisions imported without actions.
  try {
    const rows = await sql.query(
      `
        SELECT agent_id, COUNT(*) as decision_count, MAX(timestamp) as last_decision
        FROM decisions
        WHERE org_id = $1 AND agent_id IS NOT NULL
        GROUP BY agent_id
      `,
      [orgId]
    );
    for (const r of rows || []) {
      mergeAgent(r.agent_id, { decision_count: Number(r.decision_count || 0), last_decision: r.last_decision || null });
    }
  } catch (err) {
    if (!isMissingTable(err)) throw err;
  }

  const agents = [...byId.values()].map((a) => {
    const last_active = maxIso(a.last_active, maxIso(a.last_goal, a.last_decision));
    return {
      agent_id: a.agent_id,
      agent_name: a.agent_name || a.agent_id,
      action_count: Number(a.action_count || 0),
      last_active,
      goal_count: Number(a.goal_count || 0),
      decision_count: Number(a.decision_count || 0),
    };
  });

  agents.sort((a, b) => String(b.last_active || '').localeCompare(String(a.last_active || '')));
  return agents;
}

export async function attachAgentConnections(sql, orgId, agents) {
  if (!Array.isArray(agents) || agents.length === 0) return agents || [];

  try {
    const connections = await sql.query(
      `
        SELECT *
        FROM agent_connections
        WHERE org_id = $1
        ORDER BY updated_at DESC
      `,
      [orgId]
    );
    const connMap = {};
    for (const conn of connections || []) {
      if (!connMap[conn.agent_id]) connMap[conn.agent_id] = [];
      connMap[conn.agent_id].push(conn);
    }
    for (const agent of agents) {
      agent.connections = connMap[agent.agent_id] || [];
    }
  } catch (err) {
    if (!isMissingTable(err)) throw err;
    for (const agent of agents) agent.connections = [];
  }

  return agents;
}

