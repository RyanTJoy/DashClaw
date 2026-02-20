export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getSql } from '../../../lib/db.js';
import { getOrgId } from '../../../lib/org.js';

/**
 * GET /api/swarm/link?source=ID&target=ID
 * Returns shared activity and messages between two agents.
 */
export async function GET(request) {
  try {
    const sql = getSql();
    const orgId = getOrgId(request);
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    const target = searchParams.get('target');

    if (!source || !target) {
      return NextResponse.json({ error: 'source and target agent IDs are required' }, { status: 400 });
    }

    // Query A: Shared Actions (Actions within 10 minutes of each other)
    const sharedActions = await sql`
      SELECT a.id as action_id, a.agent_id, a.action_type, a.status, a.risk_score, a.timestamp_start, a.status_reason
      FROM action_records a
      WHERE a.org_id = ${orgId}
        AND a.agent_id IN (${source}, ${target})
        AND EXISTS (
          SELECT 1 FROM action_records b
          WHERE b.org_id = a.org_id
            AND b.agent_id != a.agent_id
            AND b.agent_id IN (${source}, ${target})
            AND ABS(EXTRACT(EPOCH FROM (b.timestamp_start - a.timestamp_start))) < 600
        )
      ORDER BY a.timestamp_start DESC
      LIMIT 50
    `;

    // Query B: Direct Messages
    const messages = await sql`
      SELECT id as message_id, from_agent_id as sender_agent_id, to_agent_id as recipient_agent_id, body as content, created_at, thread_id
      FROM agent_messages
      WHERE org_id = ${orgId}
        AND (
          (from_agent_id = ${source} AND to_agent_id = ${target})
          OR
          (from_agent_id = ${target} AND to_agent_id = ${source})
        )
      ORDER BY created_at DESC
      LIMIT 30
    `;

    return NextResponse.json({
      source,
      target,
      shared_actions: sharedActions || [],
      messages: messages || []
    });
  } catch (error) {
    console.error('[SWARM] Link API error:', error);
    return NextResponse.json({ error: 'Failed to fetch link context' }, { status: 500 });
  }
}
