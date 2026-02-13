# DashClaw Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.1] - 2026-02-13

### Added
- **CrewAI Integration**: New adapter for CrewAI agents and tasks to track multi-agent research.
- **AutoGen Integration**: Hook-based integration for AutoGen to monitor conversational agent turns.
- **Node SDK v1.3.1**: Synced version with platform.
- **Python SDK v1.3.1**: New integrations and RSA signing support.

## [1.3.0] - 2026-02-13

### Added
- **Data Loss Prevention (DLP)**: Automated regex-based redaction for sensitive keys (OpenAI, AWS, GitHub, etc.) in agent messages and handoffs.
- **Strict Sync Validation**: Implemented Zod-based schema validation for the Bulk Sync API to prevent malformed data injection.
- **Agent Identity Enforcement**: Made agent signatures mandatory in production for all Action Record creations.

### Security
- **Auth Hardening**: Refactored middleware to "fail closed" in production if security keys are missing.
- **HSTS Enforcement**: Added `Strict-Transport-Security` headers to all API routes.
- **Audit Log Redaction**: Added local redaction engine to the Python Audit Logger to prevent secret leakage in local SQLite databases.
- **Dependency Patching**: Upgraded Next.js to stable v15.1.12 and esbuild to v0.25.0 to resolve known vulnerabilities while maintaining CI stability.
- **Standardized DB Layer**: Centralized all database connection logic into a shared utility with strict production safety checks.

## [1.2.4] - 2026-02-13

### Added
- **Security Health UI**: Added a real-time "Security Score" and system health checklist to the Security dashboard.
- **Security Tests**: Added unit tests for SSRF protection and webhook validation.

### Changed
- **Environment Template**: Updated `.env.example` with `ENCRYPTION_KEY` and `WEBHOOK_ALLOWED_DOMAINS`.

## [1.2.3] - 2026-02-13

### Added
- **Security Dashboard API**: New endpoint `/api/security/status` for monitoring encryption health and system security score.

### Security
- **Comprehensive Audit**: Full IDOR (Insecure Direct Object Reference) audit of all resource endpoints to ensure strict multi-tenant isolation.
- **Plan Escalation Fix**: Restricted organization creation to the 'free' plan by default, ignoring unauthorized user-provided plan overrides.
- **Auto-Encryption**: Added server-side enforcement for sensitive keys (API_KEY, DATABASE_URL, etc.) to ensure they are always encrypted before storage.
- **Hardened Error Handling**: Standardized generic error responses across the API to prevent information leakage.

## [1.2.2] - 2026-02-13

### Fixed
- **Build Failure**: Resolved "Invalid project directory" error in CI by adjusting Next.js version to a stable security-patched release (15.5.10).

## [1.2.1] - 2026-02-13

### Security
- **SSRF Hardening**: Enhanced webhook URL validation with stricter blocked patterns and optional domain allowlist support.
- **Dependency Updates**: Resolved vulnerabilities in `next` and `esbuild` through security patches.
- **Scanner Integrity**: Updated internal security scanner to ensure comprehensive directory coverage.
- **Cleanup**: Removed unverified third-party agent skills and scripts from the repository.

## [1.2.0] - 2026-02-12

### Added
- **Self-Hosting Support**: Added production-optimized `Dockerfile` and `docker-compose.yml`.
- **Operational Maturity**: Added `CONTRIBUTING.md` for community participation.
- Enabled `standalone` output in Next.js configuration for leaner container images.

## [1.1.0] - 2026-02-12

### Added
- **Identity Binding**: Cryptographic agent verification using RSA-PSS signatures (Sign-on-Source, Verify-on-Sink).
- New admin endpoint `/api/identities` for agent public key management.
- Verified "Trust Badge" (green shield) in the dashboard UI for cryptographically signed actions.
- `scripts/generate-agent-keys.mjs` helper for agent keypair generation.
- `scripts/migrate-identity-binding.mjs` for database schema updates.

### Changed
- Updated DashClaw SDK to support automatic payload signing with JWK or CryptoKey.

## [1.0.0] - 2026-02-12

### Added
- Initial public release of DashClaw.
- AI Agent Dashboard built with Next.js 14 (App Router).
- Suite of Python CLI tools for agent memory, context, and goal tracking.
- ActionRecord control plane for full action lifecycle tracking.
- Behavior Guard system with policy evaluation (risk, approval, rate-limiting).
- Multi-tenant organization support with API key authentication.
- Real-time risk signals and security monitoring.
- Agent-to-agent messaging hub and collaborative shared docs.

### Security
- SHA-256 API key hashing for secure organization access.
- AES-256 encryption for integration credentials and sensitive settings.
- Native Content Security Policy (CSP) and security headers configuration.
