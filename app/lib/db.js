import { neon } from '@neondatabase/serverless';

let _sql;

/**
 * Standardized Database Connection Utility for DashClaw.
 * Handles production vs development safety checks and mock driver fallback.
 */
export function getSql() {
  if (_sql) return _sql;

  const url = process.env.DATABASE_URL;

  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL is not set in production. Database connection failed.');
    }
    
    console.warn('[DB] DATABASE_URL not set. Falling back to safe mock driver.');
    
    // Mock driver that mimics neon interface (callable + .query)
    const mockSql = async (strings, ...values) => {
      console.log('[DB-MOCK] Executed query:', strings[0]);
      return [];
    };
    mockSql.query = async (text, params) => {
      console.log('[DB-MOCK] Executed query with params:', text, params);
      return [];
    };
    return mockSql;
  }

  _sql = neon(url);
  return _sql;
}
