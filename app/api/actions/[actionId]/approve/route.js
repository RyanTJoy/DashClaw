import { NextResponse } from 'next/server';
import { getSql } from '../../../../lib/db.js';
import { getOrgId, getOrgRole, getUserId } from '../../../../lib/org.js';
import { logActivity } from '../../../../lib/audit.js';
import { EVENTS, publishOrgEvent } from '../../../../lib/events.js';

/**
 * POST /api/actions/[actionId]/approve
 * Human-in-the-loop approval handler.
 * 
 * Body: { decision: 'allow' | 'deny', reasoning?: string }
 */
export async function POST(request, { params }) {
  try {
    const { actionId } = params;
    const orgId = getOrgId(request);
    const role = getOrgRole(request);
    const userId = getUserId(request);

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required for approvals' }, { status: 403 });
    }

    const body = await request.json();
    const { decision, reasoning } = body;

    if (!['allow', 'deny'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision. Must be allow or deny.' }, { status: 400 });
    }

    const sql = getSql();

    // Verify action is in pending_approval state
    const action = await sql`
      SELECT status, agent_id FROM action_records 
      WHERE action_id = ${actionId} AND org_id = ${orgId}
      LIMIT 1
    `;

    if (action.length === 0) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    if (action[0].status !== 'pending_approval') {
      return NextResponse.json({ error: 'Action is not pending approval' }, { status: 400 });
    }

    const newStatus = decision === 'allow' ? 'running' : 'failed';
    const errorMessage = decision === 'deny' ? (reasoning || 'Denied by human operator') : null;

    const result = await sql`
      UPDATE action_records
      SET status = ${newStatus},
          error_message = ${errorMessage},
          reasoning = COALESCE(reasoning, '') || '

[HITL Decision: ' || ${decision.toUpperCase()} || ' by ' || ${userId} || ']' || 
                      CASE WHEN ${reasoning || ''} != '' THEN '
Reason: ' || ${reasoning} ELSE '' END
      WHERE action_id = ${actionId} AND org_id = ${orgId}
      RETURNING *
    `;

    logActivity({
      orgId, actorId: userId, action: `action.${decision}ed`,
      resourceType: 'action', resourceId: actionId,
      details: { decision, reasoning }, request,
    }, sql);

    // Emit event for real-time updates
    void publishOrgEvent(EVENTS.ACTION_UPDATED, {
      orgId, 
      action: result[0] 
    });

    return NextResponse.json({ 
      success: true, 
      action: result[0] 
    });

  } catch (error) {
    console.error('[APPROVAL] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
