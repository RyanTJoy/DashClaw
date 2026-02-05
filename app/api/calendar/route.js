import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export async function GET() {
  try {
    // Get upcoming calendar events from Neon
    // Use AT TIME ZONE to properly handle EST timestamps
    const events = await sql`
      SELECT 
        id, 
        summary, 
        start_time AT TIME ZONE 'America/New_York' AS start_time,
        end_time AT TIME ZONE 'America/New_York' AS end_time, 
        location, 
        description 
      FROM calendar_events 
      WHERE start_time >= NOW() - INTERVAL '1 hour'
      ORDER BY start_time 
      LIMIT 10
    `;
    
    // Ensure timestamps include EST offset for proper client parsing
    const eventsWithTz = (events || []).map(event => ({
      ...event,
      start_time: event.start_time ? formatWithEST(event.start_time) : null,
      end_time: event.end_time ? formatWithEST(event.end_time) : null,
    }));
    
    return NextResponse.json({
      events: eventsWithTz,
      lastUpdated: new Date().toISOString(),
      count: eventsWithTz.length
    });
  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json({
      events: [],
      error: 'An error occurred while fetching calendar data',
      lastUpdated: new Date().toISOString()
    }, { status: 500 });
  }
}

// Format timestamp to include EST timezone offset
function formatWithEST(timestamp) {
  if (!timestamp) return null;
  
  // If it's already a string with timezone, return as-is
  if (typeof timestamp === 'string') {
    if (timestamp.includes('Z') || timestamp.includes('+') || timestamp.match(/-\d{2}:\d{2}$/)) {
      return timestamp;
    }
    // Naive datetime string - append EST offset
    return timestamp + '-05:00';
  }
  
  // If it's a Date object, format it in EST
  if (timestamp instanceof Date) {
    return timestamp.toLocaleString('sv-SE', { timeZone: 'America/New_York' }).replace(' ', 'T') + '-05:00';
  }
  
  return timestamp;
}
