import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { neon } from '@neondatabase/serverless';
import { getDemoFixtures } from './app/lib/demo/demoFixtures.js';

/**
 * Authentication middleware for DashClaw
 *
 * SECURITY: Protects API routes with API key authentication.
 * Resolves API keys to org_id via SHA-256 hash lookup.
 * Set DASHCLAW_API_KEY environment variable in production.
 */

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/api/settings',
  '/api/tokens',
  '/api/relationships',
  '/api/goals',
  '/api/learning',
  '/api/workflows',
  '/api/inspiration',
  '/api/bounties',
  '/api/content',
  '/api/schedules',
  '/api/calendar',
  '/api/memory',
  '/api/actions',
  '/api/orgs',
  '/api/agents',
  '/api/onboarding',
  '/api/keys',
  '/api/identities',
  '/api/pairings',
  '/api/team',
  '/api/invite',
  '/api/billing',
  '/api/activity',
  '/api/webhooks',
  '/api/notifications',
  '/api/handoffs',
  '/api/context',
  '/api/snippets',
  '/api/preferences',
  '/api/digest',
  '/api/security',
  '/api/messages',
  '/api/sync',
  '/api/guard',
  '/api/policies',
];

// Routes that are always public (health checks, setup, auth)
const PUBLIC_ROUTES = [
  '/api/health',
  '/api/setup/status',
  '/api/auth',
  '/api/cron',
];

function getDashclawMode() {
  return process.env.DASHCLAW_MODE || 'self_host';
}

function isDemoCookieSet(request) {
  return request.cookies.get('dashclaw_demo')?.value === '1';
}

function addSecurityHeaders(response) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  return response;
}

function withCors(request, response) {
  for (const [k, v] of Object.entries(getCorsHeaders(request))) response.headers.set(k, v);
  return response;
}

function demoJson(request, payload, status = 200) {
  const response = NextResponse.json(payload, { status });
  addSecurityHeaders(response);
  withCors(request, response);
  return response;
}

function parseUrl(request) {
  return new URL(request.url);
}

function getPathSegments(pathname) {
  return pathname.split('/').filter(Boolean);
}

function demoListActions(fixtures, url) {
  const sp = url.searchParams;
  const agentId = sp.get('agent_id') || undefined;
  const status = sp.get('status') || undefined;
  const actionType = sp.get('action_type') || undefined;
  const riskMinRaw = sp.get('risk_min');
  const riskMin = riskMinRaw ? parseInt(riskMinRaw, 10) : undefined;
  const limit = Math.min(parseInt(sp.get('limit') || '50', 10), 200);
  const offset = parseInt(sp.get('offset') || '0', 10);

  let items = fixtures.actions.slice();
  if (agentId) items = items.filter(a => a.agent_id === agentId);
  if (status) items = items.filter(a => a.status === status);
  if (actionType) items = items.filter(a => a.action_type === actionType);
  if (Number.isFinite(riskMin)) items = items.filter(a => (parseInt(a.risk_score, 10) || 0) >= riskMin);

  items.sort((a, b) => (b.timestamp_start || '').localeCompare(a.timestamp_start || ''));

  const total = items.length;
  const paged = items.slice(offset, offset + limit);

  const statsSource = items;
  const stats = {
    total: statsSource.length,
    completed: statsSource.filter(a => a.status === 'completed').length,
    failed: statsSource.filter(a => a.status === 'failed').length,
    running: statsSource.filter(a => a.status === 'running').length,
    high_risk: statsSource.filter(a => (parseInt(a.risk_score, 10) || 0) >= 70).length,
    avg_risk: statsSource.length ? (statsSource.reduce((s, a) => s + (parseInt(a.risk_score, 10) || 0), 0) / statsSource.length) : 0,
    total_cost: statsSource.reduce((s, a) => s + (parseFloat(a.cost_estimate) || 0), 0),
  };

  return { actions: paged, total, stats, lastUpdated: new Date().toISOString() };
}

