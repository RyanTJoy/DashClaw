export async function listActions(sql, orgId, filters = {}) {
  const {
    agent_id,
    swarm_id,
    status,
    action_type,
    risk_min,
    limit = 50,
    offset = 0,
  } = filters;

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
  if (risk_min != null) {
    conditions.push(`risk_score >= $${paramIdx++}`);
    params.push(parseInt(risk_min, 10));
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `SELECT * FROM action_records ${where} ORDER BY timestamp_start DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
  const queryParams = [...params, limit, offset];

  const countQuery = `SELECT COUNT(*) as total FROM action_records ${where}`;
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

  const [actions, countResult, stats] = await Promise.all([
    sql.query(query, queryParams),
    sql.query(countQuery, params),
    sql.query(statsQuery, params),
  ]);

  return {
    actions,
    total: parseInt(countResult[0]?.total || '0', 10),
    stats: stats[0] || {},
  };
}

export async function hasAgentAction(sql, orgId, agentId) {
  const rows = await sql`
    SELECT 1 FROM action_records WHERE org_id = ${orgId} AND agent_id = ${agentId} LIMIT 1
  `;
  return rows.length > 0;
}

export async function createActionRecord(sql, payload) {
  const {
    orgId,
    action_id,
    data,
    actionStatus,
    costEstimate,
    signature,
    verified,
    timestamp_start,
  } = payload;

  const rows = await sql`
    INSERT INTO action_records (
      org_id, action_id, agent_id, agent_name, swarm_id, parent_action_id,
      action_type, declared_goal, reasoning, authorization_scope,
      trigger, systems_touched, input_summary,
      status, reversible, risk_score, confidence,
      recommendation_id, recommendation_applied, recommendation_override_reason,
      output_summary, side_effects, artifacts_created, error_message,
      timestamp_start, timestamp_end, duration_ms, cost_estimate,
      tokens_in, tokens_out,
      signature, verified
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
      ${actionStatus},
      ${data.reversible !== undefined ? (data.reversible ? 1 : 0) : 1},
      ${data.risk_score || 0},
      ${data.confidence || 50},
      ${data.recommendation_id || null},
      ${data.recommendation_applied ? 1 : 0},
      ${data.recommendation_override_reason || null},
      ${data.output_summary || null},
      ${JSON.stringify(data.side_effects || [])},
      ${JSON.stringify(data.artifacts_created || [])},
      ${data.error_message || null},
      ${timestamp_start},
      ${data.timestamp_end || null},
      ${data.duration_ms || null},
      ${costEstimate},
      ${data.tokens_in || 0},
      ${data.tokens_out || 0},
      ${signature},
      ${verified}
    )
    RETURNING *
  `;

  return rows[0] || null;
}

export async function insertActionEmbedding(sql, { orgId, agentId, actionId, embedding }) {
  await sql`
    INSERT INTO action_embeddings (org_id, agent_id, action_id, embedding)
    VALUES (${orgId}, ${agentId}, ${actionId}, ${JSON.stringify(embedding)}::vector)
  `;
}

export async function getActionWithRelations(sql, orgId, actionId) {
  const [actions, loops, assumptions] = await Promise.all([
    sql`SELECT * FROM action_records WHERE action_id = ${actionId} AND org_id = ${orgId}`,
    sql`SELECT * FROM open_loops WHERE action_id = ${actionId} AND org_id = ${orgId} ORDER BY created_at DESC`,
    sql`SELECT * FROM assumptions WHERE action_id = ${actionId} AND org_id = ${orgId} ORDER BY created_at DESC`,
  ]);

  if (actions.length === 0) return null;
  return {
    action: actions[0],
    open_loops: loops,
    assumptions,
  };
}

export async function updateActionOutcome(sql, orgId, actionId, outcome) {
  const existing = await sql`SELECT action_id FROM action_records WHERE action_id = ${actionId} AND org_id = ${orgId}`;
  if (existing.length === 0) return null;

  const setClauses = [];
  const values = [];
  let paramIdx = 1;

  if (outcome.status !== undefined) {
    setClauses.push(`status = $${paramIdx++}`);
    values.push(outcome.status);
  }
  if (outcome.output_summary !== undefined) {
    setClauses.push(`output_summary = $${paramIdx++}`);
    values.push(outcome.output_summary);
  }
  if (outcome.side_effects !== undefined) {
    setClauses.push(`side_effects = $${paramIdx++}`);
    values.push(JSON.stringify(outcome.side_effects));
  }
  if (outcome.artifacts_created !== undefined) {
    setClauses.push(`artifacts_created = $${paramIdx++}`);
    values.push(JSON.stringify(outcome.artifacts_created));
  }
  if (outcome.error_message !== undefined) {
    setClauses.push(`error_message = $${paramIdx++}`);
    values.push(outcome.error_message);
  }
  if (outcome.timestamp_end !== undefined) {
    setClauses.push(`timestamp_end = $${paramIdx++}`);
    values.push(outcome.timestamp_end);
  }
  if (outcome.duration_ms !== undefined) {
    setClauses.push(`duration_ms = $${paramIdx++}`);
    values.push(outcome.duration_ms);
  }
  if (outcome.cost_estimate !== undefined) {
    setClauses.push(`cost_estimate = $${paramIdx++}`);
    values.push(outcome.cost_estimate);
  }

  const query = `UPDATE action_records SET ${setClauses.join(', ')} WHERE action_id = $${paramIdx++} AND org_id = $${paramIdx++} RETURNING *`;
  values.push(actionId, orgId);

  const updated = await sql.query(query, values);
  return updated[0] || null;
}
