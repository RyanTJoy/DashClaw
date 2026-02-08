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
└── test-actions.mjs           # ActionRecord test suite (~95 assertions)

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
```

## Environment Variables

See `.env.example`. Key vars:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `DASHBOARD_API_KEY` | Prod only | Protects `/api/*` routes |
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

### Auth
- `middleware.js` gates all `/api/*` routes
- `PROTECTED_ROUTES` array — prefix matching
- `PUBLIC_ROUTES` — `/api/health`, `/api/setup/status`
- Dev mode (no `DASHBOARD_API_KEY` set) allows unauthenticated access
- Production without key returns 503
- Rate limiting: 100 req/min per IP

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
