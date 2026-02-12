import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getOrgId, getOrgRole, getUserId } from '../../lib/org.js';
import { logActivity } from '../../lib/audit.js';
import { encrypt } from '../../lib/encryption.js';

export const dynamic = 'force-dynamic';

let _sql;
function getSql() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Don't throw at import time (Next builds/imports route handlers).
    // We only error when the endpoint is actually called.
    throw new Error('DATABASE_URL is not set. Add it to .env.local (or your hosting provider env vars).');
  }
  _sql = neon(url);
  return _sql;
}

// Initialize settings table if it doesn't exist
async function ensureSettingsTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      org_id TEXT NOT NULL DEFAULT 'org_default',
      agent_id TEXT,
      key TEXT NOT NULL,
      value TEXT,
      category TEXT DEFAULT 'general',
      encrypted BOOLEAN DEFAULT false,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS settings_org_agent_key_unique
    ON settings (org_id, COALESCE(agent_id, ''), key)
  `;
}

// GET - Fetch all settings or specific key
// When ?agent_id=X is provided, returns merged settings (agent overrides org defaults)
// When no agent_id, returns only org-level settings (agent_id IS NULL)
export async function GET(request) {
  try {
    const sql = getSql();
    await ensureSettingsTable(sql);
    const orgId = getOrgId(request);

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const category = searchParams.get('category');
    const agentId = searchParams.get('agent_id');

    let settings;
    if (agentId) {
      // Merged query: agent-specific rows override org-level defaults
      // DISTINCT ON (key) with ORDER BY agent_id NULLS LAST means agent-specific wins
      if (key) {
        settings = await sql`
          SELECT DISTINCT ON (key) *,
            CASE WHEN agent_id IS NULL THEN true ELSE false END AS is_inherited
          FROM settings
          WHERE org_id = ${orgId} AND (agent_id = ${agentId} OR agent_id IS NULL) AND key = ${key}
          ORDER BY key, agent_id NULLS LAST
        `;
      } else if (category) {
        settings = await sql`
          SELECT DISTINCT ON (key) *,
            CASE WHEN agent_id IS NULL THEN true ELSE false END AS is_inherited
          FROM settings
          WHERE org_id = ${orgId} AND (agent_id = ${agentId} OR agent_id IS NULL) AND category = ${category}
          ORDER BY key, agent_id NULLS LAST
        `;
      } else {
        settings = await sql`
          SELECT DISTINCT ON (key) *,
            CASE WHEN agent_id IS NULL THEN true ELSE false END AS is_inherited
          FROM settings
          WHERE org_id = ${orgId} AND (agent_id = ${agentId} OR agent_id IS NULL)
          ORDER BY key, agent_id NULLS LAST
        `;
      }
    } else {
      // Org-level only (no agent filter)
      if (key) {
        settings = await sql`SELECT *, false AS is_inherited FROM settings WHERE key = ${key} AND org_id = ${orgId} AND agent_id IS NULL`;
      } else if (category) {
        settings = await sql`SELECT *, false AS is_inherited FROM settings WHERE category = ${category} AND org_id = ${orgId} AND agent_id IS NULL ORDER BY key`;
      } else {
        settings = await sql`SELECT *, false AS is_inherited FROM settings WHERE org_id = ${orgId} AND agent_id IS NULL ORDER BY category, key`;
      }
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
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
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

// POST - Create or update setting (admin only)
// Accepts optional agent_id in body for per-agent settings
export async function POST(request) {
  try {
    const sql = getSql();
    await ensureSettingsTable(sql);
    const orgId = getOrgId(request);

    if (getOrgRole(request) !== 'admin') {
      return NextResponse.json({ error: 'Admin access required to modify settings' }, { status: 403 });
    }

    const body = await request.json();
    const { key, value, category = 'general', encrypted = false, agent_id = null } = body;

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

    // SECURITY: Validate agent_id length if provided
    if (agent_id && agent_id.length > 255) {
      return NextResponse.json({ error: 'agent_id too long (max 255 chars)' }, { status: 400 });
    }

    let finalValue = value;
    if (encrypted && value) {
      try {
        finalValue = encrypt(value);
      } catch (err) {
        console.error('[SETTINGS] Encryption failed:', err.message);
        return NextResponse.json({ error: 'Server configuration error: encryption failed' }, { status: 500 });
      }
    }

    // Use COALESCE-based conflict target matching the functional unique index
    await sql`
      INSERT INTO settings (org_id, agent_id, key, value, category, encrypted, updated_at)
      VALUES (${orgId}, ${agent_id}, ${key}, ${finalValue}, ${category}, ${encrypted}, NOW())
      ON CONFLICT (org_id, COALESCE(agent_id, ''), key) DO UPDATE SET
        value = ${finalValue},
        category = ${category},
        encrypted = ${encrypted},
        updated_at = NOW()
    `;

    logActivity({
      orgId, actorId: getUserId(request) || 'unknown', action: 'setting.updated',
      resourceType: 'setting', resourceId: key,
      details: { category, agent_id: agent_id || null }, request,
    }, sql);

    return NextResponse.json({ success: true, key, agent_id });
  } catch (error) {
    console.error('Settings POST error:', error);
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
  }
}

// DELETE - Remove a setting (admin only)
// When ?agent_id=X is provided, deletes agent-specific row only
// When no agent_id, deletes org-level row (agent_id IS NULL) only
export async function DELETE(request) {
  try {
    const sql = getSql();
    await ensureSettingsTable(sql);
    const orgId = getOrgId(request);

    if (getOrgRole(request) !== 'admin') {
      return NextResponse.json({ error: 'Admin access required to delete settings' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const agentId = searchParams.get('agent_id');

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    if (agentId) {
      await sql`DELETE FROM settings WHERE key = ${key} AND org_id = ${orgId} AND agent_id = ${agentId}`;
    } else {
      await sql`DELETE FROM settings WHERE key = ${key} AND org_id = ${orgId} AND agent_id IS NULL`;
    }

    logActivity({
      orgId, actorId: getUserId(request) || 'unknown', action: 'setting.deleted',
      resourceType: 'setting', resourceId: key,
      details: { agent_id: agentId || null }, request,
    }, sql);

    return NextResponse.json({ success: true, deleted: key, agent_id: agentId || null });
  } catch (error) {
    console.error('Settings DELETE error:', error);
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
  }
}

// Helper to mask sensitive values
function maskValue(value) {
  if (!value) return '';
  if (value.length <= 8) return '••••••••';
  return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4);
}