function demoAgents(fixtures) {
  const map = new Map();
  for (const a of fixtures.actions) {
    const prev = map.get(a.agent_id) || { agent_id: a.agent_id, agent_name: a.agent_name, action_count: 0, last_active: null };
    prev.action_count += 1;
    const ts = a.timestamp_start || null;
    if (ts && (!prev.last_active || ts > prev.last_active)) prev.last_active = ts;
    map.set(a.agent_id, prev);
  }
  const agents = Array.from(map.values()).sort((a, b) => (b.last_active || '').localeCompare(a.last_active || ''));
  return { agents, lastUpdated: new Date().toISOString() };
}

function demoActionDetail(fixtures, actionId) {
  const action = fixtures.actions.find(a => a.action_id === actionId) || null;
  if (!action) return null;
  const open_loops = fixtures.loops
    .filter(l => l.action_id === actionId)
    .map(({ agent_id, agent_name, declared_goal, action_type, ...rest }) => rest);
  const assumptions = fixtures.assumptions.filter(a => a.action_id === actionId);
  return { action, open_loops, assumptions };
}

function demoAssumptions(fixtures, url) {
  const sp = url.searchParams;
  const drift = sp.get('drift') === 'true';
  const agentId = sp.get('agent_id') || undefined;
  const actionId = sp.get('action_id') || undefined;
  const limit = Math.min(parseInt(sp.get('limit') || '50', 10), 200);
  const offset = parseInt(sp.get('offset') || '0', 10);

  let items = fixtures.assumptions.slice();
  if (agentId) items = items.filter(a => a.agent_id === agentId);
  if (actionId) items = items.filter(a => a.action_id === actionId);

  items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  const total = items.length;
  const paged = items.slice(offset, offset + limit);

  if (!drift) {
    return { assumptions: paged, total, lastUpdated: new Date().toISOString() };
  }

  const now = Date.now();
  let atRisk = 0;
  for (const asm of paged) {
    if (asm.validated === 1) {
      asm.drift_score = 0;
    } else if (asm.invalidated === 1) {
      asm.drift_score = null;
    } else {
      const createdAt = new Date(asm.created_at).getTime();
      const daysOld = (now - createdAt) / (1000 * 60 * 60 * 24);
      asm.drift_score = Math.min(100, Math.round((daysOld / 30) * 100));
      if (asm.drift_score >= 50) atRisk++;
    }
  }

  return {
    assumptions: paged,
    total,
    drift_summary: {
      total,
      at_risk: atRisk,
      validated: paged.filter(a => a.validated === 1).length,
      invalidated: paged.filter(a => a.invalidated === 1).length,
      unvalidated: paged.filter(a => a.validated === 0 && a.invalidated === 0).length,
    },
    lastUpdated: new Date().toISOString(),
  };
}

function demoLearning(fixtures, url) {
  const agentId = url.searchParams.get('agent_id');
  const decisions = agentId ? fixtures.decisions.filter(d => d.agent_id === agentId) : fixtures.decisions;
  const lessons = fixtures.lessons;

  const successCount = decisions.filter(d => d.outcome === 'success').length;
  const totalWithOutcome = decisions.filter(d => d.outcome && d.outcome !== 'pending').length;
  const successRate = totalWithOutcome > 0 ? Math.round((successCount / totalWithOutcome) * 100) : 0;

  const stats = {
    totalDecisions: decisions.length,
    totalLessons: lessons.length,
    successRate,
    patterns: lessons.filter(l => (l.confidence || 0) >= 80).length,
  };

  return { decisions: decisions.slice(0, 20), lessons, stats, lastUpdated: new Date().toISOString() };
}

function demoLearningRecommendations(fixtures, url) {
  const sp = url.searchParams;
  const agentId = sp.get('agent_id') || undefined;
  const actionType = sp.get('action_type') || undefined;
  const limit = Math.min(parseInt(sp.get('limit') || '50', 10), 200);
  const includeInactive = sp.get('include_inactive') === 'true';

  let recs = fixtures.recommendations.slice();
  if (agentId) recs = recs.filter(r => r.agent_id === agentId);
  if (actionType) recs = recs.filter(r => r.action_type === actionType);
  if (!includeInactive) recs = recs.filter(r => r.active);

  return {
    recommendations: recs.slice(0, limit),
    metrics: undefined,
    lookback_days: 30,
    total: Math.min(limit, recs.length),
    lastUpdated: new Date().toISOString(),
  };
}

