export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getSql } from '../../../lib/db.js';
import { getOrgId } from '../../../lib/org.js';
import { routePending, checkTimeouts } from '../../../lib/repositories/routing.repository.js';

/**
 * POST /api/cron/routing-maintenance — Route pending tasks and check timeouts
 * Called by cron or manually to process pending work.
 */
export async function POST(request) {
  try {
    const sql = getSql();
    const orgId = getOrgId(request);

    const routedResults = await routePending(sql, orgId);
    const timeoutResults = await checkTimeouts(sql, orgId);

    return NextResponse.json({
      routed: routedResults.length,
      timed_out: timeoutResults.length,
      routed_results: routedResults,
      timeout_results: timeoutResults,
      processed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[CRON/ROUTING-MAINTENANCE] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
