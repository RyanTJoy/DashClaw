import { NextResponse } from 'next/server';
import { getSql as getDbSql } from '../../lib/db.js';
import { getOrgId } from '../../lib/org.js';
import { estimateCost } from '../../lib/billing.js';
import {
  getLatestSnapshot,
  getTodayTotals,
  getHistory,
  getRecentSnapshots,
  getPerAgentLatestSnapshots,
  insertSnapshot,
  insertOrgAggregateSnapshot,
  upsertDailyTotals,
} from '../../lib/repositories/tokens.repository.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let _sql;
function getSql() {
  if (_sql) return _sql;
  _sql = getDbSql();
  return _sql;
}

export async function GET(request) {
  const sql = getSql();
  const orgId = getOrgId(request);
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agent_id');

  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [latestSnapshot, todayTotals, history, recentSnapshots] = await Promise.all([
      getLatestSnapshot(sql, orgId, agentId),
      getTodayTotals(sql, orgId, agentId, today),
      getHistory(sql, orgId, agentId),
      getRecentSnapshots(sql, orgId, agentId, yesterday),
    ]);

    const latest = latestSnapshot[0] || null;
    const todayData = todayTotals[0] || null;

    // For All Agents view, also fetch per-agent context snapshots
    let agentContexts = [];
    if (!agentId) {
      agentContexts = await getPerAgentLatestSnapshots(sql, orgId);
    }

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
        agentId: latest.agent_id,
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
      agentContexts: agentContexts.map(s => ({
        agentId: s.agent_id,
        contextUsed: s.context_used,
        contextMax: s.context_max,
        contextPct: s.context_pct,
        model: s.model,
        updatedAt: s.timestamp
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
      agentContexts: [],
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
    const agentId = agent_id || null;

    // Insert per-agent snapshot
    const result = await insertSnapshot(sql, orgId, {
      agentId, tokensIn, tokensOut, contextUsed, contextMax, contextPct,
      hourly_pct_left, weekly_pct_left, compactions, model, session_key, now
    });

    // Insert real aggregated org-wide snapshot if this is a per-agent report
    if (agentId) {
      await insertOrgAggregateSnapshot(sql, orgId, { now });
    }

    // Upsert per-agent daily totals (or org-wide if no agent_id)
    const today = now.split('T')[0];
    await upsertDailyTotals(sql, orgId, agentId, today, tokensIn, tokensOut, contextPct);

    // Also upsert org-wide aggregate daily totals if this is a per-agent report
    if (agentId) {
      await upsertDailyTotals(sql, orgId, null, today, tokensIn, tokensOut, contextPct);
    }

    return NextResponse.json({ snapshot: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Tokens API POST error:', error);
    return NextResponse.json({ error: 'An error occurred while recording token usage' }, { status: 500 });
  }
}