function demoLearningRecommendationMetrics(fixtures, url) {
  const sp = url.searchParams;
  const agentId = sp.get('agent_id') || undefined;
  const actionType = sp.get('action_type') || undefined;
  const limit = Math.min(parseInt(sp.get('limit') || '100', 10), 200);

  let metrics = fixtures.metrics.slice();
  if (agentId) metrics = metrics.filter(m => m.agent_id === agentId);
  if (actionType) metrics = metrics.filter(m => m.action_type === actionType);

  return {
    metrics: metrics.slice(0, limit),
    summary: fixtures.metricsSummary,
    lookback_days: 30,
    lastUpdated: new Date().toISOString(),
  };
}

function demoTokens(fixtures) {
  return {
    current: fixtures.tokensCurrent,
    today: fixtures.tokensToday,
    history: fixtures.tokenHistory.slice().reverse(),
    timeline: [],
    lastUpdated: new Date().toISOString(),
  };
}

function demoSwarmGraph(fixtures, url) {
  // Demo goal: a readable, "alive-looking" graph that sells the concept.
  // We intentionally show the most active subset of agents to keep the map uncluttered.
  const swarmId = url.searchParams.get('swarm_id') || 'all';

  // Aggregate from fixture actions.
  const byAgent = new Map();
  for (const a of fixtures.actions) {
    const id = a.agent_id;
    if (!id) continue;
    const prev = byAgent.get(id) || { id, name: a.agent_name || id, actions: 0, riskSum: 0, riskN: 0, costSum: 0 };
    prev.actions += 1;
    const r = parseFloat(a.risk_score || 0);
    if (Number.isFinite(r)) {
      prev.riskSum += r;
      prev.riskN += 1;
    }
    const c = parseFloat(a.cost_estimate || 0);
    if (Number.isFinite(c)) prev.costSum += c;
    byAgent.set(id, prev);
  }

  const agents = Array.from(byAgent.values())
    .sort((a, b) => (b.actions - a.actions) || String(a.id).localeCompare(String(b.id)));

  const MAX_NODES = 18;
  const chosen = agents.slice(0, MAX_NODES);

  const nodes = chosen.map((a) => ({
    id: a.id,
    name: a.name,
    actions: a.actions,
    risk: a.riskN ? (a.riskSum / a.riskN) : 0,
    cost: Math.round(a.costSum * 100) / 100,
    val: Math.log10((a.actions || 1) + 1) * 10,
  }));

  const ids = nodes.map(n => n.id);
  const idSet = new Set(ids);

  // Deterministic, clustered links for "swarm" feel.
  const links = [];
  const clusterSize = 6;
  for (let i = 0; i < ids.length; i++) {
    const src = ids[i];
    const ringTgt = ids[(i + 1) % ids.length];
    links.push({ source: src, target: ringTgt, weight: 4 + (i % 7) });

    const c0 = Math.floor(i / clusterSize) * clusterSize;
    const p1 = ids[c0 + ((i + 2) % clusterSize)] || null;
    const p2 = ids[c0 + ((i + 4) % clusterSize)] || null;
    if (p1 && idSet.has(p1)) links.push({ source: src, target: p1, weight: 8 + (i % 9) });
    if (p2 && idSet.has(p2)) links.push({ source: src, target: p2, weight: 6 + (i % 5) });
  }

  // Add a few cross-cluster edges to avoid looking partitioned.
  if (ids.length >= 12) {
    links.push({ source: ids[1], target: ids[9], weight: 7 });
    links.push({ source: ids[3], target: ids[12], weight: 5 });
    links.push({ source: ids[8], target: ids[14], weight: 6 });
  }

  return {
    nodes,
    links,
    swarm_id: swarmId,
    total_agents: nodes.length,
    total_links: links.length,
  };
}

// SECURITY: In-memory rate limiting is local to the instance.
// For production multi-region deployments, use Redis or Upstash.
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // requests per window

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now - record.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { timestamp: now, count: 1 });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

