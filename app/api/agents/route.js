export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getOrgId } from '../../lib/org.js';

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

    const agents = await sql`
      SELECT agent_id, MAX(agent_name) as agent_name, COUNT(*) as action_count,
        MAX(timestamp_start) as last_active
      FROM action_records
      WHERE org_id = ${orgId}
      GROUP BY agent_id
      ORDER BY last_active DESC
    `;

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
