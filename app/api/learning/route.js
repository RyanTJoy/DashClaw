export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getOrgId } from '../../lib/org.js';

// sql initialized inside handler for serverless compatibility

export async function GET(request) {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const orgId = getOrgId(request);
    // Get all decisions with their outcomes joined
    const decisions = await sql`
      SELECT d.*,
             COALESCE(o.result, 'pending') as outcome,
             o.id as outcome_id
      FROM decisions d
      LEFT JOIN outcomes o ON o.decision_id = d.id
      WHERE d.org_id = ${orgId}
      ORDER BY d.timestamp DESC LIMIT 20
    `;

    // Get all lessons
    const lessons = await sql`SELECT * FROM lessons WHERE org_id = ${orgId} ORDER BY confidence DESC`;

    // Calculate stats
    const successCount = decisions.filter(d => d.outcome === 'success').length;
    const totalWithOutcome = decisions.filter(d => d.outcome && d.outcome !== 'pending').length;
    const successRate = totalWithOutcome > 0 ? Math.round((successCount / totalWithOutcome) * 100) : 0;

    const stats = {
      totalDecisions: decisions.length,
      totalLessons: lessons.length,
      successRate,
      patterns: lessons.filter(l => l.confidence >= 80).length
    };

    return NextResponse.json({
      decisions,
      lessons,
      stats,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    // SECURITY: Log detailed error server-side, return generic message to client
    console.error('Learning API error:', error);
    return NextResponse.json({ error: 'An error occurred while fetching learning data', decisions: [], lessons: [], stats: {} }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const orgId = getOrgId(request);
    const body = await request.json();

    const { decision, context, reasoning, outcome, confidence, agent_id } = body;

    if (!decision) {
      return NextResponse.json({ error: 'decision is required' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO decisions (org_id, decision, context, reasoning, outcome, confidence, timestamp, agent_id)
      VALUES (
        ${orgId},
        ${decision},
        ${context || null},
        ${reasoning || null},
        ${outcome || 'pending'},
        ${confidence || 50},
        ${new Date().toISOString()},
        ${agent_id || null}
      )
      RETURNING *
    `;

    return NextResponse.json({ decision: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Learning API POST error:', error);
    return NextResponse.json({ error: 'An error occurred while recording the decision' }, { status: 500 });
  }
}

