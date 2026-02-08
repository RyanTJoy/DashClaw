import { NextResponse } from 'next/server';

/**
 * Authentication middleware for OpenClaw Dashboard
 *
 * SECURITY: Protects API routes with API key authentication
 * Set DASHBOARD_API_KEY environment variable in production
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
];

// Routes that are always public (health checks, setup)
const PUBLIC_ROUTES = [
  '/api/health',
  '/api/setup/status',
];

// Simple in-memory rate limiting (resets on deploy)
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
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
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
  } else if (!allowedOrigin && process.env.NODE_ENV !== 'production') {
    headers['Access-Control-Allow-Origin'] = origin || '*';
  }
  // In production with no match, no Access-Control-Allow-Origin header is set (blocks CORS)

  return headers;
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip non-API routes
  if (!pathname.startsWith('/api/')) {
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
    const expectedKey = process.env.DASHBOARD_API_KEY;

    // If no API key is configured:
    // - dev/local: allow (convenience)
    // - production: block (prevents accidentally exposing your dashboard data)
    if (!expectedKey) {
      if (process.env.NODE_ENV === 'production') {
        console.warn(`[SECURITY] DASHBOARD_API_KEY not set in production - blocking access to: ${pathname}`);
        return NextResponse.json(
          { error: 'Server misconfigured: set DASHBOARD_API_KEY to protect /api/* endpoints.' },
          { status: 503 }
        );
      }
      console.log(`[INFO] DASHBOARD_API_KEY not set (dev) - allowing unauthenticated access to: ${pathname}`);
      return NextResponse.next();
    }

    // SECURITY: Timing-safe API key validation
    if (!apiKey || !timingSafeEqual(apiKey, expectedKey)) {
      console.warn(`[SECURITY] Unauthorized API access attempt: ${pathname} from ${ip}`);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing API key' },
        { status: 401 }
      );
    }
  }

  // Add security headers + CORS
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  for (const [k, v] of Object.entries(getCorsHeaders(request))) response.headers.set(k, v);

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
