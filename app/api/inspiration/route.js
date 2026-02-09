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
    // Get all ideas
    const ideas = await sql`SELECT * FROM ideas WHERE org_id = ${orgId} ORDER BY captured_at DESC LIMIT 50`;

    // Calculate stats
    const pending = ideas.filter(i => i.status === 'pending').length;
    const shipped = ideas.filter(i => i.status === 'shipped').length;
    const avgScore = ideas.length > 0 
      ? Math.round(ideas.reduce((sum, i) => sum + (i.score || 0), 0) / ideas.length)
      : 0;

    const stats = {
      totalIdeas: ideas.length,
      pending,
      shipped,
      avgScore,
      topIdeas: ideas.filter(i => i.score >= 70).length
    };

    return NextResponse.json({
      ideas,
      stats,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    // SECURITY: Log detailed error server-side, return generic message to client
    console.error('Inspiration API error:', error);
    return NextResponse.json({ error: 'An error occurred while fetching inspiration data', ideas: [], stats: {} }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const orgId = getOrgId(request);
    const body = await request.json();

    const { title, description, category, score, status, source } = body;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO ideas (org_id, title, description, category, score, status, source, captured_at)
      VALUES (
        ${orgId},
        ${title},
        ${description || null},
        ${category || null},
        ${score || 50},
        ${status || 'pending'},
        ${source || null},
        ${new Date().toISOString()}
      )
      RETURNING *
    `;

    return NextResponse.json({ idea: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Inspiration API POST error:', error);
    return NextResponse.json({ error: 'An error occurred while creating the idea' }, { status: 500 });
  }
}

