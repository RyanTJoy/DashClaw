# OpenClaw Pro

## What This Is

AI agent operations dashboard — a Next.js 14 app (JavaScript, not TypeScript) that gives AI agents (and their operators) a command center for tracking actions, token usage, learning, relationships, goals, content, and workflows.

Forked from OpenClaw-OPS-Suite as a starting point. This is the full-featured version with the ActionRecord Control Plane included.

## Architecture

```
app/
├── page.js                    # Main dashboard (fixed widget grid)
├── layout.js                  # Root layout (Inter font, sidebar)
├── globals.css                # Design tokens (CSS custom properties) + Tailwind
├── lib/validate.js            # Input validation helpers
├── lib/org.js                 # Multi-tenant org helpers (getOrgId, getOrgRole)
├── lib/colors.js              # Agent color hashing, action type icon map
├── components/
│   ├── ui/                    # Shared primitives (Card, Badge, Stat, ProgressBar, EmptyState, Skeleton)
│   ├── Sidebar.js             # Persistent sidebar navigation
│   ├── PageLayout.js          # Shared page layout (breadcrumbs, title, actions)
│   ├── NotificationCenter.js  # Alert bell + notification dropdown
│   ├── DraggableDashboard.js  # Fixed 4-column widget grid (no drag mode)
│   └── *.js                   # 14 dashboard widget cards
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
- **Styling**: Tailwind CSS 3 + CSS custom properties (design tokens)
- **Icons**: lucide-react (all iconography — no emoji in UI)
- **Font**: Inter (via `next/font/google`, CSS variable `--font-inter`)
- **Database**: Neon PostgreSQL (`@neondatabase/serverless`)
- **Charts**: Recharts (brand orange theme)
- **Local DB**: better-sqlite3 (for wes-context tools only)
- **Package Manager**: npm
- **Linter**: ESLint (`next/core-web-vitals` — `.eslintrc.json`)
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

### UI/Design System
- **Dark-only theme** — flat surfaces, no glassmorphism or gradients
- **Design tokens** in `globals.css` as CSS custom properties (`--color-brand`, `--color-bg-primary`, `--color-border`, etc.)
- **Tailwind extension** in `tailwind.config.js` maps CSS variables to utility classes (`bg-brand`, `bg-surface-secondary`, `text-zinc-300`, etc.)
- **Shared primitives** in `app/components/ui/`: `Card`/`CardHeader`/`CardContent`, `Badge` (6 variants), `Stat`/`StatCompact`, `ProgressBar`, `EmptyState`, `Skeleton`/`CardSkeleton`/`ListSkeleton`
- **Icons**: All via `lucide-react` — no emoji anywhere in rendered UI
- **Navigation**: Persistent `Sidebar.js` (w-56 desktop, collapsible to w-14, hamburger on mobile)
- **Page structure**: `PageLayout.js` wraps every page (breadcrumbs, sticky header, title/subtitle, action buttons, NotificationCenter, AgentFilterDropdown)
- **Agent filter**: `AgentFilterContext.js` provides global agent filter; `AgentFilterDropdown.js` renders in PageLayout header (only on dashboard via `AgentFilterProvider` in `page.js`)
- **Agent colors**: `app/lib/colors.js` — `getAgentColor(agentId)` returns consistent hash-based color from 8-color palette
- **Typography**: Inter font, `text-sm text-zinc-300` body, `text-xs text-zinc-500` labels, `font-mono text-xs` for timestamps/IDs, stat numbers max `text-2xl tabular-nums`
- **Dashboard grid**: Fixed 4-column layout in `DraggableDashboard.js` — no drag/customize mode

## Additional API Routes (POST-enabled)
- `GET /api/agents` — list agents (from action_records, grouped by agent_id; supports `?include_connections=true`)
- `GET/POST /api/agents/connections` — agent self-reported connections (GET: `?agent_id=X`, `?provider=Y`; POST: upsert connections array)
- `GET/POST/DELETE /api/settings` — integration credentials (supports `?agent_id=X` for per-agent overrides)
- `GET/POST /api/tokens` — token snapshots + daily totals (supports `?agent_id=X` for per-agent filtering)
- `GET/POST /api/learning` — decisions + lessons
- `GET/POST /api/goals` — goals + milestones
- `GET/POST /api/content` — content items
- `GET/POST /api/relationships` — contacts + interactions

### Per-Agent Settings
- Settings table has `agent_id TEXT` column (nullable — NULL = org-level default)
- Unique index: `settings_org_agent_key_unique` on `(org_id, COALESCE(agent_id, ''), key)`
- `GET /api/settings?category=integration&agent_id=X` — returns merged settings (agent overrides org defaults via `DISTINCT ON`)
- `POST /api/settings` with `agent_id` in body — saves agent-specific override
- `DELETE /api/settings?key=X&agent_id=Y` — deletes agent-specific row only
- Response includes `is_inherited` boolean per setting (true = value comes from org default)
- Integrations page has agent selector dropdown for per-agent configuration

### Agent Connections (Self-Reported)
- Table: `agent_connections` — agents report their active integrations at startup
- Columns: `id` (TEXT `conn_` prefix), `org_id`, `agent_id`, `provider`, `auth_type`, `plan_name`, `status`, `metadata`, `reported_at`, `updated_at`
- Unique index: `agent_connections_org_agent_provider_unique` on `(org_id, agent_id, provider)`
- `auth_type` enum: `api_key`, `subscription`, `oauth`, `pre_configured`, `environment`
- `status` enum: `active`, `inactive`, `error`
- `metadata`: optional JSON string (e.g., `{ "cost": "$100/mo" }`)
- API: `GET/POST /api/agents/connections` — GET supports `?agent_id=X`, `?provider=Y`; POST upserts via `ON CONFLICT`
- POST body: `{ agent_id, connections: [{ provider, auth_type, plan_name, status, metadata }] }` (max 50 per request)
- Integrations page + IntegrationsCard widget merge agent-reported connections with credential-based settings
- Agent-reported connections show blue dot ("Agent Connected") status

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
  - `GET /api/actions/signals` — 7 risk signal types (autonomy_spike, high_impact_low_oversight, repeated_failures, stale_loop, assumption_drift, stale_assumption, stale_running_action)
- SDK: `sdk/openclaw-agent.js` — 20 methods (createAction, updateOutcome, registerOpenLoop, resolveOpenLoop, registerAssumption, getAssumption, validateAssumption, getActions, getAction, getSignals, getOpenLoops, getDriftReport, getActionTrace, reportTokenUsage, recordDecision, createGoal, recordContent, recordInteraction, reportConnections, track)
- Tests: `scripts/test-actions.mjs` — ~95 assertions across 11 phases
- Post-mortem UI: interactive validate/invalidate assumptions, resolve/cancel loops, root-cause analysis
- `timestamp_start` is TEXT (ISO string), not native TIMESTAMP

### DB Migration (if upgrading from Phase 1)
```sql
ALTER TABLE assumptions ADD COLUMN IF NOT EXISTS invalidated_at TEXT;
```

### Token Tables
- `token_snapshots` — per-snapshot data with `agent_id` (NULL = org-wide aggregate)
- `daily_totals` — daily aggregated token counts with `agent_id`
- Unique index on daily_totals: `(org_id, COALESCE(agent_id, ''), date)` — separates per-agent from org-wide rows
- POST `/api/tokens` with `agent_id` creates both a per-agent snapshot AND an org-wide aggregate snapshot
- GET `/api/tokens?agent_id=X` returns per-agent data; no param returns org-wide (`agent_id IS NULL`)
- Migration Step 12 in `migrate-multi-tenant.mjs` creates both tables (idempotent)
- TokenBudgetCard + TokenChart respect the dashboard agent filter via `useAgentFilter()`

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

### SDK Methods (20 total)
**ActionRecord Control Plane**: `createAction()`, `updateOutcome()`, `registerOpenLoop()`, `resolveOpenLoop()`, `registerAssumption()`, `getAssumption()`, `validateAssumption()`, `getActions()`, `getAction()`, `getSignals()`, `getOpenLoops()`, `getDriftReport()`, `getActionTrace()`, `track()`

**Dashboard Data**: `reportTokenUsage()`, `recordDecision()`, `createGoal()`, `recordContent()`, `recordInteraction()`, `reportConnections()`

**Example: reportConnections()**
```javascript
await claw.reportConnections([
  { provider: 'anthropic', authType: 'subscription', planName: 'Pro Max', status: 'active' },
  { provider: 'github', authType: 'oauth', status: 'active' }
]);
```
