import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

const sql = neon(process.env.DATABASE_URL);

// Initialize settings table if it doesn't exist
async function ensureSettingsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      category TEXT DEFAULT 'general',
      encrypted BOOLEAN DEFAULT false,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

// GET - Fetch all settings or specific key
export async function GET(request) {
  try {
    await ensureSettingsTable();
    
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const category = searchParams.get('category');
    
    let settings;
    if (key) {
      settings = await sql`SELECT * FROM settings WHERE key = ${key}`;
    } else if (category) {
      settings = await sql`SELECT * FROM settings WHERE category = ${category} ORDER BY key`;
    } else {
      settings = await sql`SELECT * FROM settings ORDER BY category, key`;
    }
    
    // Mask encrypted values for display
    const masked = settings.map(s => ({
      ...s,
      value: s.encrypted ? maskValue(s.value) : s.value,
      hasValue: !!s.value
    }));
    
    return NextResponse.json({ settings: masked });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Allowlist of valid setting keys (security: prevent arbitrary key injection)
const VALID_SETTING_KEYS = [
  // AI Providers
  'OPENAI_API_KEY', 'OPENAI_ORG_ID', 'ANTHROPIC_API_KEY', 'GROQ_API_KEY',
  'TOGETHER_API_KEY', 'REPLICATE_API_TOKEN', 'HUGGINGFACE_API_KEY',
  'PERPLEXITY_API_KEY', 'ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID',
  // Databases
  'DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY',
  'PLANETSCALE_URL', 'MONGODB_URI', 'REDIS_URL', 'PINECONE_API_KEY', 'PINECONE_ENVIRONMENT',
  // Communication
  'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID',
  'DISCORD_GUILD_ID', 'SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET', 'SLACK_APP_TOKEN',
  'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER',
  'RESEND_API_KEY', 'SENDGRID_API_KEY',
  // Productivity
  'GOOGLE_ACCOUNT', 'GOOGLE_CREDENTIALS_PATH', 'NOTION_API_KEY', 'NOTION_PARENT_PAGE_ID',
  'LINEAR_API_KEY', 'AIRTABLE_API_KEY', 'AIRTABLE_BASE_ID', 'CALENDLY_API_KEY',
  // Development
  'GITHUB_TOKEN', 'GITHUB_USERNAME', 'VERCEL_TOKEN', 'VERCEL_PROJECT_ID',
  'RAILWAY_TOKEN', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID',
  'SENTRY_DSN', 'SENTRY_AUTH_TOKEN',
  // Social
  'TWITTER_API_KEY', 'TWITTER_API_SECRET', 'TWITTER_ACCESS_TOKEN', 'TWITTER_ACCESS_SECRET',
  'BRAVE_API_KEY', 'MOLTBOOK_API_KEY',
  // Payments
  'STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET',
  'LEMONSQUEEZY_API_KEY',
];

const VALID_CATEGORIES = ['integration', 'general', 'system'];

// POST - Create or update setting
export async function POST(request) {
  try {
    await ensureSettingsTable();
    
    const body = await request.json();
    const { key, value, category = 'general', encrypted = false } = body;
    
    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }
    
    // SECURITY: Validate key against allowlist
    if (!VALID_SETTING_KEYS.includes(key)) {
      return NextResponse.json({ error: `Invalid setting key: ${key}` }, { status: 400 });
    }
    
    // SECURITY: Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `Invalid category: ${category}` }, { status: 400 });
    }
    
    // SECURITY: Limit value length
    if (value && value.length > 10000) {
      return NextResponse.json({ error: 'Value too long (max 10000 chars)' }, { status: 400 });
    }
    
    await sql`
      INSERT INTO settings (key, value, category, encrypted, updated_at)
      VALUES (${key}, ${value}, ${category}, ${encrypted}, NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = ${value},
        category = ${category},
        encrypted = ${encrypted},
        updated_at = NOW()
    `;
    
    return NextResponse.json({ success: true, key });
  } catch (error) {
    console.error('Settings POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove a setting
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }
    
    await sql`DELETE FROM settings WHERE key = ${key}`;
    
    return NextResponse.json({ success: true, deleted: key });
  } catch (error) {
    console.error('Settings DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper to mask sensitive values
function maskValue(value) {
  if (!value) return '';
  if (value.length <= 8) return '••••••••';
  return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4);
}
