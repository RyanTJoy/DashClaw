export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getOrgId } from '../../lib/org.js';
import { randomUUID } from 'node:crypto';

const VALID_TYPES = ['action', 'info', 'lesson', 'question', 'status'];

export async function GET(request) {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const orgId = getOrgId(request);
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id');
    const direction = searchParams.get('direction') || 'inbox';
    const type = searchParams.get('type');
    const unread = searchParams.get('unread');
    const threadId = searchParams.get('thread_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

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
        // all: messages involving this agent
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

    if (unread === 'true') {
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

    // Get unread count (for specific agent or all)
    let unreadCount = 0;
    if (agentId) {
      const countResult = await sql.query(
        `SELECT COUNT(*)::int as count FROM agent_messages WHERE org_id = $1 AND (to_agent_id = $2 OR to_agent_id IS NULL) AND from_agent_id != $2 AND status = 'sent'`,
        [orgId, agentId]
      );
      unreadCount = countResult[0]?.count || 0;
    } else {
      const countResult = await sql`
        SELECT COUNT(*)::int as count FROM agent_messages WHERE org_id = ${orgId} AND status = 'sent'
      `;
      unreadCount = countResult[0]?.count || 0;
    }

    return NextResponse.json({ messages: rows, total: rows.length, unread_count: unreadCount });
  } catch (error) {
    console.error('Messages GET error:', error);
    return NextResponse.json({ error: 'An error occurred while fetching messages' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const orgId = getOrgId(request);
    const body = await request.json();

    const { from_agent_id, to_agent_id, message_type, subject, body: msgBody, thread_id, urgent, doc_ref } = body;

    if (!msgBody) {
      return NextResponse.json({ error: 'body is required' }, { status: 400 });
    }
    if (msgBody.length > 2000) {
      return NextResponse.json({ error: 'body must be 2000 characters or less' }, { status: 400 });
    }
    if (!from_agent_id) {
      return NextResponse.json({ error: 'from_agent_id is required' }, { status: 400 });
    }
    if (subject && subject.length > 200) {
      return NextResponse.json({ error: 'subject must be 200 characters or less' }, { status: 400 });
    }
    const msgType = message_type || 'info';
    if (!VALID_TYPES.includes(msgType)) {
      return NextResponse.json({ error: `message_type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
    }

    // If thread_id provided, verify thread exists, is open, and belongs to same org
    if (thread_id) {
      const thread = await sql`SELECT id, status FROM message_threads WHERE id = ${thread_id} AND org_id = ${orgId}`;
      if (thread.length === 0) {
        return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
      }
      if (thread[0].status !== 'open') {
        return NextResponse.json({ error: 'Thread is not open' }, { status: 400 });
      }
    }

    const id = `msg_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const now = new Date().toISOString();

    const result = await sql`
      INSERT INTO agent_messages (id, org_id, thread_id, from_agent_id, to_agent_id, message_type, subject, body, urgent, status, doc_ref, read_by, created_at)
      VALUES (
        ${id}, ${orgId}, ${thread_id || null}, ${from_agent_id}, ${to_agent_id || null},
        ${msgType}, ${subject || null}, ${msgBody}, ${urgent || false}, 'sent',
        ${doc_ref || null}, ${to_agent_id ? null : '[]'}, ${now}
      )
      RETURNING *
    `;

    // Update thread updated_at if in a thread
    if (thread_id) {
      await sql`UPDATE message_threads SET updated_at = ${now} WHERE id = ${thread_id}`;
    }

    return NextResponse.json({ message: result[0], message_id: id }, { status: 201 });
  } catch (error) {
    console.error('Messages POST error:', error);
    return NextResponse.json({ error: 'An error occurred while sending message' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const orgId = getOrgId(request);
    const body = await request.json();

    const { message_ids, action, agent_id } = body;

    if (!message_ids || !Array.isArray(message_ids) || message_ids.length === 0) {
      return NextResponse.json({ error: 'message_ids array is required' }, { status: 400 });
    }
    if (!action || !['read', 'archive'].includes(action)) {
      return NextResponse.json({ error: 'action must be "read" or "archive"' }, { status: 400 });
    }
    const now = new Date().toISOString();
    let updated = 0;

    if (action === 'read') {
      const readerId = agent_id || 'dashboard';
      for (const msgId of message_ids) {
        // For direct messages: set read_at + status
        // For broadcasts: append to read_by JSON array
        const msg = await sql`SELECT id, to_agent_id, read_by FROM agent_messages WHERE id = ${msgId} AND org_id = ${orgId}`;
        if (msg.length === 0) continue;

        if (msg[0].to_agent_id === null) {
          // Broadcast — append to read_by
          let readBy = [];
          try {
            const parsed = JSON.parse(msg[0].read_by || '[]');
            readBy = Array.isArray(parsed) ? parsed : [];
          } catch { readBy = []; }
          if (!readBy.includes(readerId)) {
            readBy.push(readerId);
            await sql`UPDATE agent_messages SET read_by = ${JSON.stringify(readBy)} WHERE id = ${msgId}`;
            updated++;
          }
        } else if (readerId === 'dashboard' || msg[0].to_agent_id === readerId) {
          // Direct message — dashboard can mark any, agents only their own
          await sql`UPDATE agent_messages SET status = 'read', read_at = ${now} WHERE id = ${msgId} AND status = 'sent'`;
          updated++;
        }
      }
    } else {
      // Archive
      for (const msgId of message_ids) {
        const result = await sql`
          UPDATE agent_messages SET status = 'archived', archived_at = ${now}
          WHERE id = ${msgId} AND org_id = ${orgId} AND status != 'archived'
          RETURNING id
        `;
        if (result.length > 0) updated++;
      }
    }

    return NextResponse.json({ updated });
  } catch (error) {
    console.error('Messages PATCH error:', error);
    return NextResponse.json({ error: 'An error occurred while updating messages' }, { status: 500 });
  }
}
