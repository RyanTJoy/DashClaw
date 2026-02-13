import { NextResponse } from 'next/server';
import { getSql } from '../../lib/db.js';
import { isEmbeddingsEnabled } from '../../lib/embeddings.js';

/**
 * Health check endpoint for DashClaw
 * Returns system health status for monitoring
 */
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.3.0',
    checks: {}
  };

  // ... rest of checks ...
  health.checks.behavioral_ai = {
    active: isEmbeddingsEnabled(),
    engine: 'openai/text-embedding-3-small'
  };

  // Check database connection
  try {
    const sql = getSql();
    await sql`SELECT 1 as health_check`;
    health.checks.database = { status: 'healthy', latency: 'ok' };
  } catch (error) {
    health.status = 'degraded';
    health.checks.database = { status: 'unhealthy', error: error.message };
  }

  // Check runtime capabilities
  health.checks.runtime = {
    edge_compatible: typeof crypto !== 'undefined' && !!crypto.subtle,
    node_env: process.env.NODE_ENV || 'development'
  };

  // Check environment variables
  const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);

  if (missingVars.length > 0) {
    health.status = 'degraded';
    health.checks.environment = {
      status: 'unhealthy',
      missing: missingVars.length
    };
  } else {
    health.checks.environment = { status: 'healthy' };
  }

  // SECURITY: Don't expose auth configuration status to public endpoint

  const statusCode = health.status === 'healthy' ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
