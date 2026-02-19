export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getSql } from '../../../lib/db.js';
import { getOrgId } from '../../../lib/org.js';
import { EVENTS, publishOrgEvent } from '../../../lib/events.js';

/**
 * POST /api/agents/heartbeat — Report agent presence and health.
 * Body: { agent_id, agent_name?, status, current_task_id?, metadata? }
 */
export async function POST(request) {
  try {
    const sql = getSql();
    const orgId = getOrgId(request);
    const body = await request.json();

    const { agent_id, agent_name, status = 'online', current_task_id, metadata } = body;

    if (!agent_id) {
      return NextResponse.json({ error: 'agent_id is required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Upsert presence record
    // Note: We use a separate table to keep the main action_records clean and performant.
    await sql`
      INSERT INTO agent_presence (
        org_id, agent_id, agent_name, status, current_task_id, 
        last_heartbeat_at, metadata, updated_at
      ) VALUES (
        ${orgId}, ${agent_id}, ${agent_name || null}, ${status}, ${current_task_id || null}, 
        ${now}, ${JSON.stringify(metadata || {})}, ${now}
      )
      ON CONFLICT (org_id, agent_id) DO UPDATE SET
        agent_name = EXCLUDED.agent_name,
        status = EXCLUDED.status,
        current_task_id = EXCLUDED.current_task_id,
        last_heartbeat_at = EXCLUDED.last_heartbeat_at,
        metadata = EXCLUDED.metadata,
        updated_at = EXCLUDED.updated_at
    `;

    // Optionally emit a real-time presence event
    void publishOrgEvent('agent.heartbeat', {
      orgId,
      agent_id,
      status,
      last_heartbeat_at: now,
      current_task_id
    });

    return NextResponse.json({ status: 'ok', timestamp: now });
  } catch (error) {
    if (error.message?.includes('does not exist')) {
      // Auto-create table if missing (DashClaw's lazy migration pattern)
      try {
        const sql = getSql();
        await sql`
          CREATE TABLE IF NOT EXISTS agent_presence (
            org_id TEXT NOT NULL,
            agent_id TEXT NOT NULL,
            agent_name TEXT,
            status TEXT DEFAULT 'online',
            current_task_id TEXT,
            last_heartbeat_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (org_id, agent_id)
          )
        `;
        // Retry the original request logic once would be better, but for brevity:
        return NextResponse.json({ error: 'Table initialized. Please retry.', code: 'RETRY' }, { status: 503 });
      } catch (setupErr) {
        console.error('[Heartbeat] Failed to create table:', setupErr);
      }
    }
    console.error('[Heartbeat] API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
