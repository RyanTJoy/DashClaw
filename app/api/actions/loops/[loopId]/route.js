export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

let _sql;
function getSql() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  _sql = neon(url);
  return _sql;
}

export async function GET(request, { params }) {
  try {
    const sql = getSql();
    const { loopId } = await params;

    const loops = await sql`
      SELECT ol.*, ar.agent_id, ar.agent_name, ar.declared_goal, ar.action_type, ar.status as action_status
      FROM open_loops ol
      LEFT JOIN action_records ar ON ol.action_id = ar.action_id
      WHERE ol.loop_id = ${loopId}
    `;

    if (loops.length === 0) {
      return NextResponse.json({ error: 'Open loop not found' }, { status: 404 });
    }

    return NextResponse.json({ loop: loops[0] });
  } catch (error) {
    console.error('Loop detail GET error:', error);
    return NextResponse.json({ error: 'An error occurred while fetching the loop' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const sql = getSql();
    const { loopId } = await params;
    const body = await request.json();

    // Only allow status + resolution updates
    const { status, resolution } = body;

    if (!status || !['resolved', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'status is required and must be "resolved" or "cancelled"' },
        { status: 400 }
      );
    }

    if (status === 'resolved' && !resolution) {
      return NextResponse.json(
        { error: 'resolution is required when resolving a loop' },
        { status: 400 }
      );
    }

    if (resolution && resolution.length > 2000) {
      return NextResponse.json(
        { error: 'resolution exceeds max length of 2000' },
        { status: 400 }
      );
    }

    const existing = await sql`SELECT loop_id, status FROM open_loops WHERE loop_id = ${loopId}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Open loop not found' }, { status: 404 });
    }

    if (existing[0].status !== 'open') {
      return NextResponse.json({ error: 'Loop is already ' + existing[0].status }, { status: 409 });
    }

    const result = await sql`
      UPDATE open_loops
      SET status = ${status},
          resolution = ${resolution || null},
          resolved_at = ${new Date().toISOString()}
      WHERE loop_id = ${loopId}
      RETURNING *
    `;

    return NextResponse.json({ loop: result[0] });
  } catch (error) {
    console.error('Loop detail PATCH error:', error);
    return NextResponse.json({ error: 'An error occurred while updating the loop' }, { status: 500 });
  }
}
