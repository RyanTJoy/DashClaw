import { NextResponse } from 'next/server';
import { getSql } from '../../../lib/db.js';

export const dynamic = 'force-dynamic';

// Check if the dashboard is properly configured
export async function GET() {
  try {
    const sql = getSql();
    
    // Check if settings table exists
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'settings'
    `;

    if (tables.length === 0) {
      return NextResponse.json({ 
        configured: false, 
        reason: 'no_tables',
        message: 'Database tables not created' 
      });
    }

    // All good!
    return NextResponse.json({ 
      configured: true,
      message: 'Dashboard is configured' 
    });

  } catch (error) {
    console.error('Setup status error:', error);
    return NextResponse.json({
      configured: false,
      reason: 'connection_error',
      message: 'Unable to connect to database'
    });
  }
}
