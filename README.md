# DashClaw

DashClaw is a production-focused AI agent observability and governance platform.

It combines:
- A customer-facing website (`/`) and operator dashboard (`/dashboard`)
- A Next.js API control plane (`app/api/*`)
- Realtime SSE streaming with replay (`/api/stream`)
- Node and Python SDKs for agent instrumentation
- A local Python agent-tool suite for workflow, memory, and security operations

As of **February 14, 2026**, platform convergence workstreams are closed and tracked in:
- `docs/rfcs/platform-convergence.md`
- `docs/rfcs/platform-convergence-status.md`

## Platform Status (February 14, 2026)

| Workstream | Status |
|---|---|
| WS1 Data Access Convergence | met |
| WS2 API Contract Governance | met |
| WS3 Realtime Reliability | met |
| WS4 Documentation Governance | met |
| WS5 SDK Core Parity | met |

## What This Repository Contains

- `app/`: Next.js App Router pages, dashboard UI, API routes, shared libraries
- `sdk/`: Node.js SDK (`dashclaw`)
- `sdk-python/`: Python SDK (`dashclaw`)
- `agent-tools/`: Local Python CLI tool suite with optional dashboard sync
- `scripts/`: migrations, CI guards, API contract checks, convergence evidence tooling
- `docs/`: RFCs, runbooks, parity matrix, governance docs
- `PROJECT_DETAILS.md`: deep architecture and behavior reference

## Product Surfaces

- `http://localhost:3000/`: public/customer-facing site
- `http://localhost:3000/dashboard`: authenticated operations dashboard
- `http://localhost:3000/docs`: SDK and platform documentation
- `http://localhost:3000/toolkit`: agent tools overview

## Architecture At A Glance

1. `middleware.js`
   - Auth, API-key resolution, org-scoping headers, CORS, rate limiting
2. `app/api/*`
   - Multi-tenant API routes for actions, guardrails, webhooks, messaging, context, workspace data
3. `app/lib/*`
   - Domain logic for validation, security scanning, signals, guard evaluation, realtime events
4. `app/components/*`
   - Dashboard widgets and layout system
5. `app/lib/events.js` + `app/api/stream/route.js`
   - Realtime broker abstraction (memory/redis), SSE fanout, Last-Event-ID replay
6. `sdk/` and `sdk-python/`
   - Agent client APIs mapped to the same platform endpoints

## Runtime Flow

1. Client or SDK calls API with NextAuth cookie (browser) or `x-api-key` (external).
2. Middleware resolves org and role, injects `x-org-id` and `x-org-role`.
3. Route handler validates input and executes domain/repository logic.
4. Critical events publish through realtime backend for SSE subscribers.
5. Dashboard/UI consumes API data + realtime updates.
6. CI gates enforce contracts, SQL guardrails, docs consistency, SDK parity, and WS1 latency checks.

## Quick Start (Local)

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL-compatible database (Neon recommended)

### 1) Install

```bash
git clone https://github.com/ucsandman/DashClaw.git
cd DashClaw
npm install
```

### 2) Configure environment

```bash
cp .env.example .env.local
```

Minimum local variables:
- `DATABASE_URL`
- `NEXTAUTH_URL=http://localhost:3000`
- `NEXTAUTH_SECRET`
- `DASHCLAW_API_KEY` (strongly recommended; required for production)

### 3) Run migrations (idempotent)

```bash
node scripts/_run-with-env.mjs scripts/migrate-multi-tenant.mjs
node scripts/_run-with-env.mjs scripts/migrate-cost-analytics.mjs
node scripts/_run-with-env.mjs scripts/migrate-identity-binding.mjs
```

Optional:

```bash
node scripts/_run-with-env.mjs scripts/migrate-behavioral-ai.mjs
node scripts/_run-with-env.mjs scripts/migrate-learning-loop-mvp.mjs
```

### 4) Start app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Core Commands

### Development

```bash
npm run dev
npm run build
npm run start
```

### Quality and CI Parity

