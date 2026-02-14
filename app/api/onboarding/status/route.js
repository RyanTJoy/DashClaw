export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getSql as getDbSql } from '../../../lib/db.js';

let _sql;
function getSql() {
  if (_sql) return _sql;
  _sql = getDbSql();
  return _sql;
}

// GET /api/onboarding/status — derive onboarding state from existing data
export async function GET(request) {
  try {
    const userId = request.headers.get('x-user-id');
    
    // DEV BYPASS
    if (process.env.NODE_ENV === 'development' && userId === 'dev_user') {
      return NextResponse.json({
        onboarding_required: false, // Don't show onboarding in dev
        steps: {
          workspace_created: true,
          api_key_exists: true,
          first_action_sent: true,
        },
        org_id: 'org_default',
        user_name: 'Local Developer',
      });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sql = getSql();

    // Look up user to get their org_id
    const users = await sql`
      SELECT id, org_id, role, name FROM users WHERE id = ${userId} LIMIT 1
    `;
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];
    const workspaceCreated = user.org_id !== 'org_default';

    let apiKeyExists = false;
    let firstActionSent = false;

    if (workspaceCreated) {
      // Check for active API keys in their org
      const keys = await sql`
        SELECT COUNT(*) as cnt FROM api_keys
        WHERE org_id = ${user.org_id} AND revoked_at IS NULL
      `;
      apiKeyExists = parseInt(keys[0].cnt, 10) > 0;

      // Check if any action_records exist for their org
      const actions = await sql`
        SELECT 1 FROM action_records WHERE org_id = ${user.org_id} LIMIT 1
      `;
      firstActionSent = actions.length > 0;
    }

    const onboardingRequired = !workspaceCreated || !apiKeyExists || !firstActionSent;

    return NextResponse.json({
      onboarding_required: onboardingRequired,
      steps: {
        workspace_created: workspaceCreated,
        api_key_exists: apiKeyExists,
        first_action_sent: firstActionSent,
      },
      org_id: workspaceCreated ? user.org_id : null,
      user_name: user.name || null,
    });
  } catch (error) {
    console.error('Onboarding status error:', error);
    return NextResponse.json({ error: 'Failed to check onboarding status' }, { status: 500 });
  }
}
