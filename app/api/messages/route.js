export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getOrgId } from '../../lib/org.js';
import { enforceFieldLimits } from '../../lib/validate.js';
import { getSql } from '../../lib/db.js';
import { scanSensitiveData } from '../../lib/security.js';
import {
  archiveMessage,
  createMessage,
  getMessageForUpdate,
  getMessageThread,
  getUnreadMessageCount,
  listMessages,
  markMessageRead,
  touchMessageThread,
  updateMessageReadBy,
} from '../../lib/repositories/messagesContext.repository.js';
import { EVENTS, publishOrgEvent } from '../../lib/events.js';
import { randomUUID } from 'node:crypto';

const VALID_TYPES = ['action', 'info', 'lesson', 'question', 'status'];

export async function GET(request) {
  try {
    const sql = getSql();
    const orgId = getOrgId(request);
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id');
    const direction = searchParams.get('direction') || 'inbox';
    const type = searchParams.get('type');
    const unread = searchParams.get('unread');
    const threadId = searchParams.get('thread_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 1000);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const rows = await listMessages(sql, orgId, {
      agentId,
      direction,
      type,
      unread: unread === 'true',
      threadId,
      limit,
      offset,
    });

    const unreadCount = await getUnreadMessageCount(sql, orgId, agentId || null);

    return NextResponse.json({ messages: rows, total: rows.length, unread_count: unreadCount });
  } catch (error) {
    console.error('Messages GET error:', error);
    return NextResponse.json({ error: 'An error occurred while fetching messages' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const sql = getSql();
    const orgId = getOrgId(request);
    const body = await request.json();

    const { ok, errors: fieldErrors } = enforceFieldLimits(body, { subject: 200, body: 2000 });
    if (!ok) {
      return NextResponse.json({ error: 'Validation failed', details: fieldErrors }, { status: 400 });
    }

    const { from_agent_id, to_agent_id, message_type, subject, body: msgBodyRaw, thread_id, urgent, doc_ref } = body;

    if (!msgBodyRaw) {
      return NextResponse.json({ error: 'body is required' }, { status: 400 });
    }

    const { redacted } = scanSensitiveData(msgBodyRaw);
    const msgBody = redacted;

    if (!from_agent_id) {
      return NextResponse.json({ error: 'from_agent_id is required' }, { status: 400 });
    }

    const msgType = message_type || 'info';
    if (!VALID_TYPES.includes(msgType)) {
      return NextResponse.json({ error: `message_type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
    }

    if (thread_id) {
      if (thread_id.startsWith('ct_')) {
        return NextResponse.json({
          error: 'Invalid thread type: context threads (ct_*) cannot be used for messaging. Use createMessageThread() to create a message thread (mt_*).',
        }, { status: 400 });
      }
      const thread = await getMessageThread(sql, orgId, thread_id);
      if (!thread) {
        return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
      }
      if (thread.status !== 'open') {
        return NextResponse.json({ error: 'Thread is not open' }, { status: 400 });
      }
    }

    const id = `msg_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const now = new Date().toISOString();

    const created = await createMessage(sql, {
      id,
      orgId,
      thread_id,
      from_agent_id,
      to_agent_id,
      message_type: msgType,
      subject,
      body: msgBody,
      urgent,
      doc_ref,
      now,
    });

    if (thread_id) {
      await touchMessageThread(sql, thread_id, now);
    }

    // Emit real-time event
    void publishOrgEvent(EVENTS.MESSAGE_CREATED, {
      orgId,
      message: created,
    });

    return NextResponse.json({ message: created, message_id: id }, { status: 201 });
  } catch (error) {
    console.error('Messages POST error:', error);
    return NextResponse.json({ error: 'An error occurred while sending message' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const sql = getSql();
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
        const msg = await getMessageForUpdate(sql, orgId, msgId);
        if (!msg) continue;

        if (msg.to_agent_id === null) {
          let readBy = [];
          try {
            const parsed = JSON.parse(msg.read_by || '[]');
            readBy = Array.isArray(parsed) ? parsed : [];
          } catch {
            readBy = [];
          }

          if (!readBy.includes(readerId)) {
            readBy.push(readerId);
            await updateMessageReadBy(sql, msgId, readBy);
            updated++;
          }
        } else if (readerId === 'dashboard' || msg.to_agent_id === readerId) {
          await markMessageRead(sql, msgId, now);
          updated++;
        }
      }
    } else {
      for (const msgId of message_ids) {
        const archived = await archiveMessage(sql, orgId, msgId, now);
        if (archived) updated++;
      }
    }

    return NextResponse.json({ updated });
  } catch (error) {
    console.error('Messages PATCH error:', error);
    return NextResponse.json({ error: 'An error occurred while updating messages' }, { status: 500 });
  }
}