```bash
npm run lint
npm run docs:check
npm run openapi:check
npm run api:inventory:check
npm run route-sql:check
npm run convergence:ws1:check
npm run test -- --run
npm run sdk:integration
npm run sdk:integration:python
```

### Adaptive Learning Loop Ops

```bash
npm run migrate:learning-loop
npm run backfill:learning-episodes
npm run rebuild:learning-recommendations
```

### Convergence Evidence

```bash
npm run convergence:evidence -- http://localhost:3000 docs/rfcs/platform-convergence-evidence.json
```

## SDKs

### Node SDK (`sdk/`)

Install:

```bash
npm install dashclaw
```

Usage:

```js
import { DashClaw } from 'dashclaw';

const claw = new DashClaw({
  baseUrl: 'http://localhost:3000',
  apiKey: process.env.DASHCLAW_API_KEY,
  agentId: 'my-agent',
});
```

### Python SDK (`sdk-python/`)

Install:

```bash
cd sdk-python
pip install .
```

Usage:

```python
from dashclaw import DashClaw

claw = DashClaw(
    base_url="http://localhost:3000",
    api_key="YOUR_API_KEY",
    agent_id="my-agent",
)
```

## Agent Tools

`agent-tools/` contains local-first Python utilities for:
- learning and decisions
- goals and relationships
- context and session handoffs
- memory health and search
- security scanning and audit logging
- snippet automation and bulk sync

Most tools support `--push` to sync data to DashClaw APIs.

## Adaptive Learning Loop (MVP)

- Episode scoring is captured on action outcome updates (`PATCH /api/actions/{actionId}`).
- Recommendations are served from `/api/learning/recommendations` (`GET`) with optional telemetry tracking.
- Recommendation rebuild (`POST /api/learning/recommendations`) is restricted to admin/service role.
- Recommendation telemetry ingestion: `POST /api/learning/recommendations/events`.
- Recommendation effectiveness metrics: `GET /api/learning/recommendations/metrics`.
- Recommendation ops toggle: `PATCH /api/learning/recommendations/{recommendationId}`.
- SDK safe auto-adapt modes:
  - Node: `autoRecommend: 'off' | 'warn' | 'enforce'`
  - Python: `auto_recommend='off' | 'warn' | 'enforce'`
- Automated repair/rebuild cron routes:
  - `/api/cron/learning-episodes-backfill`
  - `/api/cron/learning-recommendations`

Reference RFC:
- `docs/rfcs/2026-02-14-adaptive-learning-loop-mvp.md`

## Security Model

- Multi-tenant org scoping on all protected APIs
- API key hashing and role-bound access
- NextAuth session support for dashboard users
- CORS controls and rate limiting in middleware
- Guard policy engine (`/api/guard`, `/api/policies`)
- Optional behavioral AI and DLP/security finding routes

Security docs:
- `docs/SECURITY.md`
- `docs/SECURITY-CHECKLIST.md`
- `docs/SECURITY-AUDIT-TEMPLATE.md`

## Deployment

- Vercel config: `vercel.json`
- Docker support: `Dockerfile`, `docker-compose.yml`

For production, configure:
- `DATABASE_URL`
- `DASHCLAW_API_KEY`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- provider keys as needed (`GITHUB_*`, `GOOGLE_*`, `STRIPE_*`, `RESEND_API_KEY`, `CRON_SECRET`)

## Documentation Map

- Architecture and behavior: `PROJECT_DETAILS.md`
- Quick non-coding setup: `QUICK-START.md`
- Documentation governance: `docs/documentation-governance.md`
- Platform convergence RFC: `docs/rfcs/platform-convergence.md`
- Platform convergence status log: `docs/rfcs/platform-convergence-status.md`
- Convergence evidence artifact: `docs/rfcs/platform-convergence-evidence.json`
- SDK parity matrix: `docs/sdk-parity.md`
- SSE cutover runbook: `docs/rfcs/2026-02-13-sse-cutover-runbook.md`
- Contribution guide: `CONTRIBUTING.md`

## Contributing

See `CONTRIBUTING.md`.

## License

MIT (`LICENSE`).
