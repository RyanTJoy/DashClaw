export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getSql } from '../../../lib/db.js';
import { getOrgId } from '../../../lib/org.js';
import { registerAgent, listAgents } from '../../../lib/repositories/routing.repository.js';

/**
 * GET /api/routing/agents?status=available — List registered routing agents
 */
export async function GET(request) {
  try {
    const sql = getSql();
    const orgId = getOrgId(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    const agents = await listAgents(sql, orgId, status);
    return NextResponse.json({ agents });
  } catch (err) {
    console.error('[ROUTING/AGENTS] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/routing/agents — Register a new routing agent
 * Body: { name, capabilities, maxConcurrent, endpoint }
 */
export async function POST(request) {
  try {
    const sql = getSql();
    const orgId = getOrgId(request);
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const agent = await registerAgent(sql, orgId, body);
    return NextResponse.json({ agent }, { status: 201 });
  } catch (err) {
    console.error('[ROUTING/AGENTS] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
