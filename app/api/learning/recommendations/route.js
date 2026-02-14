export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getOrgId, getOrgRole } from '../../../lib/org.js';
import {
  listLearningRecommendations,
} from '../../../lib/repositories/learningLoop.repository.js';
import {
  rebuildLearningRecommendations,
  scoreAndStoreActionEpisode,
} from '../../../lib/learningLoop.service.js';

let _sql;
function getSql() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  _sql = neon(url);
  return _sql;
}

function parseBoundedInt(value, fieldName, min, max, fallback, errors) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    errors.push(`${fieldName} must be an integer`);
    return fallback;
  }
  if (parsed < min || parsed > max) {
    errors.push(`${fieldName} must be between ${min} and ${max}`);
    return fallback;
  }
  return parsed;
}

function validatePostBody(body) {
  const errors = [];
  const data = {
    agentId: undefined,
    actionType: undefined,
    actionId: undefined,
    lookbackDays: 30,
    episodeLimit: 5000,
    minSamples: 5,
  };

  if (body.agent_id !== undefined) {
    if (typeof body.agent_id !== 'string' || body.agent_id.length === 0 || body.agent_id.length > 128) {
      errors.push('agent_id must be a non-empty string up to 128 chars');
    } else {
      data.agentId = body.agent_id;
    }
  }

  if (body.action_type !== undefined) {
    if (typeof body.action_type !== 'string' || body.action_type.length === 0 || body.action_type.length > 128) {
      errors.push('action_type must be a non-empty string up to 128 chars');
    } else {
      data.actionType = body.action_type;
    }
  }

  if (body.action_id !== undefined) {
    if (typeof body.action_id !== 'string' || body.action_id.length === 0 || body.action_id.length > 128) {
      errors.push('action_id must be a non-empty string up to 128 chars');
    } else {
      data.actionId = body.action_id;
    }
  }

  data.lookbackDays = parseBoundedInt(body.lookback_days, 'lookback_days', 1, 365, 30, errors);
  data.episodeLimit = parseBoundedInt(body.episode_limit, 'episode_limit', 100, 10000, 5000, errors);
  data.minSamples = parseBoundedInt(body.min_samples, 'min_samples', 2, 100, 5, errors);

  return { valid: errors.length === 0, errors, data };
}

export async function GET(request) {
  try {
    const sql = getSql();
    const orgId = getOrgId(request);
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id') || undefined;
    const actionType = searchParams.get('action_type') || undefined;
    const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') || '50', 10), 200));

    const recommendations = await listLearningRecommendations(sql, orgId, {
      agentId,
      actionType,
      limit,
    });

    return NextResponse.json({
      recommendations,
      total: recommendations.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Learning recommendations GET error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching learning recommendations', recommendations: [], total: 0 },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const role = getOrgRole(request);
    if (role !== 'admin' && role !== 'service') {
      return NextResponse.json(
        { error: 'Admin or service role required' },
        { status: 403 }
      );
    }

    const sql = getSql();
    const orgId = getOrgId(request);
    const body = await request.json().catch(() => ({}));

    const { valid, errors, data } = validatePostBody(body);
    if (!valid) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    let scoredEpisode = null;
    if (data.actionId) {
      scoredEpisode = await scoreAndStoreActionEpisode(sql, orgId, data.actionId);
    }

    const rebuilt = await rebuildLearningRecommendations(sql, orgId, {
      agentId: data.agentId,
      actionType: data.actionType,
      lookbackDays: data.lookbackDays,
      episodeLimit: data.episodeLimit,
      minSamples: data.minSamples,
    });

    return NextResponse.json({
      scored_episode: scoredEpisode,
      episodes_scanned: rebuilt.episodes_scanned,
      recommendations: rebuilt.recommendations,
      total: rebuilt.recommendations.length,
      rebuilt_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Learning recommendations POST error:', error);
    return NextResponse.json(
      { error: 'An error occurred while rebuilding learning recommendations' },
      { status: 500 }
    );
  }
}
