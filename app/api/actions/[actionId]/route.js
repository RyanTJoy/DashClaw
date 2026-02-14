export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { validateActionOutcome } from '../../../lib/validate.js';
import { getOrgId } from '../../../lib/org.js';
import { EVENTS, publishOrgEvent } from '../../../lib/events.js';
import {
  getActionWithRelations,
  updateActionOutcome,
} from '../../../lib/repositories/actions.repository.js';

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
    const orgId = getOrgId(request);
    const { actionId } = await params;

    const result = await getActionWithRelations(sql, orgId, actionId);
    if (!result) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Action detail GET error:', error);
    return NextResponse.json({ error: 'An error occurred while fetching the action' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const sql = getSql();
    const orgId = getOrgId(request);
    const { actionId } = await params;
    const body = await request.json();

    const { valid, data, errors } = validateActionOutcome(body);
    if (!valid) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    const updatedAction = await updateActionOutcome(sql, orgId, actionId, data);
    if (!updatedAction) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    // Emit real-time event
    void publishOrgEvent(EVENTS.ACTION_UPDATED, {
      orgId,
      action: updatedAction,
    });

    return NextResponse.json({ action: updatedAction });
  } catch (error) {
    console.error('Action detail PATCH error:', error);
    return NextResponse.json({ error: 'An error occurred while updating the action' }, { status: 500 });
  }
}
