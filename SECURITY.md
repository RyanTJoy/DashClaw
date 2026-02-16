# Security Advisory

## Known Vulnerabilities

### xlsx Package (High Severity - Accepted Risk)

**Status**: No fix available
**Last Checked**: 2026-02-16
**Severity**: High
**Package**: xlsx@0.18.5

#### Vulnerabilities

1. **Prototype Pollution (GHSA-4r6h-8v6p-xvw6)**
   - CVSS: 7.8
   - Attack Vector: Local (AV:L), requires user interaction (UI:R)
   - Impact: High confidentiality, integrity, and availability impact
   - Fix Required: >= 0.19.3 (not yet published to npm)

2. **Regular Expression Denial of Service (GHSA-5pgg-2g8v-p4x9)**
   - CVSS: 7.5
   - Attack Vector: Network (AV:N), no user interaction required
   - Impact: High availability impact (DoS)
   - Fix Required: >= 0.20.2 (not yet published to npm)

#### Impact Assessment

The xlsx library is used exclusively in **client-side document export** (`app/lib/docExport.js`):
- Functionality: Export markdown content to Excel (.xlsx) format
- Execution Context: Browser only (not server-side)
- Input Source: User-generated markdown content within the application
- Attack Surface: **Low** - only affects users exporting their own data

#### Mitigations

1. **Input Validation**: The export function only processes markdown that users create within DashClaw
2. **Client-Side Execution**: Vulnerabilities cannot be exploited server-side
3. **User-Initiated**: Export functionality requires explicit user action
4. **No External Input**: Library does not process untrusted external files

#### Risk Acceptance Rationale

- Latest available version (0.18.5) is already installed
- Required patch versions (0.19.3+, 0.20.2+) are not published to npm registry
- Alternative: Switch to a different Excel library (e.g., exceljs, xlsx-js-style)
- Current risk is **acceptable** given limited attack surface and client-side execution

#### Monitoring

- Check for xlsx updates quarterly
- Re-evaluate if new vulnerabilities are discovered
- Consider migration to alternative library if security posture changes

#### Alternative Libraries Evaluated

- **exceljs**: More actively maintained, no known vulnerabilities
- **xlsx-js-style**: Fork of xlsx with styling support
- **@sheet/image**: Limited functionality

**Decision**: Monitor for xlsx updates; plan migration if patches aren't released within 6 months.

---

## Security Headers

All HTTP security headers are properly configured in production:

- Content-Security-Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security (HSTS)
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy

See `next.config.js` and `middleware.js` for implementation details.

---

## Reporting Security Issues

To report a security vulnerability:

1. **Do not** open a public GitHub issue
2. Email security concerns to the repository owner
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

We will respond within 48 hours and provide a timeline for fixes.
