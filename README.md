# DashClaw: AI Agent Observability and Governance Platform

DashClaw combines a public site, an operator dashboard, and an API control plane so you can monitor what agents do (actions, decisions, risks, messages) and enforce guardrails (approvals, policies, rate limits, webhooks).

Screenshots live in `public/images/screenshots/`.

## Product Surfaces

- `http://localhost:3000/` - public/customer-facing site
- `http://localhost:3000/demo` - demo sandbox (fake data, read-only, no login)
- `http://localhost:3000/dashboard` - operations dashboard (real data, requires auth)
- `http://localhost:3000/docs` - SDK + platform docs (public)

## Repo Layout

- `app/`: Next.js App Router pages, dashboard UI, API routes, shared libraries
- `sdk/`: Node.js SDK (`dashclaw`)
- `sdk-python/`: Python SDK (`dashclaw`)
- `agent-tools/`: local Python CLI tool suite (optional dashboard sync)
- `scripts/`: migrations, CI guardrails, OpenAPI + inventory generators
- `docs/`: RFCs, runbooks, parity matrix, governance docs
- `PROJECT_DETAILS.md`: deep architecture and behavior reference (canonical)

## Quick Start (Local)

Prereqs:

- Node.js 20+ recommended
- A Postgres-compatible database (Neon recommended)

1) Install

```bash
git clone https://github.com/ucsandman/DashClaw.git
cd DashClaw
npm install
```

2) Configure environment

```bash
cp .env.example .env.local
```

At minimum set:

- `DATABASE_URL`
- `NEXTAUTH_URL=http://localhost:3000`
- `NEXTAUTH_SECRET`
- `DASHCLAW_API_KEY`
- `GITHUB_ID` + `GITHUB_SECRET` and/or `GOOGLE_ID` + `GOOGLE_SECRET`

OAuth callback URIs (local dev):

- `http://localhost:3000/api/auth/callback/github`
- `http://localhost:3000/api/auth/callback/google`

If you see "redirect_uri is not associated with this application", your OAuth app is missing the callback URL above.

3) Run migrations (idempotent)

```bash
node scripts/_run-with-env.mjs scripts/migrate-multi-tenant.mjs
node scripts/_run-with-env.mjs scripts/migrate-cost-analytics.mjs
node scripts/_run-with-env.mjs scripts/migrate-identity-binding.mjs
```

4) Start the app

```bash
npm run dev
```

Open:

- `http://localhost:3000/dashboard` (real data)
- `http://localhost:3000/demo` (no-login preview)

## Bootstrap An Existing Agent (Optional)

Import goals, decisions, memory, snippets, and preferences from an existing workspace:

```powershell
node scripts/bootstrap-agent.mjs --dir "C:\\path\\to\\agent\\workspace" --agent-id "my-agent" --agent-name "My Agent" --local --dry-run
node scripts/bootstrap-agent.mjs --dir "C:\\path\\to\\agent\\workspace" --agent-id "my-agent" --agent-name "My Agent" --local
```

More details: `docs/agent-bootstrap.md`.

## CI/Quality Gates

```bash
npm run lint
npm run docs:check
npm run openapi:check
npm run api:inventory:check
npm run route-sql:check
npm run test -- --run
npm run sdk:integration
npm run sdk:integration:python
```

## Security Notes (Self-Host)

- In production, if `DASHCLAW_API_KEY` is not set, the `/api/*` surface fails closed with `503` in `middleware.js`.
- Rate limiting is enforced in middleware for `/api/*` (including unauthenticated public API routes).
  - Tuning: `DASHCLAW_RATE_LIMIT_WINDOW_MS`, `DASHCLAW_RATE_LIMIT_MAX`
  - Dev only: `DASHCLAW_DISABLE_RATE_LIMIT=true`

More: `docs/SECURITY.md`.

## Analytics (Optional)

DashClaw includes Vercel Web Analytics (`@vercel/analytics`):

- Enabled automatically on Vercel deployments (`VERCEL=1`)
- Opt-in on non-Vercel hosts: `NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS=true`

## Documentation Map

- Canonical architecture and behavior: `PROJECT_DETAILS.md`
- Non-coding setup: `QUICK-START.md`
- SDK/operator reference: `docs/client-setup-guide.md`
- Agent import/bootstrap: `docs/agent-bootstrap.md`
- Documentation governance: `docs/documentation-governance.md`

## Contributing

See `CONTRIBUTING.md`.

## License

MIT (`LICENSE`).

