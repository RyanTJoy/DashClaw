export async function listMessages(sql, orgId, filters = {}) {
  const {
    agentId,
    direction = 'inbox',
    type,
    unread,
    threadId,
    limit = 50,
    offset = 0,
  } = filters;

  const conditions = ['org_id = $1'];
  const params = [orgId];
  let idx = 2;

  if (agentId) {
    if (direction === 'sent') {
      conditions.push(`from_agent_id = $${idx}`);
      params.push(agentId);
      idx++;
    } else if (direction === 'inbox') {
      conditions.push(`(to_agent_id = $${idx} OR to_agent_id IS NULL)`);
      params.push(agentId);
      idx++;
      conditions.push(`from_agent_id != $${idx}`);
      params.push(agentId);
      idx++;
    } else {
      conditions.push(`(from_agent_id = $${idx} OR to_agent_id = $${idx} OR to_agent_id IS NULL)`);
      params.push(agentId);
      idx++;
    }
  }

  if (direction === 'inbox') {
    conditions.push("status != 'archived'");
  }
  if (type) {
    conditions.push(`message_type = $${idx}`);
    params.push(type);
    idx++;
  }
  if (unread === true) {
    conditions.push("status = 'sent'");
  }
  if (threadId) {
    conditions.push(`thread_id = $${idx}`);
    params.push(threadId);
    idx++;
  }

  const where = conditions.join(' AND ');
  const rows = await sql.query(
    `SELECT * FROM agent_messages WHERE ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );

  return rows;
}

export async function getUnreadMessageCount(sql, orgId, agentId = null) {
  if (agentId) {
    const countResult = await sql.query(
      `SELECT COUNT(*)::int as count FROM agent_messages WHERE org_id = $1 AND (to_agent_id = $2 OR to_agent_id IS NULL) AND from_agent_id != $2 AND status = 'sent'`,
      [orgId, agentId]
    );
    return countResult[0]?.count || 0;
  }

  const countResult = await sql`
    SELECT COUNT(*)::int as count FROM agent_messages WHERE org_id = ${orgId} AND status = 'sent'
  `;
  return countResult[0]?.count || 0;
}

export async function getMessageThread(sql, orgId, threadId) {
  const rows = await sql`SELECT id, status FROM message_threads WHERE id = ${threadId} AND org_id = ${orgId}`;
  return rows[0] || null;
}

export async function createMessage(sql, payload) {
  const {
    id,
    orgId,
    thread_id,
    from_agent_id,
    to_agent_id,
    message_type,
    subject,
    body,
    urgent,
    doc_ref,
    now,
  } = payload;

  const rows = await sql`
    INSERT INTO agent_messages (id, org_id, thread_id, from_agent_id, to_agent_id, message_type, subject, body, urgent, status, doc_ref, read_by, created_at)
    VALUES (
      ${id}, ${orgId}, ${thread_id || null}, ${from_agent_id}, ${to_agent_id || null},
      ${message_type}, ${subject || null}, ${body}, ${urgent || false}, 'sent',
      ${doc_ref || null}, ${to_agent_id ? null : '[]'}, ${now}
    )
    RETURNING *
  `;
  return rows[0] || null;
}

export async function touchMessageThread(sql, threadId, now) {
  await sql`UPDATE message_threads SET updated_at = ${now} WHERE id = ${threadId}`;
}

export async function getMessageForUpdate(sql, orgId, messageId) {
  const rows = await sql`SELECT id, to_agent_id, read_by FROM agent_messages WHERE id = ${messageId} AND org_id = ${orgId}`;
  return rows[0] || null;
}

export async function updateMessageReadBy(sql, messageId, readBy) {
  await sql`UPDATE agent_messages SET read_by = ${JSON.stringify(readBy)} WHERE id = ${messageId}`;
}

export async function markMessageRead(sql, messageId, now) {
  await sql`UPDATE agent_messages SET status = 'read', read_at = ${now} WHERE id = ${messageId} AND status = 'sent'`;
}

export async function archiveMessage(sql, orgId, messageId, now) {
  const rows = await sql`
    UPDATE agent_messages SET status = 'archived', archived_at = ${now}
    WHERE id = ${messageId} AND org_id = ${orgId} AND status != 'archived'
    RETURNING id
  `;
  return rows.length > 0;
}

export async function listContextThreads(sql, orgId, filters = {}) {
  const { agentId, status, limit = 20 } = filters;
  const conditions = ['org_id = $1'];
  const params = [orgId];
  let idx = 2;

  if (agentId) {
    conditions.push(`agent_id = $${idx}`);
    params.push(agentId);
    idx++;
  }
  if (status) {
    conditions.push(`status = $${idx}`);
    params.push(status);
    idx++;
  }

  const where = conditions.join(' AND ');
  return sql.query(
    `SELECT * FROM context_threads WHERE ${where} ORDER BY updated_at DESC LIMIT $${idx}`,
    [...params, limit]
  );
}

export async function upsertContextThread(sql, payload) {
  const { id, orgId, agent_id, name, summary, now } = payload;
  const rows = await sql`
    INSERT INTO context_threads (id, org_id, agent_id, name, summary, status, created_at, updated_at)
    VALUES (${id}, ${orgId}, ${agent_id || null}, ${name}, ${summary || null}, 'active', ${now}, ${now})
    ON CONFLICT (org_id, COALESCE(agent_id, ''), name)
    DO UPDATE SET summary = COALESCE(EXCLUDED.summary, context_threads.summary), status = 'active', updated_at = ${now}
    RETURNING *
  `;
  return rows[0] || null;
}
