import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export async function GET() {
  try {
    // Get upcoming calendar events from Neon
    const events = await sql`
      SELECT id, summary, start_time, end_time, location, description 
      FROM calendar_events 
      WHERE start_time >= NOW() - INTERVAL '1 hour'
      ORDER BY start_time 
      LIMIT 10
    `;
    
    // Add EST timezone offset to naive timestamps for proper client parsing
    const eventsWithTz = (events || []).map(event => ({
      ...event,
      // Timestamps from DB are in EST - append offset so JS parses correctly
      start_time: appendESTOffset(event.start_time),
      end_time: appendESTOffset(event.end_time),
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

function appendESTOffset(timestamp) {
  if (!timestamp) return null;
  
  // If already has timezone info, return as-is
  const str = String(timestamp);
  if (str.includes('Z') || str.includes('+') || str.match(/-\d{2}:\d{2}$/)) {
    return str;
  }
  
  // Convert Date object to ISO string without Z, then add EST offset
  if (timestamp instanceof Date) {
    const iso = timestamp.toISOString().replace('Z', '');
    return iso + '-05:00';
  }
  
  // Naive datetime string - append EST offset
  return str + '-05:00';
}
