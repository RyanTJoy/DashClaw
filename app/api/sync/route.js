/**
 * Bulk Sync API — accepts all data categories in a single payload.
 * Each category is processed independently (try/catch island).
 * Uses the same SQL patterns as individual routes.
 */

import { NextResponse } from 'next/server';
import { getOrgId } from '../../lib/org';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let _sql;
function getSql() {
  if (!_sql) {
    const { neon } = require('@neondatabase/serverless');
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

function genId(prefix) {
  return `${prefix}${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
}

// Category limits
const LIMITS = {
  connections: 50,
  goals: 100,
  learning: 100,
  content: 100,
  inspiration: 100,
  context_points: 200,
  context_threads: 50,
  snippets: 50,
  handoffs: 50,
  observations: 50,
  preferences: 50,
  moods: 50,
  approaches: 50,
};

// --- Category sync functions ---

async function syncConnections(sql, orgId, agentId, connections) {
  const now = new Date().toISOString();
  let synced = 0;
  const errors = [];

  for (const conn of connections.slice(0, LIMITS.connections)) {
    try {
      const id = `conn_${crypto.randomUUID()}`;
      const authType = conn.auth_type || 'api_key';
      const status = conn.status || 'active';
      await sql`
        INSERT INTO agent_connections (id, org_id, agent_id, provider, auth_type, plan_name, status, metadata, reported_at, updated_at)
        VALUES (${id}, ${orgId}, ${agentId}, ${conn.provider}, ${authType}, ${conn.plan_name || null}, ${status}, ${conn.metadata || null}, ${now}, ${now})
        ON CONFLICT (org_id, agent_id, provider) DO UPDATE SET
          auth_type = EXCLUDED.auth_type,
          plan_name = EXCLUDED.plan_name,
          status = EXCLUDED.status,
          metadata = EXCLUDED.metadata,
          updated_at = EXCLUDED.updated_at
      `;
      synced++;
    } catch (e) {
      errors.push(`connection ${conn.provider}: ${e.message}`);
    }
  }
  return { synced, errors };
}

async function syncMemory(sql, orgId, memory) {
  const now = new Date().toISOString();
  let synced = 0;
  const errors = [];

  try {
    if (memory.health) {
      const h = memory.health;
      await sql`
        INSERT INTO health_snapshots (
          org_id, timestamp, health_score, total_files, total_lines, total_size_kb,
          memory_md_lines, oldest_daily_file, newest_daily_file, days_with_notes,
          avg_lines_per_day, potential_duplicates, stale_facts_count
        ) VALUES (
          ${orgId}, ${now},
          ${h.score ?? h.health_score ?? 0},
          ${h.total_files ?? 0},
          ${h.total_lines ?? 0},
          ${h.total_size_kb ?? 0},
          ${h.memory_md_lines ?? 0},
          ${h.oldest_daily ?? null},
          ${h.newest_daily ?? null},
          ${h.days_with_notes ?? 0},
          ${h.avg_lines_per_day ?? 0},
          ${h.duplicates ?? h.potential_duplicates ?? 0},
          ${h.stale_count ?? h.stale_facts_count ?? 0}
        )
      `;
      synced++;
    }

    if (memory.entities?.length) {
      await sql`DELETE FROM entities WHERE org_id = ${orgId}`;
      for (const e of memory.entities.slice(0, 100)) {
        await sql`
          INSERT INTO entities (org_id, name, type, mention_count)
          VALUES (${orgId}, ${e.name}, ${e.type || 'other'}, ${e.mentions ?? e.mention_count ?? 1})
        `;
        synced++;
      }
    }

    if (memory.topics?.length) {
      await sql`DELETE FROM topics WHERE org_id = ${orgId}`;
      for (const t of memory.topics.slice(0, 100)) {
        await sql`
          INSERT INTO topics (org_id, name, mention_count)
          VALUES (${orgId}, ${t.name}, ${t.mentions ?? t.mention_count ?? 1})
        `;
        synced++;
      }
    }
  } catch (e) {
    errors.push(`memory: ${e.message}`);
  }

  return { synced, errors };
}

async function syncGoals(sql, orgId, agentId, goals) {
  const now = new Date().toISOString();
  let synced = 0;
  const errors = [];

  for (const g of goals.slice(0, LIMITS.goals)) {
    try {
      await sql`
        INSERT INTO goals (org_id, title, category, description, target_date, progress, status, agent_id, created_at)
        VALUES (
          ${orgId}, ${g.title}, ${g.category || null}, ${g.description || null},
          ${g.target_date || null}, ${g.progress || 0}, ${g.status || 'active'},
          ${agentId}, ${now}
        )
      `;
      synced++;
    } catch (e) {
      errors.push(`goal "${g.title}": ${e.message}`);
    }
  }
  return { synced, errors };
}

async function syncLearning(sql, orgId, agentId, learning) {
  const now = new Date().toISOString();
  let synced = 0;
  const errors = [];

  for (const l of learning.slice(0, LIMITS.learning)) {
    try {
      await sql`
        INSERT INTO decisions (org_id, decision, context, reasoning, outcome, confidence, timestamp, agent_id)
        VALUES (
          ${orgId}, ${l.decision}, ${l.context || null}, ${l.reasoning || null},
          ${l.outcome || 'pending'}, ${l.confidence || 50}, ${now}, ${agentId}
        )
      `;
      synced++;
    } catch (e) {
      errors.push(`learning "${l.decision?.slice(0, 30)}": ${e.message}`);
    }
  }
  return { synced, errors };
}

async function syncContent(sql, orgId, agentId, content) {
  const now = new Date().toISOString();
  let synced = 0;
  const errors = [];

  for (const c of content.slice(0, LIMITS.content)) {
    try {
      await sql`
        INSERT INTO content (org_id, title, platform, status, url, body, agent_id, created_at)
        VALUES (
          ${orgId}, ${c.title}, ${c.platform || null}, ${c.status || 'draft'},
          ${c.url || null}, ${c.body || null}, ${agentId}, ${now}
        )
      `;
      synced++;
    } catch (e) {
      errors.push(`content "${c.title}": ${e.message}`);
    }
  }
  return { synced, errors };
}

async function syncInspiration(sql, orgId, inspiration) {
  const now = new Date().toISOString();
  let synced = 0;
  const errors = [];

  for (const i of inspiration.slice(0, LIMITS.inspiration)) {
    try {
      await sql`
        INSERT INTO ideas (org_id, title, description, category, score, status, source, captured_at)
        VALUES (
          ${orgId}, ${i.title}, ${i.description || null}, ${i.category || null},
          ${i.score || 50}, ${i.status || 'pending'}, ${i.source || null}, ${now}
        )
      `;
      synced++;
    } catch (e) {
      errors.push(`idea "${i.title}": ${e.message}`);
    }
  }
  return { synced, errors };
}

async function syncContextPoints(sql, orgId, agentId, points) {
  const now = new Date().toISOString();
  const dateStr = now.split('T')[0];
  let synced = 0;
  const errors = [];
  const validCategories = ['decision', 'task', 'insight', 'question', 'general'];

  for (const p of points.slice(0, LIMITS.context_points)) {
    try {
      const id = genId('cp_');
      const cat = validCategories.includes(p.category) ? p.category : 'general';
      const imp = Math.max(1, Math.min(10, p.importance || 5));
      await sql`
        INSERT INTO context_points (id, org_id, agent_id, content, category, importance, session_date, created_at)
        VALUES (${id}, ${orgId}, ${agentId}, ${p.content}, ${cat}, ${imp}, ${p.session_date || dateStr}, ${now})
      `;
      synced++;
    } catch (e) {
      errors.push(`context point: ${e.message}`);
    }
  }
  return { synced, errors };
}

async function syncContextThreads(sql, orgId, agentId, threads) {
  const now = new Date().toISOString();
  let synced = 0;
  const errors = [];

  for (const t of threads.slice(0, LIMITS.context_threads)) {
    try {
      const id = genId('ct_');
      await sql`
        INSERT INTO context_threads (id, org_id, agent_id, name, summary, status, created_at, updated_at)
        VALUES (${id}, ${orgId}, ${agentId}, ${t.name}, ${t.summary || null}, 'active', ${now}, ${now})
        ON CONFLICT (org_id, COALESCE(agent_id, ''), name)
        DO UPDATE SET summary = COALESCE(EXCLUDED.summary, context_threads.summary), status = 'active', updated_at = ${now}
      `;
      synced++;
    } catch (e) {
      errors.push(`thread "${t.name}": ${e.message}`);
    }
  }
  return { synced, errors };
}

async function syncHandoffs(sql, orgId, agentId, handoffs) {
  const now = new Date().toISOString();
  const dateStr = now.split('T')[0];
  let synced = 0;
  const errors = [];

  for (const h of handoffs.slice(0, LIMITS.handoffs)) {
    try {
      const id = genId('ho_');
      await sql`
        INSERT INTO handoffs (id, org_id, agent_id, session_date, summary, key_decisions, open_tasks, mood_notes, next_priorities, created_at)
        VALUES (
          ${id}, ${orgId}, ${agentId}, ${h.session_date || dateStr}, ${h.summary},
          ${h.key_decisions ? JSON.stringify(h.key_decisions) : null},
          ${h.open_tasks ? JSON.stringify(h.open_tasks) : null},
          ${h.mood_notes || null},
          ${h.next_priorities ? JSON.stringify(h.next_priorities) : null},
          ${now}
        )
      `;
      synced++;
    } catch (e) {
      errors.push(`handoff: ${e.message}`);
    }
  }
  return { synced, errors };
}

async function syncPreferences(sql, orgId, agentId, preferences) {
  const now = new Date().toISOString();
  let synced = 0;
  const errors = [];

  // Observations
  if (preferences.observations?.length) {
    for (const o of preferences.observations.slice(0, LIMITS.observations)) {
      try {
        const id = genId('uo_');
        await sql`
          INSERT INTO user_observations (id, org_id, user_id, agent_id, observation, category, importance, created_at)
          VALUES (${id}, ${orgId}, ${null}, ${agentId}, ${o.observation}, ${o.category || null}, ${o.importance || 5}, ${now})
        `;
        synced++;
      } catch (e) {
        errors.push(`observation: ${e.message}`);
      }
    }
  }

  // Preferences
  if (preferences.preferences?.length) {
    for (const p of preferences.preferences.slice(0, LIMITS.preferences)) {
      try {
        const id = genId('up_');
        await sql`
          INSERT INTO user_preferences (id, org_id, user_id, agent_id, preference, category, confidence, created_at)
          VALUES (${id}, ${orgId}, ${null}, ${agentId}, ${p.preference}, ${p.category || null}, ${p.confidence || 50}, ${now})
        `;
        synced++;
      } catch (e) {
        errors.push(`preference: ${e.message}`);
      }
    }
  }

  // Moods
  if (preferences.moods?.length) {
    for (const m of preferences.moods.slice(0, LIMITS.moods)) {
      try {
        const id = genId('um_');
        await sql`
          INSERT INTO user_moods (id, org_id, user_id, agent_id, mood, energy, notes, created_at)
          VALUES (${id}, ${orgId}, ${null}, ${agentId}, ${m.mood}, ${m.energy || null}, ${m.notes || null}, ${now})
        `;
        synced++;
      } catch (e) {
        errors.push(`mood: ${e.message}`);
      }
    }
  }

  // Approaches
  if (preferences.approaches?.length) {
    for (const a of preferences.approaches.slice(0, LIMITS.approaches)) {
      try {
        const id = genId('ua_');
        const successInc = a.success === true ? 1 : 0;
        const failInc = a.success === false ? 1 : 0;
        await sql`
          INSERT INTO user_approaches (id, org_id, user_id, agent_id, approach, context, success_count, fail_count, created_at, updated_at)
          VALUES (${id}, ${orgId}, ${null}, ${agentId}, ${a.approach}, ${a.context || null}, ${successInc}, ${failInc}, ${now}, ${now})
          ON CONFLICT (org_id, COALESCE(agent_id, ''), approach)
          DO UPDATE SET
            success_count = user_approaches.success_count + ${successInc},
            fail_count = user_approaches.fail_count + ${failInc},
            context = COALESCE(EXCLUDED.context, user_approaches.context),
            updated_at = ${now}
        `;
        synced++;
      } catch (e) {
        errors.push(`approach "${a.approach}": ${e.message}`);
      }
    }
  }

  return { synced, errors };
}

async function syncSnippets(sql, orgId, agentId, snippets) {
  const now = new Date().toISOString();
  let synced = 0;
  const errors = [];

  for (const s of snippets.slice(0, LIMITS.snippets)) {
    try {
      const id = genId('sn_');
      const tagsJson = s.tags ? JSON.stringify(s.tags) : null;
      await sql`
        INSERT INTO snippets (id, org_id, agent_id, name, description, code, language, tags, created_at)
        VALUES (${id}, ${orgId}, ${agentId}, ${s.name}, ${s.description || null}, ${s.code}, ${s.language || null}, ${tagsJson}, ${now})
        ON CONFLICT (org_id, name)
        DO UPDATE SET code = EXCLUDED.code, description = COALESCE(EXCLUDED.description, snippets.description),
          language = COALESCE(EXCLUDED.language, snippets.language), tags = COALESCE(EXCLUDED.tags, snippets.tags),
          agent_id = COALESCE(EXCLUDED.agent_id, snippets.agent_id)
      `;
      synced++;
    } catch (e) {
      errors.push(`snippet "${s.name}": ${e.message}`);
    }
  }
  return { synced, errors };
}

// --- Main POST handler ---

export async function POST(request) {
  try {
    const orgId = getOrgId(request);
    const body = await request.json();
    const agentId = body.agent_id || null;
    const sql = getSql();
    const start = Date.now();

    const results = {};
    let totalSynced = 0;
    let totalErrors = 0;

    // Process each category independently
    const categories = [
      { key: 'connections', fn: () => syncConnections(sql, orgId, agentId, body.connections) },
      { key: 'memory', fn: () => syncMemory(sql, orgId, body.memory) },
      { key: 'goals', fn: () => syncGoals(sql, orgId, agentId, body.goals) },
      { key: 'learning', fn: () => syncLearning(sql, orgId, agentId, body.learning) },
      { key: 'content', fn: () => syncContent(sql, orgId, agentId, body.content) },
      { key: 'inspiration', fn: () => syncInspiration(sql, orgId, body.inspiration) },
      { key: 'context_points', fn: () => syncContextPoints(sql, orgId, agentId, body.context_points) },
      { key: 'context_threads', fn: () => syncContextThreads(sql, orgId, agentId, body.context_threads) },
      { key: 'handoffs', fn: () => syncHandoffs(sql, orgId, agentId, body.handoffs) },
      { key: 'preferences', fn: () => syncPreferences(sql, orgId, agentId, body.preferences) },
      { key: 'snippets', fn: () => syncSnippets(sql, orgId, agentId, body.snippets) },
    ];

    for (const { key, fn } of categories) {
      if (!body[key]) continue;
      try {
        const result = await fn();
        results[key] = { synced: result.synced };
        if (result.errors.length) {
          results[key].errors = result.errors;
          totalErrors += result.errors.length;
        }
        totalSynced += result.synced;
      } catch (e) {
        results[key] = { synced: 0, errors: [e.message] };
        totalErrors++;
      }
    }

    return NextResponse.json({
      results,
      total_synced: totalSynced,
      total_errors: totalErrors,
      duration_ms: Date.now() - start,
    });
  } catch (err) {
    console.error('Sync error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
