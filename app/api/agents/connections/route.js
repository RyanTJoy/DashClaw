export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';
import { getOrgId } from '../../../lib/org.js';

let _sql;
function getSql() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  _sql = neon(url);
  return _sql;
}

const VALID_AUTH_TYPES = ['api_key', 'subscription', 'oauth', 'pre_configured', 'environment'];
const VALID_STATUSES = ['active', 'inactive', 'error'];

async function ensureConnectionsTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS agent_connections (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL DEFAULT 'org_default',
      agent_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      auth_type TEXT NOT NULL DEFAULT 'api_key',
      plan_name TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      metadata TEXT,
      reported_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS agent_connections_org_agent_provider_unique
    ON agent_connections (org_id, agent_id, provider)
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_agent_connections_agent_id ON agent_connections(agent_id)`;
}

export async function GET(request) {
  try {
    const sql = getSql();
    const orgId = getOrgId(request);

    await ensureConnectionsTable(sql);

    const url = new URL(request.url);
    const agentId = url.searchParams.get('agent_id');
    const provider = url.searchParams.get('provider');

    let query = 'SELECT * FROM agent_connections WHERE org_id = $1';
    const params = [orgId];
    let paramIdx = 2;

    if (agentId) {
      query += ` AND agent_id = $${paramIdx}`;
      params.push(agentId);
      paramIdx++;
    }
    if (provider) {
      query += ` AND provider = $${paramIdx}`;
      params.push(provider);
      paramIdx++;
    }

    query += ' ORDER BY updated_at DESC';

    const connections = await sql.query(query, params);

    return NextResponse.json({
      connections: connections || [],
      total: connections?.length || 0
    });
  } catch (error) {
    console.error('Agent connections GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent connections' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const sql = getSql();
    const orgId = getOrgId(request);
    const body = await request.json();

    const { agent_id, connections } = body;

    if (!agent_id || typeof agent_id !== 'string' || agent_id.length > 128) {
      return NextResponse.json({ error: 'agent_id is required and must be <= 128 chars' }, { status: 400 });
    }
    if (!Array.isArray(connections) || connections.length === 0) {
      return NextResponse.json({ error: 'connections array is required and must not be empty' }, { status: 400 });
    }
    if (connections.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 connections per request' }, { status: 400 });
    }

    await ensureConnectionsTable(sql);

    const now = new Date().toISOString();
    const results = [];
    const errors = [];

    for (const conn of connections) {
      if (!conn.provider || typeof conn.provider !== 'string' || conn.provider.length > 128) {
        errors.push({ provider: conn.provider, error: 'provider is required and must be <= 128 chars' });
        continue;
      }
      if (conn.auth_type && !VALID_AUTH_TYPES.includes(conn.auth_type)) {
        errors.push({ provider: conn.provider, error: `auth_type must be one of: ${VALID_AUTH_TYPES.join(', ')}` });
        continue;
      }
      if (conn.status && !VALID_STATUSES.includes(conn.status)) {
        errors.push({ provider: conn.provider, error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
        continue;
      }
      if (conn.plan_name && (typeof conn.plan_name !== 'string' || conn.plan_name.length > 256)) {
        errors.push({ provider: conn.provider, error: 'plan_name must be <= 256 chars' });
        continue;
      }

      const id = `conn_${crypto.randomUUID()}`;
      const authType = conn.auth_type || 'api_key';
      const status = conn.status || 'active';
      const planName = conn.plan_name || null;
      const metadataRaw = conn.metadata ? (typeof conn.metadata === 'string' ? conn.metadata : JSON.stringify(conn.metadata)) : null;
      if (metadataRaw && metadataRaw.length > 10000) {
        errors.push({ provider: conn.provider, error: 'metadata too large (max 10KB)' });
        continue;
      }
      const metadata = metadataRaw;

      const row = await sql`
        INSERT INTO agent_connections (id, org_id, agent_id, provider, auth_type, plan_name, status, metadata, reported_at, updated_at)
        VALUES (${id}, ${orgId}, ${agent_id}, ${conn.provider}, ${authType}, ${planName}, ${status}, ${metadata}, ${now}, ${now})
        ON CONFLICT (org_id, agent_id, provider) DO UPDATE SET
          auth_type = EXCLUDED.auth_type,
          plan_name = EXCLUDED.plan_name,
          status = EXCLUDED.status,
          metadata = EXCLUDED.metadata,
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `;
      results.push(row[0]);
    }

    return NextResponse.json({
      connections: results,
      errors: errors.length > 0 ? errors : undefined,
      created: results.length
    });
  } catch (error) {
    console.error('Agent connections POST error:', error);
    return NextResponse.json(
      { error: 'Failed to save agent connections' },
      { status: 500 }
    );
  }
}
