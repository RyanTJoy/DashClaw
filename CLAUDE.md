# OpenClaw Pro

## What This Is

AI agent operations dashboard — a Next.js 14 app (JavaScript, not TypeScript) that gives AI agents (and their operators) a command center for tracking actions, token usage, learning, relationships, goals, content, and workflows.

Forked from OpenClaw-OPS-Suite as a starting point. This is the full-featured version with the ActionRecord Control Plane included.

## Architecture

```
app/
├── page.js                    # Main dashboard (draggable widget grid)
├── layout.js                  # Root layout
├── globals.css                # Tailwind globals
├── lib/validate.js            # Input validation helpers
├── lib/org.js                 # Multi-tenant org helpers (getOrgId, getOrgRole)
├── components/                # Dashboard widget cards
├── actions/                   # ActionRecord UI pages
├── bounty-hunter/             # Bounty hunter page
├── content/                   # Content tracker page
├── goals/                     # Goals page
├── integrations/              # Integration settings page
├── learning/                  # Learning database page
├── relationships/             # Mini-CRM page
├── setup/                     # Guided setup wizard
├── tokens/                    # Token usage page
├── workflows/                 # Workflows/SOPs page
└── api/
    ├── actions/               # ActionRecord Control Plane (CRUD + signals + loops + assumptions + trace)
    ├── bounties/              # Bounty tracking
    ├── orgs/                  # Organization + API key management (admin only)
    ├── calendar/              # Calendar events
    ├── content/               # Content management
    ├── goals/                 # Goals + milestones
    ├── health/                # DB connectivity check (public)
    ├── inspiration/           # Ideas + ratings
    ├── learning/              # Decisions + lessons
    ├── memory/                # Memory operations
    ├── relationships/         # Contacts + interactions
    ├── schedules/             # Schedule management
    ├── settings/              # Integration credentials (encrypted)
    ├── setup/                 # Setup status (public)
    ├── tokens/                # Token usage snapshots
    └── workflows/             # Workflow definitions

sdk/
└── openclaw-agent.js          # Zero-dep ESM SDK for ActionRecord Control Plane

scripts/
├── security-scan.js           # Pre-deploy security audit
├── test-actions.mjs           # ActionRecord test suite (~95 assertions)
├── migrate-multi-tenant.mjs   # Multi-tenant migration (idempotent)
└── create-org.mjs             # CLI: create org + admin API key

clawd-tools/                   # Agent workspace tools bundle (memory, security, tokens, etc.)
```

## Tech Stack

