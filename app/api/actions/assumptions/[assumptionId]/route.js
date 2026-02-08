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
    const { assumptionId } = await params;

    const assumptions = await sql`
      SELECT a.*, ar.agent_id, ar.agent_name, ar.declared_goal, ar.action_type, ar.status as action_status
      FROM assumptions a
      LEFT JOIN action_records ar ON a.action_id = ar.action_id
      WHERE a.assumption_id = ${assumptionId}
    `;

    if (assumptions.length === 0) {
      return NextResponse.json({ error: 'Assumption not found' }, { status: 404 });
    }

    return NextResponse.json({ assumption: assumptions[0] });
  } catch (error) {
    console.error('Assumption detail GET error:', error);
    return NextResponse.json({ error: 'An error occurred while fetching the assumption' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const sql = getSql();
    const { assumptionId } = await params;
    const body = await request.json();

    const { validated, invalidated_reason } = body;

    if (validated !== true && validated !== false) {
      return NextResponse.json(
        { error: 'validated is required and must be a boolean' },
        { status: 400 }
      );
    }

    // Invalidating requires a reason
    if (validated === false && (!invalidated_reason || typeof invalidated_reason !== 'string' || invalidated_reason.trim().length === 0)) {
      return NextResponse.json(
        { error: 'invalidated_reason is required when invalidating an assumption' },
        { status: 400 }
      );
    }

    if (invalidated_reason && invalidated_reason.length > 2000) {
      return NextResponse.json(
        { error: 'invalidated_reason exceeds max length of 2000' },
        { status: 400 }
      );
    }

    const existing = await sql`SELECT assumption_id, validated, invalidated FROM assumptions WHERE assumption_id = ${assumptionId}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Assumption not found' }, { status: 404 });
    }

    if (existing[0].invalidated === 1) {
      return NextResponse.json({ error: 'Assumption is already invalidated' }, { status: 409 });
    }

    const now = new Date().toISOString();

    if (validated === true) {
      // Validate the assumption
      const result = await sql`
        UPDATE assumptions
        SET validated = 1,
            validated_at = ${now}
        WHERE assumption_id = ${assumptionId}
        RETURNING *
      `;
      return NextResponse.json({ assumption: result[0] });
    } else {
      // Invalidate the assumption
      const result = await sql`
        UPDATE assumptions
        SET invalidated = 1,
            invalidated_reason = ${invalidated_reason.trim()},
            invalidated_at = ${now}
        WHERE assumption_id = ${assumptionId}
        RETURNING *
      `;
      return NextResponse.json({ assumption: result[0] });
    }
  } catch (error) {
    console.error('Assumption detail PATCH error:', error);
    return NextResponse.json({ error: 'An error occurred while updating the assumption' }, { status: 500 });
  }
}
