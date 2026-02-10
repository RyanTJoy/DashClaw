export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getOrgId } from '../../../lib/org.js';
import { createHash, randomUUID } from 'node:crypto';

// Security patterns for detecting sensitive data in text
// Ported from clawd-tools outbound_filter (regex-only, no shell usage)
const SECURITY_PATTERNS = [
  { name: 'api_key_generic', pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"]?([A-Za-z0-9_\-]{16,})['"]?/gi, category: 'api_key', severity: 'critical' },
  { name: 'aws_access_key', pattern: /AKIA[0-9A-Z]{16}/g, category: 'cloud_credential', severity: 'critical' },
  { name: 'aws_secret_key', pattern: /(?:aws)?[_-]?secret[_-]?(?:access)?[_-]?key\s*[:=]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/gi, category: 'cloud_credential', severity: 'critical' },
  { name: 'github_token', pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g, category: 'token', severity: 'critical' },
  { name: 'openai_key', pattern: /sk-[A-Za-z0-9]{20,}/g, category: 'api_key', severity: 'critical' },
  { name: 'anthropic_key', pattern: /sk-ant-[A-Za-z0-9_\-]{20,}/g, category: 'api_key', severity: 'critical' },
  { name: 'stripe_key', pattern: /(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{24,}/g, category: 'api_key', severity: 'critical' },
  { name: 'slack_token', pattern: /xox[bpsar]-[A-Za-z0-9\-]{10,}/g, category: 'token', severity: 'critical' },
  { name: 'jwt_token', pattern: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, category: 'token', severity: 'high' },
  { name: 'private_key', pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g, category: 'private_key', severity: 'critical' },
  { name: 'password_field', pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"]([^'"]{6,})['"]?/gi, category: 'password', severity: 'high' },
  { name: 'bearer_token', pattern: /Bearer\s+[A-Za-z0-9_\-\.]{20,}/g, category: 'token', severity: 'high' },
  { name: 'database_url', pattern: /(?:postgres|mysql|mongodb|redis):\/\/[^\s'"]{10,}/gi, category: 'connection_string', severity: 'critical' },
  { name: 'ssh_key_reference', pattern: /(?:id_rsa|id_ed25519|id_ecdsa)(?:\.pub)?/g, category: 'ssh', severity: 'medium' },
  { name: 'ip_address', pattern: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g, category: 'network', severity: 'low' },
  { name: 'email_address', pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, category: 'pii', severity: 'medium' },
  { name: 'phone_number', pattern: /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g, category: 'pii', severity: 'medium' },
];

function scanText(text) {
  const findings = [];
  let redacted = text;

  for (const { name, pattern, category, severity } of SECURITY_PATTERNS) {
    // Reset pattern lastIndex since we use global flag
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      findings.push({
        pattern: name,
        category,
        severity,
        position: match.index,
        length: match[0].length,
        preview: match[0].substring(0, 8) + '***',
      });
      // Redact in output
      redacted = redacted.replace(match[0], `[REDACTED:${name}]`);
    }
  }

  return { findings, redacted };
}

export async function POST(request) {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const orgId = getOrgId(request);
    const body = await request.json();

    const { text, destination, agent_id, store } = body;

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }
    if (typeof text !== 'string') {
      return NextResponse.json({ error: 'text must be a string' }, { status: 400 });
    }

    const { findings, redacted } = scanText(text);

    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    const categories = [...new Set(findings.map(f => f.category))];

    const result = {
      clean: findings.length === 0,
      findings_count: findings.length,
      critical_count: criticalCount,
      categories,
      findings,
      redacted_text: redacted,
      destination: destination || null,
    };

    // Optionally store metadata (never the actual content)
    if (store !== false && findings.length > 0) {
      const contentHash = createHash('sha256').update(text).digest('hex');
      const id = `sf_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
      const now = new Date().toISOString();

      await sql`
        INSERT INTO security_findings (id, org_id, agent_id, content_hash, findings_count, critical_count, categories, scanned_at)
        VALUES (${id}, ${orgId}, ${agent_id || null}, ${contentHash}, ${findings.length}, ${criticalCount}, ${JSON.stringify(categories)}, ${now})
      `.catch(err => console.error('Failed to store security finding metadata:', err.message));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Security scan POST error:', error);
    return NextResponse.json({ error: 'An error occurred during security scan' }, { status: 500 });
  }
}
