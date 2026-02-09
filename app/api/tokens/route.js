import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getOrgId } from '../../lib/org.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let _sql;
function getSql() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  _sql = neon(url);
  return _sql;
}

export async function GET(request) {
  const sql = getSql();
  const orgId = getOrgId(request);
  try {
    // Get latest snapshot (real-time data)
    const latestSnapshot = await sql`
      SELECT * FROM token_snapshots
      WHERE org_id = ${orgId}
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    // Get today's totals
    const today = new Date().toISOString().split('T')[0];
    const todayTotals = await sql`
      SELECT * FROM daily_totals
      WHERE date = ${today} AND org_id = ${orgId}
    `;

    // Get 7-day history
    const history = await sql`
      SELECT * FROM daily_totals
      WHERE org_id = ${orgId}
      ORDER BY date DESC
      LIMIT 7
    `;

    // Get recent snapshots (last 24 hours for chart)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentSnapshots = await sql`
      SELECT timestamp, tokens_in, tokens_out, context_pct, hourly_pct_left, weekly_pct_left
      FROM token_snapshots
      WHERE timestamp > ${yesterday} AND org_id = ${orgId}
      ORDER BY timestamp ASC
    `;

    const latest = latestSnapshot[0] || null;
    const todayData = todayTotals[0] || null;

    // Calculate cost estimates (Claude pricing)
    // Opus: $15/M input, $75/M output
    // Sonnet: $3/M input, $15/M output
    const estimateCost = (tokensIn, tokensOut, model = 'opus') => {
      if (model.includes('sonnet')) {
        return (tokensIn * 3 / 1000000) + (tokensOut * 15 / 1000000);
      }
      // Default to Opus pricing
      return (tokensIn * 15 / 1000000) + (tokensOut * 75 / 1000000);
    };

    return NextResponse.json({
      current: latest ? {
        tokensIn: latest.tokens_in,
        tokensOut: latest.tokens_out,
        contextUsed: latest.context_used,
        contextMax: latest.context_max,
        contextPct: latest.context_pct,
        hourlyPctLeft: latest.hourly_pct_left,
        weeklyPctLeft: latest.weekly_pct_left,
        hourlyUsed: 100 - (latest.hourly_pct_left || 0),
        weeklyUsed: 100 - (latest.weekly_pct_left || 0),
        compactions: latest.compactions,
        model: latest.model,
        session: latest.session_key,
        updatedAt: latest.timestamp
      } : null,
      today: todayData ? {
        date: todayData.date,
        tokensIn: todayData.total_tokens_in,
        tokensOut: todayData.total_tokens_out,
        totalTokens: todayData.total_tokens,
        peakContextPct: todayData.peak_context_pct,
        snapshots: todayData.snapshots_count,
        estimatedCost: estimateCost(todayData.total_tokens_in, todayData.total_tokens_out)
      } : null,
      history: history.map(day => ({
        date: day.date,
        tokensIn: day.total_tokens_in,
        tokensOut: day.total_tokens_out,
        totalTokens: day.total_tokens,
        peakContextPct: day.peak_context_pct,
        snapshots: day.snapshots_count,
        estimatedCost: estimateCost(day.total_tokens_in, day.total_tokens_out)
      })),
      timeline: recentSnapshots.map(s => ({
        time: s.timestamp,
        tokensIn: s.tokens_in,
        tokensOut: s.tokens_out,
        contextPct: s.context_pct,
        hourlyLeft: s.hourly_pct_left,
        weeklyLeft: s.weekly_pct_left
      })),
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    // SECURITY: Log detailed error server-side, return generic message to client
    console.error('Tokens API error:', error);
    return NextResponse.json({
      current: null,
      today: null,
      history: [],
      timeline: [],
      lastUpdated: new Date().toISOString(),
      error: 'An error occurred while fetching token data'
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const sql = getSql();
    const orgId = getOrgId(request);
    const body = await request.json();

    const {
      tokens_in, tokens_out, context_used, context_max,
      model, agent_id, session_key,
      hourly_pct_left, weekly_pct_left, compactions
    } = body;

    if (tokens_in === undefined && tokens_out === undefined) {
      return NextResponse.json({ error: 'tokens_in or tokens_out is required' }, { status: 400 });
    }

    const tokensIn = parseInt(tokens_in || 0, 10);
    const tokensOut = parseInt(tokens_out || 0, 10);
    const contextUsed = parseInt(context_used || 0, 10);
    const contextMax = parseInt(context_max || 200000, 10);
    const contextPct = contextMax > 0 ? Math.round((contextUsed / contextMax) * 100) : 0;
    const now = new Date().toISOString();

    // Insert snapshot
    const result = await sql`
      INSERT INTO token_snapshots (
        org_id, tokens_in, tokens_out, context_used, context_max, context_pct,
        hourly_pct_left, weekly_pct_left, compactions, model, session_key, timestamp
      ) VALUES (
        ${orgId}, ${tokensIn}, ${tokensOut}, ${contextUsed}, ${contextMax}, ${contextPct},
        ${hourly_pct_left || 100}, ${weekly_pct_left || 100}, ${compactions || 0},
        ${model || 'unknown'}, ${session_key || agent_id || 'sdk'}, ${now}
      )
      RETURNING *
    `;

    // Upsert daily totals
    const today = now.split('T')[0];
    await sql`
      INSERT INTO daily_totals (org_id, date, total_tokens_in, total_tokens_out, total_tokens, peak_context_pct, snapshots_count)
      VALUES (${orgId}, ${today}, ${tokensIn}, ${tokensOut}, ${tokensIn + tokensOut}, ${contextPct}, 1)
      ON CONFLICT (org_id, date)
      DO UPDATE SET
        total_tokens_in = daily_totals.total_tokens_in + ${tokensIn},
        total_tokens_out = daily_totals.total_tokens_out + ${tokensOut},
        total_tokens = daily_totals.total_tokens + ${tokensIn + tokensOut},
        peak_context_pct = GREATEST(daily_totals.peak_context_pct, ${contextPct}),
        snapshots_count = daily_totals.snapshots_count + 1
    `;

    return NextResponse.json({ snapshot: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Tokens API POST error:', error);
    return NextResponse.json({ error: 'An error occurred while recording token usage' }, { status: 500 });
  }
}
