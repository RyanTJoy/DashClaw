const TABLE_CONFIG = [
  { key: 'actions', table: 'action_records', tsCol: 'timestamp_start' },
  { key: 'decisions', table: 'decisions', tsCol: 'timestamp' },
  { key: 'lessons', table: 'lessons', tsCol: 'timestamp' },
  { key: 'content', table: 'content', tsCol: 'created_at' },
  { key: 'ideas', table: 'ideas', tsCol: 'captured_at', noAgent: true },
  { key: 'interactions', table: 'interactions', tsCol: 'created_at' },
  { key: 'goals', table: 'goals', tsCol: 'created_at' },
];

function isMissingTable(err) {
  return String(err?.code || '').includes('42P01') ||
    String(err?.message || '').includes('does not exist');
}

async function safeQuery(promise) {
  try {
    return await promise;
  } catch (err) {
    if (isMissingTable(err)) return [];
    throw err;
  }
}

/**
 * Fetch digest data across all activity tables.
 * If `date` is provided, filters to that single day.
 * Otherwise returns recent activity (most recent first, capped at 50 per category).
 */
export async function fetchDigestData(sql, orgId, { agentId, date } = {}) {
  const queries = TABLE_CONFIG.map(({ table, tsCol, noAgent }) => {
    if (date) {
      const dayStart = `${date}T00:00:00.000Z`;
      const dayEnd = `${date}T23:59:59.999Z`;
      if (agentId && !noAgent) {
        return safeQuery(sql`SELECT * FROM ${sql(table)} WHERE org_id = ${orgId} AND agent_id = ${agentId} AND ${sql(tsCol)} >= ${dayStart} AND ${sql(tsCol)} <= ${dayEnd} ORDER BY ${sql(tsCol)} DESC`);
      }
      return safeQuery(sql`SELECT * FROM ${sql(table)} WHERE org_id = ${orgId} AND ${sql(tsCol)} >= ${dayStart} AND ${sql(tsCol)} <= ${dayEnd} ORDER BY ${sql(tsCol)} DESC`);
    }
    // Recent: no date filter, limit 50
    if (agentId && !noAgent) {
      return safeQuery(sql`SELECT * FROM ${sql(table)} WHERE org_id = ${orgId} AND agent_id = ${agentId} ORDER BY ${sql(tsCol)} DESC LIMIT 50`);
    }
    return safeQuery(sql`SELECT * FROM ${sql(table)} WHERE org_id = ${orgId} ORDER BY ${sql(tsCol)} DESC LIMIT 50`);
  });

  const results = await Promise.all(queries);

  const data = {};
  TABLE_CONFIG.forEach(({ key }, i) => {
    data[key] = results[i];
  });
  return data;
}