// SECURITY: Timing-safe string comparison to prevent timing attacks
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) {
    // Still do a "fake" comparison to keep timing somewhat consistent
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(a));
    return false;
  }
  
  const aBuf = new TextEncoder().encode(a);
  const bBuf = new TextEncoder().encode(b);
  
  if (aBuf.length !== bBuf.length) return false;

  let result = 0;
  for (let i = 0; i < aBuf.length; i++) {
    result |= aBuf[i] ^ bBuf[i];
  }
  return result === 0;
}

// SECURITY: Hash API key using Web Crypto API (Edge-compatible)
async function hashApiKey(key) {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// In-memory cache for API key -> org resolution (5-min TTL)
const apiKeyCache = new Map();
const API_KEY_CACHE_TTL = 5 * 60 * 1000;

async function resolveApiKey(keyHash) {
  const now = Date.now();
  const cached = apiKeyCache.get(keyHash);
  if (cached && now - cached.timestamp < API_KEY_CACHE_TTL) {
    return cached.result;
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT ak.org_id, ak.role, ak.revoked_at
      FROM api_keys ak
      WHERE ak.key_hash = ${keyHash}
      LIMIT 1
    `;

    if (rows.length === 0) {
      apiKeyCache.set(keyHash, { timestamp: now, result: null });
      return null;
    }

    const row = rows[0];
    if (row.revoked_at) {
      apiKeyCache.set(keyHash, { timestamp: now, result: null });
      return null;
    }

    const result = { orgId: row.org_id, role: row.role };
    apiKeyCache.set(keyHash, { timestamp: now, result });

    // Update last_used_at (fire and forget)
    sql`UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE key_hash = ${keyHash}`.catch(() => {});

    return result;
  } catch (err) {
    console.error('[AUTH] API key lookup failed:', err.message);
    return null;
  }
}

// SECURITY: CORS - restrict to deployment origin
function getCorsHeaders(request) {
  const origin = request.headers.get('origin');
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '';

  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Access-Control-Max-Age': '86400',
  };

  // In dev mode (no ALLOWED_ORIGIN set), allow the requesting origin
  // In production, only allow the configured origin
  if (allowedOrigin && origin === allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
  } else if (!allowedOrigin && process.env.NODE_ENV === 'development') {
    headers['Access-Control-Allow-Origin'] = origin || '*';
  }
  // In production with no match, no Access-Control-Allow-Origin header is set (blocks CORS)

  return headers;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const mode = getDashclawMode();
  const demoCookie = isDemoCookieSet(request);

  // /demo is always a public entrypoint: it sets a non-secret cookie and forwards into the dashboard.
  // This makes the live demo work even if the deployment forgot to set DASHCLAW_MODE=demo.
  if (pathname === '/demo') {
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.set('dashclaw_demo', '1', {
      path: '/',
      maxAge: 60 * 60 * 24, // 24h
      sameSite: 'lax',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
    });
    addSecurityHeaders(response);
    return response;
  }

  // Demo sandbox mode:
  // - Serve the REAL dashboard UI.
  // - Back /api/* reads with deterministic fixtures.
  // - Block all writes (no secrets, no mutations).
  if (mode === 'demo' || demoCookie) {
    if (pathname.startsWith('/api/')) {
      if (request.method === 'OPTIONS') {
        return new NextResponse(null, { status: 204, headers: getCorsHeaders(request) });
      }

      const method = request.method.toUpperCase();
      const isRead = method === 'GET' || method === 'HEAD';
      if (!isRead) {
        return demoJson(request, { error: 'Demo mode: write APIs are disabled.' }, 403);
      }

      // Allow NextAuth internals and raw markdown passthrough (these do not write data).
      if (pathname.startsWith('/api/auth') || pathname.startsWith('/api/docs/raw') || pathname.startsWith('/api/prompts/')) {
        const response = NextResponse.next();
        addSecurityHeaders(response);
        withCors(request, response);
        return response;
      }

      const fixtures = getDemoFixtures();
      const url = parseUrl(request);
      const segments = getPathSegments(pathname);

      // SSE is allowed to keep UI stable. We attach demo org headers for getOrgId().
      if (pathname.startsWith('/api/stream')) {
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-org-id', 'org_demo');
        requestHeaders.set('x-org-role', 'admin');
        const response = NextResponse.next({ request: { headers: requestHeaders } });
        addSecurityHeaders(response);
        withCors(request, response);
        return response;
      }

      // Health + onboarding
      if (pathname === '/api/health') {
        return demoJson(request, {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: 'demo',
          checks: { demo: { status: 'healthy' } },
        });
      }

      if (pathname === '/api/onboarding/status') {
        return demoJson(request, {
          onboarding_required: false,
          org_id: 'org_demo',
          steps: {
            workspace_created: true,
            api_key_exists: true,
            first_action_sent: true,
          },
        });
      }

      // Agents + actions
      if (pathname === '/api/agents') {
        return demoJson(request, demoAgents(fixtures));
      }

      if (pathname === '/api/actions') {
        return demoJson(request, demoListActions(fixtures, url));
      }

      if (pathname === '/api/actions/signals') {
        const agentId = url.searchParams.get('agent_id');
        const signals = agentId ? fixtures.signals.filter(s => s.agent_id === agentId) : fixtures.signals;
        return demoJson(request, {
          signals,
          counts: {
            red: signals.filter(s => s.severity === 'red').length,
            amber: signals.filter(s => s.severity === 'amber').length,
            total: signals.length,
          },
          lastUpdated: new Date().toISOString(),
        });
      }

      if (pathname === '/api/actions/loops') {
        const sp = url.searchParams;
        const agentId = sp.get('agent_id') || undefined;
        const limit = Math.min(parseInt(sp.get('limit') || '50', 10), 200);
        const offset = parseInt(sp.get('offset') || '0', 10);
        let loops = fixtures.loops.slice();
        if (agentId) loops = loops.filter(l => l.agent_id === agentId);
        const total = loops.length;
        const paged = loops.slice(offset, offset + limit);
        const stats = {
          open_count: String(loops.length),
          resolved_count: '0',
          critical_open: String(loops.filter(l => l.priority === 'critical').length),
          high_open: String(loops.filter(l => l.priority === 'high').length),
        };
        return demoJson(request, { loops: paged, total, stats, lastUpdated: new Date().toISOString() });
      }

      if (pathname === '/api/actions/assumptions') {
        return demoJson(request, demoAssumptions(fixtures, url));
      }

      if (segments[0] === 'api' && segments[1] === 'actions' && segments.length === 3) {
        const actionId = segments[2];
        const detail = demoActionDetail(fixtures, actionId);
        if (!detail) return demoJson(request, { error: 'Action not found' }, 404);
        return demoJson(request, detail);
      }

      // Dashboard widgets
      if (pathname === '/api/goals') {
        return demoJson(request, { goals: fixtures.goals, stats: { totalGoals: fixtures.goals.length }, lastUpdated: new Date().toISOString() });
      }

      if (pathname === '/api/learning') {
        return demoJson(request, demoLearning(fixtures, url));
      }

      if (pathname === '/api/learning/recommendations') {
        return demoJson(request, demoLearningRecommendations(fixtures, url));
      }

      if (pathname === '/api/learning/recommendations/metrics') {
        return demoJson(request, demoLearningRecommendationMetrics(fixtures, url));
      }

      if (pathname === '/api/relationships') {
        const contacts = fixtures.contacts;
        const today = new Date().toISOString().slice(0, 10);
        const followUpsDue = contacts.filter(c => c.followUpDate && c.followUpDate <= today).length;
        const stats = {
          total: contacts.length,
          hot: contacts.filter(c => c.temperature === 'HOT').length,
          warm: contacts.filter(c => c.temperature === 'WARM').length,
          cold: contacts.filter(c => c.temperature === 'COLD').length,
          followUpsDue,
        };
        return demoJson(request, { contacts, interactions: [], stats, lastUpdated: new Date().toISOString() });
      }

      if (pathname === '/api/calendar') {
        return demoJson(request, { events: fixtures.events, lastUpdated: new Date().toISOString(), count: fixtures.events.length });
      }

      if (pathname === '/api/inspiration') {
        return demoJson(request, { ideas: fixtures.ideas, stats: { totalIdeas: fixtures.ideas.length }, lastUpdated: new Date().toISOString() });
      }

      if (pathname === '/api/settings') {
        return demoJson(request, { settings: fixtures.settings });
      }

      if (pathname === '/api/agents/connections') {
        const agentId = url.searchParams.get('agent_id');
        const connections = agentId ? fixtures.connections.filter(c => c.agent_id === agentId) : fixtures.connections;
        return demoJson(request, { connections, total: connections.length });
      }

      if (pathname === '/api/memory') {
        return demoJson(request, { ...fixtures.memory, lastUpdated: new Date().toISOString() });
      }

      if (pathname === '/api/tokens') {
        return demoJson(request, demoTokens(fixtures));
      }

      if (pathname === '/api/usage') {
        return demoJson(request, fixtures.usage);
      }

      if (pathname === '/api/swarm/graph') {
        return demoJson(request, demoSwarmGraph(fixtures, url));
      }

      if (pathname === '/api/security/status') {
        return demoJson(request, fixtures.securityStatus);
      }

      if (pathname === '/api/pairings') {
        const status = url.searchParams.get('status') || 'pending';
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
        const pairings = fixtures.pairings.filter(p => p.status === status).slice(0, limit);
        return demoJson(request, { pairings });
      }

      if (segments[0] === 'api' && segments[1] === 'pairings' && segments.length === 3) {
        const pairingId = segments[2];
        const pairing = fixtures.pairings.find(p => p.id === pairingId) || null;
        if (!pairing) return demoJson(request, { error: 'Pairing not found' }, 404);
        return demoJson(request, { pairing });
      }

      return demoJson(request, { error: 'Demo mode: endpoint disabled.' }, 403);
    }

    // Demo pages are public: skip NextAuth session enforcement.
    return NextResponse.next();
  }

  // Page routes (non-API): check NextAuth session
  if (!pathname.startsWith('/api/')) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    // /login — redirect to dashboard if already logged in
    if (pathname === '/login') {
      if (token) return NextResponse.redirect(new URL('/dashboard', request.url));
      return NextResponse.next();
    }

    // All other matched page routes — require session
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: getCorsHeaders(request) });
  }

  // Allow public routes without auth
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    const response = NextResponse.next();
    for (const [k, v] of Object.entries(getCorsHeaders(request))) response.headers.set(k, v);
    return response;
  }

  // Check if this is a protected API route
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

  // Get client IP for rate limiting (Vercel sets x-forwarded-for from trusted proxy)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') ||
             'unknown';

  // Apply rate limiting to all API routes
  if (!checkRateLimit(ip)) {
    console.warn(`[SECURITY] Rate limit exceeded for ${ip}: ${pathname}`);
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please slow down.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  if (isProtectedRoute) {
    // SECURITY: Only accept API key via header (not query params - those leak in logs/URLs)
    const apiKey = request.headers.get('x-api-key');

    // Get expected API key from environment
    const expectedKey = process.env.DASHCLAW_API_KEY;

    // SECURITY: Strip any externally-provided org headers (prevent injection)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete('x-org-id');
    requestHeaders.delete('x-org-role');

    // If no API key is configured:
    // - dev/local: allow with org_default (convenience)
    // - production: block (prevents accidentally exposing your dashboard data)
    if (!expectedKey) {
      // SECURITY: Fail closed if not strictly in development mode
      if (process.env.NODE_ENV !== 'development') {
        console.warn(`[SECURITY] DASHCLAW_API_KEY not set - blocking access to: ${pathname}`);
        return NextResponse.json(
          { error: 'Server misconfigured: set DASHCLAW_API_KEY to protect /api/* endpoints.' },
          { status: 503 }
        );
      }
      // Dev mode: allow through with default org
      requestHeaders.set('x-org-id', 'org_default');
      requestHeaders.set('x-org-role', 'admin');
      const response = NextResponse.next({ request: { headers: requestHeaders } });
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      for (const [k, v] of Object.entries(getCorsHeaders(request))) response.headers.set(k, v);
      return response;
    }

    // No key provided — check if this is a same-origin dashboard request
    if (!apiKey) {
      const secFetchSite = request.headers.get('sec-fetch-site');
      
      // SECURITY: Only trust Sec-Fetch-Site for same-origin detection.
      const isSameOrigin = secFetchSite === 'same-origin';

      if (isSameOrigin) {
        // Resolve org from NextAuth session token
        const sessionToken = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        
        if (!sessionToken) {
          return NextResponse.json({ error: 'Unauthorized - Session required' }, { status: 401 });
        }

        const orgId = sessionToken.orgId || 'org_default';
        const role = sessionToken.role || 'member';


        // SECURITY: Users on org_default are only allowed to access onboarding and health APIs
        const ONBOARDING_PREFIXES = ['/api/onboarding', '/api/setup', '/api/health'];
        const isAllowedForOnboarding = ONBOARDING_PREFIXES.some(p => pathname.startsWith(p));

        if (orgId === 'org_default' && !isAllowedForOnboarding) {
          console.warn(`[SECURITY] Blocked org_default access to: ${pathname} from user ${sessionToken.userId}`);
          return NextResponse.json(
            { error: 'Forbidden - Complete onboarding to access this resource', needsOnboarding: true },
            { status: 403 }
          );
        }

        requestHeaders.set('x-org-id', orgId);
        requestHeaders.set('x-org-role', role);
        requestHeaders.set('x-user-id', sessionToken.userId || '');
        const response = NextResponse.next({ request: { headers: requestHeaders } });
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('X-Frame-Options', 'DENY');
        response.headers.set('X-XSS-Protection', '1; mode=block');
        for (const [k, v] of Object.entries(getCorsHeaders(request))) response.headers.set(k, v);
        return response;
      }

      console.warn(`[SECURITY] Missing API key: ${pathname} from ${ip}`);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing API key' },
        { status: 401 }
      );
    }

    // Fast path: legacy DASHCLAW_API_KEY matches → org_default
    if (timingSafeEqual(apiKey, expectedKey)) {
      requestHeaders.set('x-org-id', 'org_default');
      requestHeaders.set('x-org-role', 'admin');
      const response = NextResponse.next({ request: { headers: requestHeaders } });
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      for (const [k, v] of Object.entries(getCorsHeaders(request))) response.headers.set(k, v);
      return response;
    }

    // Slow path: hash the key and look up in api_keys table
    const keyHash = await hashApiKey(apiKey);
    const resolved = await resolveApiKey(keyHash);

    if (!resolved) {
      console.warn(`[SECURITY] Unauthorized API access attempt: ${pathname} from ${ip}`);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing API key' },
        { status: 401 }
      );
    }

    requestHeaders.set('x-org-id', resolved.orgId);
    requestHeaders.set('x-org-role', resolved.role);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    for (const [k, v] of Object.entries(getCorsHeaders(request))) response.headers.set(k, v);
    return response;
  }

  // Non-protected API routes: add security headers + CORS
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  for (const [k, v] of Object.entries(getCorsHeaders(request))) response.headers.set(k, v);

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/demo',
    '/dashboard',
    '/dashboard/:path*',
    '/swarm',
    '/swarm/:path*',
    '/approvals',
    '/approvals/:path*',
    '/actions',
    '/actions/:path*',
    '/goals',
    '/goals/:path*',
    '/learning',
    '/learning/:path*',
    '/content',
    '/content/:path*',
    '/relationships',
    '/relationships/:path*',
    '/integrations',
    '/integrations/:path*',
    '/workflows',
    '/workflows/:path*',
    '/pair',
    '/pair/:path*',
    '/pairings',
    '/pairings/:path*',
    '/bounty-hunter',
    '/bounty-hunter/:path*',
    '/calendar',
    '/calendar/:path*',
    '/security',
    '/security/:path*',
    '/tokens',
    '/tokens/:path*',
    '/setup',
    '/setup/:path*',
    '/api-keys',
    '/api-keys/:path*',
    '/team',
    '/team/:path*',
    '/usage',
    '/usage/:path*',
    '/activity',
    '/activity/:path*',
    '/webhooks',
    '/webhooks/:path*',
    '/notifications',
    '/notifications/:path*',
    '/messages',
    '/messages/:path*',
    '/workspace',
    '/workspace/:path*',
    '/policies',
    '/policies/:path*',
    '/invite/:path*',
    '/login',
  ],
};
