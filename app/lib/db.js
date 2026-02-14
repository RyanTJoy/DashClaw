import { neon } from '@neondatabase/serverless';
import postgres from 'postgres';

let _sql;

function parseHostname(dbUrl) {
  try {
    return new URL(dbUrl).hostname || '';
  } catch {
    return '';
  }
}

function isNeonUrl(dbUrl) {
  // Neon serverless URLs typically include ".neon.tech". Keep this heuristic simple and stable.
  return /\.neon\.tech(?:[/:?]|$)/i.test(String(dbUrl || ''));
}

/**
 * Standardized Database Connection Utility for DashClaw.
 *
 * - Neon URLs: use @neondatabase/serverless (fetch/WebSocket)
 * - Local/self-host Postgres URLs: use postgres (direct TCP)
 *
 * The returned object is a tagged-template function with a `.query(text, params)` method.
 */
export function getSql() {
  if (_sql) return _sql;

  const url = process.env.DATABASE_URL;

  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL is not set in production. Database connection failed.');
    }

    console.warn('[DB] DATABASE_URL not set. Falling back to safe mock driver.');

    // Mock driver that mimics the interface we use (callable tag + .query).
    const mockSql = async (strings) => {
      console.log('[DB-MOCK] Executed query:', strings?.[0] || '');
      return [];
    };
    mockSql.query = async (text, params) => {
      console.log('[DB-MOCK] Executed query with params:', text, params);
      return [];
    };
    _sql = mockSql;
    return _sql;
  }

  const driverOverride = String(process.env.DASHCLAW_DB_DRIVER || '').toLowerCase();
  const hostname = parseHostname(url);
  const shouldUseNeon =
    driverOverride === 'neon' ||
    (driverOverride !== 'postgres' && (isNeonUrl(url) || hostname.endsWith('neon.tech')));

  if (shouldUseNeon) {
    _sql = neon(url);
    return _sql;
  }

  // Direct TCP connection for local/self-host Postgres.
  const max = (() => {
    const v = parseInt(String(process.env.DASHCLAW_DB_POOL_MAX || ''), 10);
    return Number.isFinite(v) && v > 0 ? v : 10;
  })();

  const client = postgres(url, { max });

  // Provide a neon-like surface: tag + `.query(text, params)`.
  const sql = (...args) => client(...args);
  sql.query = async (text, params = []) => client.unsafe(text, params);
  sql.end = async (opts) => client.end(opts);

  _sql = sql;
  return _sql;
}
