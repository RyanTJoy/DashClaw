# Security Guide

DashClaw takes security seriously. This guide covers how we protect your data and how you can run your own security audits.

## How We Protect Your Data

### Credentials Storage
- All API keys and credentials are stored **encrypted** in your Postgres database using **AEAD** (AES-256-GCM).
- **IMPORTANT**: You must set a 32-character `ENCRYPTION_KEY` environment variable for encryption to function (exactly 32 chars).
- Credentials never touch client-side code in plaintext.
- Environment variables used for all sensitive configuration.
- No credentials are ever logged or exposed in error messages.

### API Security
- All API endpoints validate required fields and enforce string length limits.
- **Optional Signatures**: Agent actions can include a cryptographic signature; strict enforcement is controlled by `ENFORCE_AGENT_SIGNATURES=true`.
- **Fail-Closed Auth**: The system strictly blocks API access if environment variables are misconfigured in production.
- **Data Loss Prevention (DLP)**: Free-text ingestion endpoints are filtered for sensitive patterns (OpenAI keys, AWS credentials, etc.) and redacted before storage (including actions/loops/assumptions, shared docs/snippets/content, and bulk sync).
- **Third-Party Exfil Minimization**: Sensitive patterns are redacted before sending content to external LLM APIs (embeddings + semantic guardrails).
- **SSRF Protection**: Webhook/guard egress is hardened with HTTPS-only, DNS resolution, private-IP blocking, and redirect blocking.
- **Domain Allowlist**: Support for optional `WEBHOOK_ALLOWED_DOMAINS` environment variable to strictly limit external requests to trusted providers.
- **Guard Webhook Signing (Optional)**: If `GUARD_WEBHOOK_SECRET` is set, guard webhooks include `X-DashClaw-Timestamp` and `X-DashClaw-Signature` headers so receivers can verify authenticity.
- **Rate Limiting**: All `/api/*` routes, including unauthenticated public endpoints, are rate limited in middleware (best-effort per instance).
- Database connections use SSL/TLS encryption.
- CORS configured for your deployment domain only.
- No sensitive data in URL parameters (API keys must be in headers).

### Local Agent Security
- **Audit Log Redaction**: The local Python audit tools include a redaction engine to ensure secrets are never stored in plaintext in local SQLite databases.
- **State Isolation**: Agent state and credentials should be stored in the gitignored `secrets/` directory.

### What We DON'T Store
- We don't store your actual data - just references and metadata
- Token counts, not token content
- Relationship names, not conversation history
- Goal titles, not private details

## Security Checklist for Deployment

Before deploying, verify:

- [ ] `.env.local` is in `.gitignore` (it is by default)
- [ ] `DATABASE_URL` is set in Vercel environment variables, not in code
- [ ] No API keys hardcoded anywhere
- [ ] HTTPS enabled (automatic on Vercel)
- [ ] Access restricted to authorized users (consider Vercel password protection)

## Running a Security Audit

Use our included security scanner to check your deployment:

```bash
# From the project root
node scripts/security-scan.js
```

This checks for:
- Hardcoded secrets in source files
- Tracked sensitive files in git
- Missing .gitignore entries
- Exposed environment variables

## Credential Rotation

We recommend rotating credentials every 90 days:

1. Generate new credentials from the service provider
2. Update in Dashboard → Integrations → [Service] → Edit
3. Click "Test Connection" to verify
4. Save Settings

Track rotations with the included rotation reminder (coming soon).

## Reporting Security Issues

Found a vulnerability? Please email practicalsystems@gmail.com (or open a private GitHub issue).

We take all reports seriously and will respond within 48 hours.

## Security Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Browser       │────▶│   Vercel Edge   │────▶│   Neon DB       │
│   (Client)      │     │   (API Routes)  │     │   (Encrypted)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │ HTTPS only            │ SSL/TLS               │ Encrypted
        │ No secrets            │ Env vars only         │ at rest
        └───────────────────────┴───────────────────────┘
```

## Best Practices

1. **Use environment variables** - Never hardcode secrets
2. **Rotate regularly** - 90 days for API keys, immediately if exposed
3. **Audit before deploy** - Run the security scanner
4. **Monitor access** - Check Vercel/Neon logs periodically
5. **Keep dependencies updated** - `npm audit` regularly
