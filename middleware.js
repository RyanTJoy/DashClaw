import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { neon } from '@neondatabase/serverless';

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
    '/dashboard',
    '/dashboard/:path*',
    '/swarm',
    '/swarm/:path*',
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
