export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getOrgId } from '../../lib/org.js';

export async function GET(request) {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const orgId = getOrgId(request);
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Parallel fetch from multiple tables for the given date
    const dayStart = `${date}T00:00:00.000Z`;
    const dayEnd = `${date}T23:59:59.999Z`;

    const queries = agentId ? [
      sql`SELECT * FROM action_records WHERE org_id = ${orgId} AND agent_id = ${agentId} AND timestamp_start >= ${dayStart} AND timestamp_start <= ${dayEnd} ORDER BY timestamp_start DESC`,
      sql`SELECT * FROM decisions WHERE org_id = ${orgId} AND timestamp >= ${dayStart} AND timestamp <= ${dayEnd} ORDER BY timestamp DESC`,
      sql`SELECT * FROM lessons WHERE org_id = ${orgId} AND timestamp >= ${dayStart} AND timestamp <= ${dayEnd} ORDER BY timestamp DESC`,
      sql`SELECT * FROM content WHERE org_id = ${orgId} AND agent_id = ${agentId} AND created_at >= ${dayStart} AND created_at <= ${dayEnd} ORDER BY created_at DESC`,
      sql`SELECT * FROM ideas WHERE org_id = ${orgId} AND captured_at >= ${dayStart} AND captured_at <= ${dayEnd} ORDER BY captured_at DESC`,
      sql`SELECT * FROM interactions WHERE org_id = ${orgId} AND agent_id = ${agentId} AND created_at >= ${dayStart} AND created_at <= ${dayEnd} ORDER BY created_at DESC`,
      sql`SELECT * FROM goals WHERE org_id = ${orgId} AND agent_id = ${agentId} AND created_at >= ${dayStart} AND created_at <= ${dayEnd} ORDER BY created_at DESC`,
    ] : [
      sql`SELECT * FROM action_records WHERE org_id = ${orgId} AND timestamp_start >= ${dayStart} AND timestamp_start <= ${dayEnd} ORDER BY timestamp_start DESC`,
      sql`SELECT * FROM decisions WHERE org_id = ${orgId} AND timestamp >= ${dayStart} AND timestamp <= ${dayEnd} ORDER BY timestamp DESC`,
      sql`SELECT * FROM lessons WHERE org_id = ${orgId} AND timestamp >= ${dayStart} AND timestamp <= ${dayEnd} ORDER BY timestamp DESC`,
      sql`SELECT * FROM content WHERE org_id = ${orgId} AND created_at >= ${dayStart} AND created_at <= ${dayEnd} ORDER BY created_at DESC`,
      sql`SELECT * FROM ideas WHERE org_id = ${orgId} AND captured_at >= ${dayStart} AND captured_at <= ${dayEnd} ORDER BY captured_at DESC`,
      sql`SELECT * FROM interactions WHERE org_id = ${orgId} AND created_at >= ${dayStart} AND created_at <= ${dayEnd} ORDER BY created_at DESC`,
      sql`SELECT * FROM goals WHERE org_id = ${orgId} AND created_at >= ${dayStart} AND created_at <= ${dayEnd} ORDER BY created_at DESC`,
    ];

    const [actions, decisions, lessons, content, ideas, interactions, goals] = await Promise.all(queries);

    // Compute stats
    const completedActions = actions.filter(a => a.status === 'completed').length;
    const failedActions = actions.filter(a => a.status === 'failed').length;
    const avgRisk = actions.length > 0
      ? Math.round(actions.reduce((sum, a) => sum + (a.risk_score || 0), 0) / actions.length)
      : 0;

    return NextResponse.json({
      date,
      agent_id: agentId || null,
      digest: {
        actions: {
          total: actions.length,
          completed: completedActions,
          failed: failedActions,
          avg_risk: avgRisk,
          items: actions.slice(0, 20).map(a => ({
            action_id: a.action_id,
            action_type: a.action_type,
            declared_goal: a.declared_goal,
            status: a.status,
            risk_score: a.risk_score,
          })),
        },
        decisions: {
          total: decisions.length,
          items: decisions.slice(0, 10).map(d => ({
            id: d.id,
            decision: d.decision,
            outcome: d.outcome,
          })),
        },
        lessons: {
          total: lessons.length,
          items: lessons.slice(0, 10).map(l => ({
            id: l.id,
            lesson: l.lesson || l.content,
          })),
        },
        content: {
          total: content.length,
          items: content.slice(0, 10).map(c => ({
            id: c.id,
            title: c.title,
            platform: c.platform,
            status: c.status,
          })),
        },
        ideas: {
          total: ideas.length,
          items: ideas.slice(0, 10).map(i => ({
            id: i.id,
            title: i.title,
            score: i.score,
          })),
        },
        interactions: {
          total: interactions.length,
          items: interactions.slice(0, 10).map(i => ({
            id: i.id,
            summary: i.summary,
            direction: i.direction,
          })),
        },
        goals: {
          total: goals.length,
          items: goals.slice(0, 10).map(g => ({
            id: g.id,
            title: g.title,
            progress: g.progress,
            status: g.status,
          })),
        },
      },
      summary: {
        total_activities: actions.length + decisions.length + lessons.length + content.length + ideas.length + interactions.length + goals.length,
        action_count: actions.length,
        decision_count: decisions.length,
        lesson_count: lessons.length,
        content_count: content.length,
        idea_count: ideas.length,
        interaction_count: interactions.length,
        goal_count: goals.length,
      },
    });
  } catch (error) {
    console.error('Digest GET error:', error);
    return NextResponse.json({ error: 'An error occurred while generating digest' }, { status: 500 });
  }
}