- **Runtime**: Node.js (no specific version pinned — use 18+)
- **Framework**: Next.js 14 (App Router, `pages/` not used)
- **Language**: JavaScript (not TypeScript)
- **Styling**: Tailwind CSS 3
- **Database**: Neon PostgreSQL (`@neondatabase/serverless`)
- **Charts**: Recharts
- **Layout**: react-grid-layout (draggable dashboard)
- **Local DB**: better-sqlite3 (for wes-context tools only)
- **Package Manager**: npm
- **Linter**: ESLint (next config)
- **Deploy Target**: Vercel

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server on :3000
npm run build        # Production build
npm run lint         # ESLint
node scripts/security-scan.js   # Security audit
node scripts/test-actions.mjs   # ActionRecord tests (needs DATABASE_URL)
node scripts/migrate-multi-tenant.mjs  # Run multi-tenant migration
node scripts/create-org.mjs --name "Acme" --slug "acme"  # Create org
```

## Environment Variables

See `.env.example`. Key vars:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `DASHBOARD_API_KEY` | Prod only | Protects `/api/*` routes (maps to `org_default`) |
| `ALLOWED_ORIGIN` | No | CORS lock to deployment domain |

## Key Patterns

### Neon Driver (`@neondatabase/serverless`)
- Tagged templates: ``sql`SELECT * FROM foo WHERE id = ${id}` ``
- Dynamic queries: `sql.query("SELECT * FROM foo WHERE id = $1", [id])`
- **Never** `sql(query, params)` — throws tagged-template error
- TEXT timestamp columns need cast for comparisons: `timestamp_start::timestamptz`

### API Route Pattern
```js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

let _sql;
function getSql() {
  if (!_sql) {
    const { neon } = require('@neondatabase/serverless');
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}
```

### Auth & Multi-Tenancy
- `middleware.js` gates all `/api/*` routes
- `PROTECTED_ROUTES` array — prefix matching (includes `/api/orgs`)
- `PUBLIC_ROUTES` — `/api/health`, `/api/setup/status`
- Dev mode (no `DASHBOARD_API_KEY` set) allows unauthenticated access → `org_default`
- Production without key returns 503 (if `DASHBOARD_API_KEY` not configured)
- Same-origin dashboard requests (detected via `Sec-Fetch-Site` / `Referer`) allowed without API key → `org_default`
- Rate limiting: 100 req/min per IP
- **API key resolution flow**: legacy env key → `org_default` (fast path); otherwise SHA-256 hash → `api_keys` table lookup (5-min cache)
- Middleware injects `x-org-id` and `x-org-role` headers (external injection stripped)
- Every route uses `getOrgId(request)` from `app/lib/org.js` to scope queries

### Security Headers
- Set in both `middleware.js` (API routes) and `next.config.js` (all routes)
- CSP, HSTS, X-Frame-Options DENY, nosniff, referrer policy

## ActionRecord Control Plane
- 3 tables: `action_records`, `open_loops`, `assumptions` (with `invalidated_at` column)
- 13 API routes under `/api/actions/`:
  - `GET/POST /api/actions` — list + create actions
  - `GET/PATCH /api/actions/[actionId]` — single action + update outcome
  - `GET /api/actions/[actionId]/trace` — root-cause trace (assumptions, loops, parent chain, related actions)
  - `GET/POST /api/actions/assumptions` — list + create assumptions (supports `drift=true` for drift scoring)
  - `GET/PATCH /api/actions/assumptions/[assumptionId]` — single assumption + validate/invalidate
  - `GET/POST /api/actions/loops` — list + create open loops
  - `GET/PATCH /api/actions/loops/[loopId]` — single loop + resolve/cancel
  - `GET /api/actions/signals` — 6 risk signal types (autonomy_spike, high_impact_low_oversight, repeated_failures, stale_loop, assumption_drift, stale_assumption)
- SDK: `sdk/openclaw-agent.js` — 14 methods (createAction, updateOutcome, registerOpenLoop, resolveOpenLoop, registerAssumption, getAssumption, validateAssumption, getActions, getAction, getSignals, getOpenLoops, getDriftReport, getActionTrace, track)
- Tests: `scripts/test-actions.mjs` — ~95 assertions across 11 phases
- Post-mortem UI: interactive validate/invalidate assumptions, resolve/cancel loops, root-cause analysis
- `timestamp_start` is TEXT (ISO string), not native TIMESTAMP

### DB Migration (if upgrading from Phase 1)
```sql
ALTER TABLE assumptions ADD COLUMN IF NOT EXISTS invalidated_at TEXT;
```

## Multi-Tenancy

### Tables
- `organizations` — id (TEXT PK `org_`), name, slug (unique), plan
- `api_keys` — id (TEXT PK `key_`), org_id (FK), key_hash (SHA-256), key_prefix, label, role, revoked_at
- All 28 data tables have `org_id TEXT NOT NULL DEFAULT 'org_default'` + index

### Key Format
`oc_live_{32_hex_chars}` — stored as SHA-256 hash in `api_keys.key_hash`. First 8 chars in `key_prefix` for display.

### Org Management API (admin only)
- `GET/POST /api/orgs` — list/create orgs (POST returns raw API key — shown once)
- `GET/PATCH /api/orgs/[orgId]` — get/update org
- `GET/POST/DELETE /api/orgs/[orgId]/keys` — manage API keys

### Resolution Flow
1. No key + dev mode (no `DASHBOARD_API_KEY` set) → `org_default` (admin)
2. No key + production (no `DASHBOARD_API_KEY` set) → 503
3. No key + same-origin browser request (dashboard UI) → `org_default` (admin)
4. No key + external request → 401
5. Key matches `DASHBOARD_API_KEY` env → `org_default` (admin, fast path)
6. Key doesn't match env → SHA-256 hash → DB lookup → org_id + role
7. DB miss or revoked → 401

### SDK
No code changes needed. The API key determines which organization's data you're accessing.

### Migration (from single-tenant)
```bash
DATABASE_URL=... DASHBOARD_API_KEY=... node scripts/migrate-multi-tenant.mjs
```

## Deployment

### Vercel (Production)
- **URL**: https://openclaw-pro.vercel.app
- **Project**: `ucsandmans-projects/openclaw-pro`
- **GitHub**: Connected — auto-deploys on push to `main`
- **Region**: Washington, D.C. (iad1)

### Vercel Environment Variables
| Variable | Environment | Sensitive |
|---|---|---|
| `DATABASE_URL` | Production | Yes |
| `DASHBOARD_API_KEY` | Production | Yes |
| `ALLOWED_ORIGIN` | Production | No |

### Deploy Commands
```bash
vercel deploy --prod --yes   # Manual deploy
git push origin main         # Auto-deploy via GitHub integration
```

### Agent SDK Integration
Agents connect to the deployed API — they only need the base URL and an API key:
```js
const claw = new OpenClawAgent({
  baseUrl: 'https://openclaw-pro.vercel.app',
  apiKey: process.env.OPENCLAW_API_KEY,
  agentId: 'my-agent',
  agentName: 'My Agent'
});
```
Agents do NOT need `DATABASE_URL` — the API handles the database connection server-side.
