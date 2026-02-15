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

## Deployment Options

DashClaw runs anywhere Node.js runs. Pick the setup that fits your needs:

| | **Local (Docker)** | **Cloud (Vercel + Neon)** |
|---|---|---|
| **Best for** | Development, privacy, maximum speed | Remote access from anywhere (phone, laptop) |
| **Database** | Docker Postgres (direct TCP, fastest) | Neon free tier (serverless, no infra to manage) |
| **Hosting** | Your machine (`localhost:3000`) | Vercel free tier (`your-app.vercel.app`) |
| **Cost** | Free | Free |

You can also mix and match — run Vercel with a self-hosted Postgres, or run locally with a Neon database. DashClaw auto-detects your database type and uses the optimal driver.

---

## Quick Start (Local)

Prereqs:

- Node.js 20+ recommended
- Docker Desktop (for local Postgres) or a Neon account (for hosted Postgres)

1) Install

```bash
git clone https://github.com/ucsandman/DashClaw.git
cd DashClaw
npm install
```

2) Start a database

**Option A: Local Postgres (Docker — fastest)**

```bash
docker compose up -d db
```

Connection string: `postgresql://dashclaw:dashclaw@localhost:5432/dashclaw`

**Option B: Hosted Postgres (Neon — free tier, no Docker needed)**

Create a project at [neon.tech](https://neon.tech) and copy your connection string.

3) Configure environment

```bash
cp .env.example .env.local
```

At minimum set:

- `DATABASE_URL` (from step 2)
- `NEXTAUTH_URL=http://localhost:3000`
- `NEXTAUTH_SECRET`
- `DASHCLAW_API_KEY`
- `GITHUB_ID` + `GITHUB_SECRET` and/or `GOOGLE_ID` + `GOOGLE_SECRET`

OAuth callback URIs (local dev):

- `http://localhost:3000/api/auth/callback/github`
- `http://localhost:3000/api/auth/callback/google`

If you see "redirect_uri is not associated with this application", your OAuth app is missing the callback URL above.

Or run the interactive installer which generates `.env.local` for you:

```bash
# Windows
./install-windows.bat

# Mac / Linux
bash ./install-mac.sh
```

4) Run migrations (idempotent)

```bash
node scripts/_run-with-env.mjs scripts/migrate-multi-tenant.mjs
node scripts/_run-with-env.mjs scripts/migrate-cost-analytics.mjs
node scripts/_run-with-env.mjs scripts/migrate-identity-binding.mjs
node scripts/_run-with-env.mjs scripts/migrate-capabilities.mjs
```

5) Start the app

```bash
npm run dev
```

Open:

- `http://localhost:3000/dashboard` (real data)
- `http://localhost:3000/demo` (no-login preview)

---

## Deploy to Cloud (Vercel — access from anywhere)

Want to check on your agents from your phone? Deploy to Vercel for free:

1. Push your fork to GitHub
2. Go to [vercel.com](https://vercel.com), import the repo
3. Set environment variables in the Vercel dashboard:
   - `DATABASE_URL` (use a [Neon](https://neon.tech) free-tier database — Neon's serverless driver is optimized for Vercel's edge functions)
   - `NEXTAUTH_URL=https://your-app.vercel.app`
   - `NEXTAUTH_SECRET`
   - `DASHCLAW_API_KEY`
   - `GITHUB_ID` + `GITHUB_SECRET` and/or `GOOGLE_ID` + `GOOGLE_SECRET`
4. Deploy — you get a free URL like `https://your-app.vercel.app`

OAuth callback URIs (Vercel):

- `https://your-app.vercel.app/api/auth/callback/github`
- `https://your-app.vercel.app/api/auth/callback/google`

Point your agents at the Vercel URL instead of localhost and you can monitor them from anywhere.

Other cloud hosts (Railway, Fly.io, Render, your own VPS) also work — DashClaw is a standard Next.js app.

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

## Scheduled Jobs (Optional)

DashClaw exposes cron endpoints under `/api/cron/*` for maintenance and automation, but the OSS repo does not ship Vercel cron schedules (paid feature). You can still run scheduled behavior by using any scheduler (GitHub Actions, system cron, Cloudflare, etc.) to call these endpoints with:

- Header: `Authorization: Bearer $CRON_SECRET`

Endpoints:

- `GET /api/cron/signals` (compute new signals, fire webhooks, send alert emails)
- `GET /api/cron/memory-maintenance` (memory health maintenance)
- `GET /api/cron/learning-recommendations` (rebuild learning recommendations)
- `GET /api/cron/learning-episodes-backfill` (backfill learning episodes)

Example (bash):

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" "https://YOUR_HOST/api/cron/signals"
```

Example (PowerShell):

```powershell
Invoke-RestMethod -Headers @{ Authorization = "Bearer $env:CRON_SECRET" } -Method GET "http://localhost:3000/api/cron/signals"
```

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
