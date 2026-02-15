---
source-of-truth: false
owner: maintainers
last-verified: 2026-02-14
doc-type: handoff
---

# DashClaw

DashClaw is an AI agent observability and governance platform: a Next.js 15 (JavaScript) app that provides a command center for actions, learning/decisions, goals, guardrails, security signals, messaging, and operator workflows.

For architecture, API inventory, and schema-level behavior, use `PROJECT_DETAILS.md` as the canonical reference.

## Product Surfaces

- `/` - public landing site
- `/demo` - demo sandbox UI (fake data, read-only, no login)
- `/dashboard` - authenticated operations dashboard (real data)
- `/workspace` - per-agent workspace (digest, context, handoffs, snippets, preferences, memory)
- `/security` - security dashboard (signals, guard decisions, findings)

## Tech Stack

- Runtime: Node.js 20+ recommended (Next.js 15 requires modern Node)
- Framework: Next.js 15 (App Router)
- Language: JavaScript
- Styling: Tailwind CSS 3
- Database: Postgres (local via Docker or hosted via Neon), dual adapter (`postgres` for TCP, `@neondatabase/serverless` for Neon)
- Auth (UI): NextAuth v4 (GitHub + Google OAuth)
- Auth (agents/tools): `x-api-key` header (DashClaw API keys)

## Essential Commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm run docs:check
npm run route-sql:check
```

DB bootstrap and migrations (idempotent, safe to re-run):

```bash
node scripts/_run-with-env.mjs scripts/migrate-multi-tenant.mjs
node scripts/_run-with-env.mjs scripts/migrate-cost-analytics.mjs
node scripts/_run-with-env.mjs scripts/migrate-identity-binding.mjs
node scripts/_run-with-env.mjs scripts/migrate-capabilities.mjs
```

## Environment Variables (Must Know)

See `.env.example`.

- `DATABASE_URL` (required): Postgres connection string
- `NEXTAUTH_URL` + `NEXTAUTH_SECRET` (required for UI auth)
- `GITHUB_ID` + `GITHUB_SECRET` and/or `GOOGLE_ID` + `GOOGLE_SECRET` (required to sign in)
- `DASHCLAW_API_KEY` (required in production): protects `/api/*` and seeds `org_default`

Rate limiting (optional):

- `DASHCLAW_RATE_LIMIT_MAX`
- `DASHCLAW_RATE_LIMIT_WINDOW_MS`
- `DASHCLAW_DISABLE_RATE_LIMIT=true` (dev only)

OAuth callback URIs (local dev):

- `http://localhost:3000/api/auth/callback/github`
- `http://localhost:3000/api/auth/callback/google`

If you see "redirect_uri is not associated with this application", your OAuth app is missing the callback URL above.

## Guardrails (Do Not Regress)

- Default-deny for `/api/*` is enforced in `middleware.js` (only explicit `PUBLIC_ROUTES` are unauthenticated).
- Org context headers (`x-org-id`, `x-org-role`, `x-user-id`) must never be accepted from clients; middleware injects trusted values.
- Route SQL guardrail: do not introduce new direct SQL usage inside `app/api/**/route.js` handlers. Put query logic in repositories (see `app/lib/repositories/*`). CI blocks new route-level SQL (`npm run route-sql:check`).

## Where To Look First

- `PROJECT_DETAILS.md` - system map, route list, schema, invariants
- `docs/agent-bootstrap.md` - importing an existing agent/workspace (CLI scanner + security notes)
- `docs/client-setup-guide.md` - SDK + operator guide (long-form reference)

