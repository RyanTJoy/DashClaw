# Security Guide

OpenClaw Dashboard takes security seriously. This guide covers how we protect your data and how you can run your own security audits.

## How We Protect Your Data

### Credentials Storage
- All API keys and credentials are stored **encrypted** in your Neon database
- Credentials never touch client-side code
- Environment variables used for all sensitive configuration
- No credentials are ever logged or exposed in error messages

### API Security
- All API endpoints validate required fields
- Database connections use SSL/TLS encryption
- CORS configured for your deployment domain only
- No sensitive data in URL parameters

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

Found a vulnerability? Please email security@practicalsystems.io (or open a private GitHub issue).

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
