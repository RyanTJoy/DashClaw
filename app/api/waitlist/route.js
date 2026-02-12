export const dynamic = 'force-dynamic';
export const revalidate = 0;

let _sql;
function getSql() {
  if (!_sql) {
    const { neon } = require('@neondatabase/serverless');
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

// Ensure waitlist table exists (fallback if migration hasn't run)
let _tableChecked = false;
async function ensureTable() {
  if (_tableChecked) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS waitlist (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      signed_up_at TEXT NOT NULL,
      signup_count INTEGER DEFAULT 1,
      source TEXT DEFAULT 'landing_page',
      notes TEXT
    )
  `;
  _tableChecked = true;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Invalid email address' }, { status: 400 });
    }

    await ensureTable();
    const sql = getSql();
    const now = new Date().toISOString();

    await sql`
      INSERT INTO waitlist (email, signed_up_at, source)
      VALUES (${email}, ${now}, 'landing_page')
      ON CONFLICT (email) DO UPDATE SET
        signup_count = waitlist.signup_count + 1,
        source = COALESCE(EXCLUDED.source, waitlist.source)
    `;

    return Response.json({ success: true, email });
  } catch (err) {
    console.error('[WAITLIST] POST error:', err.message);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// SECURITY: GET handler removed — waitlist emails are PII.
// Query the database directly for waitlist signups.
