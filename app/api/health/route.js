import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

/**
 * Health check endpoint for DashClaw
 * Returns system health status for monitoring
 */
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks: {}
  };

  // Check database connection
  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`SELECT 1 as health_check`;
    health.checks.database = { status: 'healthy', latency: 'ok' };
  } catch (error) {
    health.status = 'degraded';
    health.checks.database = { status: 'unhealthy', error: 'Connection failed' };
  }

  // Check environment variables
  const requiredEnvVars = ['DATABASE_URL'];
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
