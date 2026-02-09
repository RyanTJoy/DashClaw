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
    // Get all goals
    const goals = await sql`SELECT * FROM goals WHERE org_id = ${orgId} ORDER BY created_at DESC`;

    // Get milestones for each goal
    const milestones = await sql`SELECT * FROM milestones WHERE org_id = ${orgId} ORDER BY created_at DESC`;

    // Attach milestones to goals
    const goalsWithMilestones = goals.map(g => ({
      ...g,
      milestones: milestones.filter(m => m.goal_id === g.id)
    }));

    // Calculate stats
    const active = goals.filter(g => g.status === 'active').length;
    const completed = goals.filter(g => g.status === 'completed').length;
    const avgProgress = goals.length > 0 
      ? Math.round(goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length)
      : 0;

    const stats = {
      totalGoals: goals.length,
      active,
      completed,
      avgProgress,
      totalMilestones: milestones.length,
      completedMilestones: milestones.filter(m => m.status === 'completed').length
    };

    return NextResponse.json({
      goals: goalsWithMilestones,
      stats,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    // SECURITY: Log detailed error server-side, return generic message to client
    console.error('Goals API error:', error);
    return NextResponse.json({ error: 'An error occurred while fetching goals data', goals: [], stats: {} }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const orgId = getOrgId(request);
    const body = await request.json();

    const { title, category, description, target_date, progress, status } = body;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO goals (org_id, title, category, description, target_date, progress, status, created_at)
      VALUES (
        ${orgId},
        ${title},
        ${category || null},
        ${description || null},
        ${target_date || null},
        ${progress || 0},
        ${status || 'active'},
        ${new Date().toISOString()}
      )
      RETURNING *
    `;

    return NextResponse.json({ goal: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Goals API POST error:', error);
    return NextResponse.json({ error: 'An error occurred while creating the goal' }, { status: 500 });
  }
}

