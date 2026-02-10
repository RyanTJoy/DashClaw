# OpenClaw Pro

## What This Is

AI agent observability platform — a Next.js 14 app (JavaScript, not TypeScript) that gives AI agents (and their operators) a command center for tracking actions, learning, relationships, goals, content, and workflows.

- **`/`** — Public landing page with waitlist signup (server component, no auth)
- **`/docs`** — Public SDK documentation (server component, no auth)
- **`/dashboard`** — Authenticated operations dashboard (client component, behind sidebar)

Forked from OpenClaw-OPS-Suite as a starting point. This is the full-featured version with the ActionRecord Control Plane included.

## Architecture

```
app/
├── page.js                    # Public landing page (waitlist signup)
├── layout.js                  # Root layout (Inter font, SessionWrapper)
├── globals.css                # Design tokens (CSS custom properties) + Tailwind
├── dashboard/page.js          # Authenticated dashboard (fixed widget grid)
├── lib/validate.js            # Input validation helpers
├── lib/org.js                 # Multi-tenant org helpers (getOrgId, getOrgRole, getUserId)
├── lib/auth.js                # NextAuth config (GitHub + Google, JWT, user upsert)
├── lib/billing.js             # Plan limits, usage metering, quota checking
├── lib/colors.js              # Agent color hashing, action type icon map
├── lib/audit.js               # Fire-and-forget activity logging (logActivity)
├── lib/signals.js             # Shared signal computation (computeSignals)
├── lib/webhooks.js            # Webhook HMAC signing, delivery, dispatch
├── lib/notifications.js       # Email alerts via Resend
├── components/
│   ├── ui/                    # Shared primitives (Card, Badge, Stat, ProgressBar, EmptyState, Skeleton)
│   ├── Sidebar.js             # Persistent sidebar navigation (links to /dashboard)
│   ├── PageLayout.js          # Shared page layout (breadcrumbs, title, actions)
│   ├── NotificationCenter.js  # Alert bell + notification dropdown
│   ├── DraggableDashboard.js  # Fixed 4-column widget grid (+ onboarding checklist)
│   ├── OnboardingChecklist.js # 4-step guided onboarding (workspace, key, SDK, first action)
│   ├── WaitlistForm.js        # Email capture form (client component)
│   ├── SecurityDetailPanel.js  # Slide-out detail drawer (signal + action detail)
│   ├── SessionWrapper.js      # NextAuth SessionProvider + AgentFilterProvider wrapper
│   ├── UserMenu.js            # User avatar + sign-out dropdown (client component)
│   └── *.js                   # 12 dashboard widget cards
├── actions/                   # ActionRecord UI pages
├── api-keys/                  # API key management page
├── docs/page.js               # Public SDK documentation (server component)
├── login/page.js              # Custom login page (GitHub + Google OAuth)
├── bounty-hunter/             # Bounty hunter page
├── content/                   # Content tracker page
├── goals/                     # Goals page
├── integrations/              # Integration settings page
├── learning/                  # Learning database page
├── relationships/             # Mini-CRM page
├── security/                  # Security monitoring page (signals, high-risk actions)
├── messages/                  # Agent communication hub (inbox, threads, shared docs)
├── activity/                  # Activity log page (audit trail)
├── webhooks/                  # Webhook management page
├── notifications/             # Notification preferences page
├── team/                      # Team management page (members, invites, roles)
├── invite/[token]/            # Invite accept page (standalone layout)
├── setup/                     # Redirects to /dashboard (legacy)
├── tokens/                    # Token usage page (disabled — not linked from UI)
├── workflows/                 # Workflows/SOPs page
└── api/
    ├── auth/[...nextauth]/    # NextAuth route handler (GitHub + Google OAuth)
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
    ├── keys/                  # API key management (list, generate, revoke — admin only for POST/DELETE)
    ├── team/                  # Team management (members list, invite CRUD, role change, remove)
    ├── invite/[token]/        # Invite accept (public GET for details, POST to accept)
    ├── onboarding/            # Onboarding endpoints (status, workspace, api-key)
    ├── tokens/                # Token usage snapshots (disabled — API exists but not used by UI)
    ├── waitlist/              # Waitlist signups (public — no auth required)
    ├── activity/              # Activity log API (GET, paginated)
    ├── webhooks/              # Webhooks CRUD + test + deliveries
    ├── notifications/         # Notification preferences API
    ├── cron/signals/          # Vercel Cron: signal detection + alerting (every 10 min)
    ├── workflows/             # Workflow definitions
    ├── handoffs/              # Session handoffs API (GET/POST)
    ├── context/               # Context manager: points, threads, entries
    ├── snippets/              # Automation snippets CRUD + use counter
    ├── preferences/           # User preferences (observations, prefs, moods, approaches)
    ├── digest/                # Daily digest aggregation (GET only)
    ├── security/scan/         # Content security scanning (POST only)
    └── messages/              # Agent messaging (messages, threads, shared docs)

sdk/
├── dashclaw.js                # DashClaw SDK (54 methods, zero deps, ESM)
├── index.cjs                  # CJS compatibility wrapper
├── package.json               # npm package config (name: dashclaw)
├── LICENSE                    # MIT
└── .npmignore                 # Publish exclusions

scripts/
├── security-scan.js           # Pre-deploy security audit
├── test-actions.mjs           # Integration test suite (~175 assertions, 19 phases)
├── migrate-multi-tenant.mjs   # Multi-tenant migration (idempotent)
├── create-org.mjs             # CLI: create org + admin API key
├── report-tokens.mjs          # CLI: parse Claude Code /status and POST to /api/tokens (disabled)
├── report-action.mjs          # CLI: create/update action records via API
└── cleanup-actions.mjs        # CLI: delete stale action records from DB

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
- **Email**: Resend (signal alert emails)
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
node scripts/report-action.mjs --agent-id moltfire --type build --goal "Deploy X"  # Create action
node scripts/report-action.mjs --update act_xxx --status completed --output "Done"  # Update action
node scripts/cleanup-actions.mjs --before "2026-02-09" --dry-run  # Preview stale record cleanup
```

## Environment Variables

See `.env.example`. Key vars:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `DASHBOARD_API_KEY` | Prod only | Protects `/api/*` routes (maps to `org_default`) |
| `ALLOWED_ORIGIN` | No | CORS lock to deployment domain |
| `NEXTAUTH_URL` | Yes | Canonical URL (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Yes | Random 32+ char secret for JWT signing |
| `GITHUB_ID` | For GitHub login | GitHub OAuth App client ID |
| `GITHUB_SECRET` | For GitHub login | GitHub OAuth App client secret |
| `GOOGLE_ID` | For Google login | Google OAuth client ID |
| `GOOGLE_SECRET` | For Google login | Google OAuth client secret |
| `RESEND_API_KEY` | For email alerts | Resend API key for signal alert emails |
| `ALERT_FROM_EMAIL` | No | From address for alerts (default: `alerts@openclaw.dev`) |
| `CRON_SECRET` | For cron auth | Bearer token for Vercel Cron endpoint |

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
- **User auth**: NextAuth.js v4 with GitHub + Google OAuth (JWT strategy, no DB sessions)
- **Login flow**: `/login` → OAuth → callback → JWT cookie → redirect to `/dashboard`
- **Config**: `app/lib/auth.js` (providers, callbacks, user upsert), `app/api/auth/[...nextauth]/route.js`
- **Session**: `SessionWrapper.js` wraps layout; `UserMenu.js` in PageLayout header (avatar + sign out)
- **Users table**: `users` (id `usr_` prefix, org_id, email, provider, provider_account_id, role)
- **New user default**: mapped to `org_default` with role `member`
- `middleware.js` gates all `/api/*` routes AND all dashboard page routes
- Middleware matcher includes both API routes and all authenticated page routes (`/dashboard`, `/actions`, `/goals`, etc.)
- Page routes use `getToken()` from `next-auth/jwt` (Edge-compatible) for session checks
- `PROTECTED_ROUTES` array — prefix matching (includes `/api/orgs`, `/api/team`, `/api/invite`)
- `PUBLIC_ROUTES` — `/api/health`, `/api/setup/status`, `/api/waitlist`, `/api/auth`, `/api/webhooks/stripe`, `/api/cron`
- **Role-based access**: Two roles (`admin`, `member`). `session.user.role` available client-side via `useSession()`
- **Admin-only API routes** (return 403 for members): POST/DELETE `/api/keys`, POST/DELETE `/api/settings`, all `/api/team/invite`, PATCH/DELETE `/api/team/[userId]`, all `/api/orgs`, POST/DELETE `/api/webhooks`
- **Admin-only UI**: Generate/revoke API keys hidden for members; Integrations configure modal disabled; Team invite/role/remove sections hidden
- **Member-accessible**: All GET endpoints, all data APIs (actions, goals, learning, etc.)
- Dev mode (no `DASHBOARD_API_KEY` set) allows unauthenticated access → `org_default`
- Production without key returns 503 (if `DASHBOARD_API_KEY` not configured)
- Same-origin dashboard requests resolve org from NextAuth JWT token (falls back to `org_default`)
- Rate limiting: 100 req/min per IP
- **API key resolution flow**: legacy env key → `org_default` (fast path); otherwise SHA-256 hash → `api_keys` table lookup (5-min cache)
- **Dual auth**: Browser uses NextAuth cookies; external SDK uses `x-api-key` headers. Both inject `x-org-id`/`x-org-role`
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
- **Agent filter**: `AgentFilterContext.js` provides global agent filter; `AgentFilterDropdown.js` renders in PageLayout header. `AgentFilterProvider` is in `SessionWrapper.js` (global — persists across all pages). All data pages (Content, Goals, Learning, Relationships, Workflows, Security) pass `?agent_id=X` when filter is active.
- **Agent colors**: `app/lib/colors.js` — `getAgentColor(agentId)` returns consistent hash-based color from 8-color palette
- **Typography**: Inter font, `text-sm text-zinc-300` body, `text-xs text-zinc-500` labels, `font-mono text-xs` for timestamps/IDs, stat numbers max `text-2xl tabular-nums`
- **Dashboard grid**: Fixed 4-column layout in `DraggableDashboard.js` — no drag/customize mode

## Additional API Routes (POST-enabled)
- `GET /api/agents` — list agents (from action_records, grouped by agent_id; supports `?include_connections=true`)
- `GET/POST /api/agents/connections` — agent self-reported connections (GET: `?agent_id=X`, `?provider=Y`; POST: upsert connections array)
- `GET/POST/DELETE /api/settings` — integration credentials (supports `?agent_id=X` for per-agent overrides; POST/DELETE admin only)
- `GET/POST /api/tokens` — token snapshots + daily totals (disabled — API exists but not used by dashboard)
- `GET/POST /api/learning` — decisions + lessons
- `GET/POST /api/goals` — goals + milestones
- `GET/POST /api/content` — content items
- `GET/POST /api/relationships` — contacts + interactions
- `GET/POST /api/calendar` — calendar events
- `GET/POST /api/inspiration` — ideas/inspiration
- `GET/POST /api/memory` — memory health snapshots, entities, topics
- `GET/POST /api/waitlist` — waitlist signups (public, no auth required; POST upserts by email, GET lists signups)
- `GET/POST/DELETE /api/keys` — API key management (list, generate, revoke for current org; POST/DELETE admin only)
- `GET /api/team` — list workspace members + org info (rejects `org_default`)
- `GET/POST/DELETE /api/team/invite` — invite management (admin only: create, list pending, revoke)
- `PATCH/DELETE /api/team/[userId]` — role change + remove member (admin only; DELETE `?action=leave` for self-leave)
- `GET/POST /api/invite/[token]` — invite details (public GET) + accept invite (POST, requires auth)
- `GET /api/onboarding/status` — onboarding progress (workspace_created, api_key_exists, first_action_sent)
- `POST /api/onboarding/workspace` — create workspace (org) during onboarding
- `POST /api/onboarding/api-key` — generate first API key during onboarding
- `GET /api/activity` — activity logs (paginated, filtered by action/actor/resource_type/date, joins users for actor info)
- `GET/POST/DELETE /api/webhooks` — webhook CRUD (GET: all members; POST/DELETE: admin only; max 10 per org)
- `POST /api/webhooks/[webhookId]/test` — send test webhook payload (admin only)
- `GET /api/webhooks/[webhookId]/deliveries` — recent delivery history (last 20)
- `GET/POST /api/notifications` — notification preferences per user (email channel, signal type filters)
- `GET /api/cron/signals` — Vercel Cron handler: detect new signals, fire webhooks, send email alerts
- `GET/POST /api/handoffs` — session handoffs (GET: `?agent_id`, `?date`, `?latest=true`; POST: required summary + agent_id)
- `GET/POST /api/context/points` — key points (GET: `?agent_id`, `?category`, `?session_date`; POST: required content)
- `GET/POST /api/context/threads` — threads (GET: `?agent_id`, `?status`; POST: required name, upserts on org+agent+name)
- `GET/PATCH /api/context/threads/[threadId]` — thread detail + update (PATCH: summary, status)
- `POST /api/context/threads/[threadId]/entries` — add entry to thread (validates thread exists + not closed)
- `GET/POST/DELETE /api/snippets` — snippets CRUD (GET: `?search`, `?tag`, `?language`; POST: upserts on org+name)
- `POST /api/snippets/[snippetId]/use` — increment snippet use_count
- `GET/POST /api/preferences` — user preferences (GET: `?type=summary|observations|preferences|moods|approaches`; POST: body.type discriminator)
- `GET /api/digest` — daily digest aggregation (GET: `?date`, `?agent_id`; aggregates from 7 tables, no storage)
- `POST /api/security/scan` — content security scanning (18 regex patterns; returns findings + redacted text; optionally stores metadata)
- `GET/POST/PATCH /api/messages` — agent messages (GET: `?agent_id`, `?direction=inbox|sent|all`, `?type`, `?unread=true`, `?thread_id`; POST: send message; PATCH: batch read/archive)
- `GET/POST/PATCH /api/messages/threads` — message threads (GET: `?status`, `?agent_id`; POST: create; PATCH: resolve/update)
- `GET/POST /api/messages/docs` — shared workspace documents (GET: `?id`, `?search`; POST: upsert by name)

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

### Token Tables (Disabled)
Token tracking is disabled in the dashboard UI pending a better approach. The API route, DB tables, SDK method, and CLI script still exist but are not linked from the UI. Tables: `token_snapshots`, `daily_totals` (created by migration Step 12).

### Memory Health Tables
- `health_snapshots` — periodic health metrics (score, file counts, duplicates, stale facts)
- `entities` — key entities extracted from memory (name, type, mention_count). Replaced on each POST.
- `topics` — topics/themes from memory (name, mention_count). Replaced on each POST.
- POST `/api/memory` accepts `{ health, entities, topics }` — creates snapshot, replaces entities/topics
- Migration Step 13 in `migrate-multi-tenant.mjs` creates all three tables (idempotent)

### Waitlist Table
- `waitlist` — email signups from landing page (no `org_id` — pre-authentication, global)
- Columns: `id` (SERIAL), `email` (TEXT UNIQUE), `signed_up_at` (TEXT), `signup_count` (INTEGER), `source` (TEXT), `notes` (TEXT)
- POST upserts via `ON CONFLICT (email)` — bumps `signup_count` on duplicates
- Migration Step 14 in `migrate-multi-tenant.mjs` + auto-create fallback in route

### Users Table (NextAuth)
- `users` — OAuth users for dashboard access (managed by auth, not tenant-scoped)
- Columns: `id` (TEXT `usr_` prefix), `org_id` (TEXT, default `org_default`), `email`, `name`, `image`, `provider`, `provider_account_id`, `role`, `created_at`, `last_login_at`
- Unique index: `users_provider_account_unique` on `(provider, provider_account_id)`
- Upserted on every login via `signIn` callback in `app/lib/auth.js`
- Migration Step 15 in `migrate-multi-tenant.mjs`

### Agent ID on Data Tables
- Step 16: `agent_id TEXT` added to `content`, `contacts`, `interactions`, `goals`, `milestones`, `workflows`, `executions`
- Nullable (legacy records get NULL), indexed per table
- API routes for all 7 tables support `?agent_id=X` GET filter
- POST endpoints for content, goals, relationships accept `agent_id` in body
- SDK methods `createGoal()`, `recordContent()`, `recordInteraction()` auto-send `agent_id`
- Signals API: post-filters assembled signals by `agent_id`
- Assumptions API: adds `ar.agent_id` to dynamic WHERE clause

### Security Page
- Route: `/security` (client component, behind auth middleware)
- Fetches 3 endpoints: `/api/actions/signals`, `/api/actions?limit=100`, `/api/actions/assumptions?drift=true`
- Stats bar: Active Signals, High-Risk (24h), Unscoped Actions, Invalidated Assumptions (7d)
- Signal feed (left): clickable rows sorted by severity, opens SecurityDetailPanel
- High-risk actions (right): actions with risk_score>=70 OR (unscoped AND irreversible)
- SecurityDetailPanel: slide-out drawer from right, closes on Escape/backdrop click
- Auto-refresh every 30 seconds; respects global agent filter
- Sidebar: "Security" link with ShieldAlert icon in Operations group

## Team & Invites (Implemented)
- Route: `/team` — manage workspace members, invite links, role changes
- Table: `invites` (id `inv_` prefix, org_id, email, role, token, invited_by, status, accepted_by, expires_at, created_at)
- Invite tokens: 64 hex chars, 7-day expiry, link-based (no email service needed)
- API: `GET /api/team` — list members + org info (rejects `org_default`)
- API: `GET/POST/DELETE /api/team/invite` — invite CRUD (admin only)
- API: `PATCH/DELETE /api/team/[userId]` — role change + remove member (admin only; DELETE `?action=leave` for self-leave)
- API: `GET/POST /api/invite/[token]` — public GET for invite details, POST to accept (requires auth)
- Single org per user: users on `org_default` can accept; users on another org must leave first
- Invite accept is race-safe (`WHERE status='pending'` in UPDATE)
- Leave workspace: moves user back to `org_default`, hidden for last admin
- Sidebar: "Team" link with UsersRound icon in System group
- Migration Step 17 in `migrate-multi-tenant.mjs`

### Invites Table
- `invites` — team invitation links
- Columns: `id` (TEXT `inv_` prefix), `org_id`, `email` (nullable — NULL = open invite), `role` (admin/member), `token` (UNIQUE, 64 hex chars), `invited_by` (usr_ id), `status` (pending/accepted/revoked), `accepted_by` (usr_ id), `expires_at` (TEXT ISO), `created_at` (TEXT ISO)
- Indexes: `idx_invites_token`, `idx_invites_org_id`, `idx_invites_status`
- Migration Step 17 in `migrate-multi-tenant.mjs` + `ensureTable()` fallback in invite route

### Usage Meters Table
- `usage_meters` — atomic counters for billing quota enforcement (replaces live COUNTs)
- Columns: `id` (SERIAL), `org_id`, `period` (TEXT: `'YYYY-MM'` for monthly or `'current'` for snapshots), `resource` (TEXT: `actions_per_month` | `agents` | `members` | `api_keys`), `count` (INTEGER), `last_reconciled_at` (TEXT), `updated_at` (TEXT)
- Unique index: `usage_meters_org_period_resource_unique` on `(org_id, period, resource)` — enables atomic `INSERT ... ON CONFLICT DO UPDATE`
- Monthly resources (`actions_per_month`, `agents`): period = `'2026-02'`; snapshot resources (`members`, `api_keys`): period = `'current'`
- Cold start: first request seeds meters from live COUNTs; subsequent requests read 1 row
- Increments are fire-and-forget (don't block API responses); `GREATEST(0, count + delta)` prevents negative counters
- Functions in `app/lib/billing.js`: `getCurrentPeriod()`, `incrementMeter()`, `checkQuotaFast()`, `seedMeters()` (private)
- `getUsage()` reads from meters (1 query for up to 4 rows); `checkQuota()` delegates to `checkQuotaFast()`
- Meter increment points: `POST /api/actions` (+actions, +agents if new), `POST/DELETE /api/keys` (+/-api_keys), `POST /api/invite/[token]` accept (+members), `DELETE /api/team/[userId]` (-members)
- Migration Step 19 in `migrate-multi-tenant.mjs`

## Activity Log (Implemented)
- Route: `/activity` — audit trail of admin actions + system events
- Table: `activity_logs` (id `al_` prefix, org_id, actor_id, actor_type, action, resource_type, resource_id, details JSON, ip_address, created_at)
- Library: `app/lib/audit.js` — fire-and-forget `logActivity()` (same pattern as `incrementMeter()`)
- API: `GET /api/activity` — paginated, filtered by action/actor_id/resource_type/before/after, JOINs users for actor name/image
- Stats: total events, today's events, unique actors
- Actor types: `user`, `system`, `api_key`, `cron`
- Audited events: `key.created`, `key.revoked`, `invite.created`, `invite.revoked`, `invite.accepted`, `role.changed`, `member.removed`, `member.left`, `setting.updated`, `setting.deleted`, `billing.checkout_started`, `webhook.created`, `webhook.deleted`, `webhook.tested`, `webhook.fired`, `signal.detected`, `alert.email_sent`
- Indexes: org_id, created_at, action, actor_id
- Sidebar: "Activity" link with Clock icon in System group (after Billing)
- Migration Step 20 in `migrate-multi-tenant.mjs`

## Webhooks (Implemented)
- Route: `/webhooks` — manage webhook endpoints for signal notifications
- Tables: `webhooks` (id `wh_` prefix), `webhook_deliveries` (id `wd_` prefix)
- Library: `app/lib/webhooks.js` — `signPayload()` (HMAC-SHA256), `deliverWebhook()`, `fireWebhooksForOrg()`
- API: `GET/POST/DELETE /api/webhooks` (GET: all members; POST/DELETE: admin only)
- API: `POST /api/webhooks/[webhookId]/test` — send test payload (admin only)
- API: `GET /api/webhooks/[webhookId]/deliveries` — recent delivery history (last 20)
- Webhook secret: 32-byte hex, shown once on creation, HMAC-SHA256 signature in `X-OpenClaw-Signature` header
- Event subscription: JSON array of signal types or `["all"]`
- Max 10 webhooks per org; auto-disabled after 10 consecutive failures
- Delivery logging: status (pending/success/failed), response_status, response_body (truncated to 2000 chars), duration_ms
- Sidebar: "Webhooks" link with Webhook icon in System group (after Activity)
- Migration Steps 21-22 in `migrate-multi-tenant.mjs`

## Email Alerts & Cron (Implemented)
- Route: `/notifications` — email alert preferences per user
- Tables: `notification_preferences` (id `np_` prefix, unique on org_id+user_id+channel), `signal_snapshots` (deduplication via signal_hash)
- Library: `app/lib/signals.js` — `computeSignals()` extracted from signals API route (shared by API + cron)
- Library: `app/lib/notifications.js` — `sendSignalAlertEmail()` via Resend SDK (no-op if `RESEND_API_KEY` not set)
- API: `GET/POST /api/notifications` — user preference CRUD (email channel, signal type filters)
- Cron: `GET /api/cron/signals` — Vercel Cron every 10 min:
  1. Auth via `Authorization: Bearer CRON_SECRET` (skip in dev)
  2. For each org: compute signals → hash → compare to `signal_snapshots` → find NEW signals
  3. Upsert all current signals into snapshots (update `last_seen_at`)
  4. For new signals: fire webhooks, send emails to opted-in users, log activities
- Signal hashing: MD5 of `type:agent_id:action_id:loop_id:assumption_id`
- Vercel Cron config: `vercel.json` with `*/10 * * * *` schedule
- Sidebar: "Notifications" link with Bell icon in System group (after Webhooks)
- Migration Step 23 in `migrate-multi-tenant.mjs`
- Env vars: `RESEND_API_KEY`, `ALERT_FROM_EMAIL` (default: `alerts@openclaw.dev`), `CRON_SECRET`

## Onboarding Flow (Implemented)
- 4-step guided checklist displayed on dashboard via `OnboardingChecklist.js` (full-width, self-hides when complete)
- **Step 1**: Create Workspace — text input, calls `POST /api/onboarding/workspace` (creates org, updates user)
- **Step 2**: Generate API Key — button-triggered, calls `POST /api/onboarding/api-key`, shows raw key with copy button
- **Step 3**: Install SDK — static code blocks with key pre-filled
- **Step 4**: Send First Action — code snippet, polls `GET /api/onboarding/status` every 5s to detect first action
- Status endpoint derives 3 booleans: `workspace_created` (org != org_default), `api_key_exists`, `first_action_sent`
- Only users on `org_default` see workspace creation; auto-hides + reloads when all steps done
- Workspace creation auto-generates slug from name, sets plan to `free`, promotes user to `admin`

## API Keys Page (Implemented)
- Route: `/api-keys` — manage workspace API keys
- Lists active and revoked keys with creation/last-used dates
- Generate new keys with labels (format: `oc_live_{32_hex}`, raw shown once)
- Revoke keys with confirmation
- Guards: shows alert if user still on `org_default` (no workspace yet)
- Stats bar: Total, Active, Revoked counts
- Backend: `GET/POST/DELETE /api/keys` (rejects `org_default` users; POST/DELETE admin only)
- Sidebar: "API Keys" link with KeyRound icon in System group
- **Role enforcement**: Generate/revoke buttons hidden for members; empty state shows "ask admin" message

## SDK Documentation Page (Implemented)
- Route: `/docs` — public server component (no auth required, not in middleware matcher)
- Full reference for all 22 active SDK methods organized into 4 categories
- Categories: Action Recording (6), Loops & Assumptions (7), Signals (1), Dashboard Data (8)
- Each method: signature, description, parameter table, return type, code example
- Sticky side navigation with anchor links to all sections
- Quick Start section (3 steps: copy SDK, init client, record first action)
- Constructor reference (5 params), Error Handling section
- Same visual shell as landing page (navbar, footer, dark background)
- Landing page links: navbar "Docs", SDK section "View full SDK docs", footer "Docs"

## JWT Org Refresh
- `app/lib/auth.js` JWT callback periodically re-queries user's org_id/role (5-min TTL)
- Ensures session picks up org changes (e.g., after workspace creation during onboarding)
- Tracks `orgRefreshedAt` timestamp in token to avoid re-querying on every request

## Multi-Tenancy

### Tables
- `organizations` — id (TEXT PK `org_`), name, slug (unique), plan
- `api_keys` — id (TEXT PK `key_`), org_id (FK), key_hash (SHA-256), key_prefix, label, role, revoked_at
- All 33 data tables have `org_id TEXT NOT NULL DEFAULT 'org_default'` + index

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

## DashClaw Tables (Migration Steps 24-29)

### Handoffs Table (Step 24)
- `handoffs` — session handoff documents for agent continuity
- Columns: `id` (TEXT `ho_` prefix), `org_id`, `agent_id`, `session_date`, `summary`, `key_decisions` (JSON TEXT), `open_tasks` (JSON TEXT), `mood_notes`, `next_priorities` (JSON TEXT), `created_at`
- Indexes: org_id, agent_id, session_date

### Context Tables (Steps 25-26)
- `context_points` — key points captured during sessions
- Columns: `id` (`cp_`), `org_id`, `agent_id`, `content`, `category` (decision|task|insight|question|general), `importance` (1-10), `session_date`, `compressed`, `created_at`
- `context_threads` — named threads for tracking topics across entries
- Columns: `id` (`ct_`), `org_id`, `agent_id`, `name`, `summary`, `status` (active|closed), `created_at`, `updated_at`
- Unique: `(org_id, COALESCE(agent_id, ''), name)`
- `context_entries` — entries within threads
- Columns: `id` (`ce_`), `thread_id` FK, `org_id`, `content`, `entry_type`, `created_at`

### Snippets Table (Step 27)
- `snippets` — reusable code snippets
- Columns: `id` (`sn_`), `org_id`, `agent_id`, `name`, `description`, `code`, `language`, `tags` (JSON TEXT), `use_count`, `created_at`, `last_used`
- Unique: `(org_id, name)` — POST upserts on conflict

### User Preference Tables (Step 28)
- `user_observations` (`uo_`) — agent observations about users (observation, category, importance)
- `user_preferences` (`up_`) — learned user preferences (preference, category, confidence)
- `user_moods` (`um_`) — mood/energy tracking (mood, energy, notes)
- `user_approaches` (`ua_`) — tracked approaches with success/fail counts. Unique: `(org_id, COALESCE(agent_id, ''), approach)`

### Security Findings Table (Step 29)
- `security_findings` (`sf_`) — metadata from security scans (never stores actual content)
- Columns: `id`, `org_id`, `agent_id`, `content_hash` (SHA-256), `findings_count`, `critical_count`, `categories` (JSON TEXT), `scanned_at`

## Agent Messaging Tables (Migration Steps 30-32)

### Agent Messages Table (Step 30)
- `agent_messages` (`msg_`) — async messages between agents with inbox semantics
- Columns: `id`, `org_id`, `thread_id` (FK to message_threads), `from_agent_id`, `to_agent_id` (NULL = broadcast), `message_type` (action|info|lesson|question|status), `subject`, `body`, `urgent` (boolean), `status` (sent|read|archived), `doc_ref`, `read_by` (JSON array for broadcast tracking), `created_at`, `read_at`, `archived_at`
- Indexes: org_id, (org_id, to_agent_id, status), thread_id, (org_id, from_agent_id)

### Message Threads Table (Step 31)
- `message_threads` (`mt_`) — multi-turn conversation threads
- Columns: `id`, `org_id`, `name`, `participants` (JSON array of agent IDs, NULL = open), `status` (open|resolved|archived), `summary`, `created_by`, `created_at`, `updated_at`, `resolved_at`
- Indexes: org_id, (org_id, status)

### Shared Docs Table (Step 32)
- `shared_docs` (`sd_`) — collaborative workspace documents
- Columns: `id`, `org_id`, `name`, `content`, `created_by`, `last_edited_by`, `version` (auto-incrementing on upsert), `created_at`, `updated_at`
- Indexes: org_id; UNIQUE (org_id, name) for upsert

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
| `NEXTAUTH_URL` | Production | No |
| `NEXTAUTH_SECRET` | Production | Yes |
| `GITHUB_ID` | Production | Yes |
| `GITHUB_SECRET` | Production | Yes |
| `GOOGLE_ID` | Production | Yes |
| `GOOGLE_SECRET` | Production | Yes |
| `RESEND_API_KEY` | Production (optional) | Yes |
| `CRON_SECRET` | Production | Yes |

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

### DashClaw SDK (npm package — 54 active methods)

The SDK is published as `dashclaw` on npm. Class name is `DashClaw` (backward-compat alias `OpenClawAgent`).

```bash
npm install dashclaw
```

```javascript
import { DashClaw } from 'dashclaw';
// or: import { OpenClawAgent } from 'dashclaw';  // backward compat

const claw = new DashClaw({
  baseUrl: 'https://openclaw-pro.vercel.app',
  apiKey: process.env.OPENCLAW_API_KEY,
  agentId: 'my-agent',
  agentName: 'My Agent',
});
```

**Action Recording (6)**: `createAction()`, `updateOutcome()`, `getActions()`, `getAction()`, `getActionTrace()`, `track()`

**Loops & Assumptions (7)**: `registerOpenLoop()`, `resolveOpenLoop()`, `getOpenLoops()`, `registerAssumption()`, `getAssumption()`, `validateAssumption()`, `getDriftReport()`

**Signals (1)**: `getSignals()`

**Dashboard Data (8)**: `recordDecision()`, `createGoal()`, `recordContent()`, `recordInteraction()`, `reportConnections()`, `createCalendarEvent()`, `recordIdea()`, `reportMemoryHealth()`

**Session Handoffs (3)**: `createHandoff()`, `getHandoffs()`, `getLatestHandoff()`

**Context Manager (7)**: `captureKeyPoint()`, `getKeyPoints()`, `createThread()`, `addThreadEntry()`, `closeThread()`, `getThreads()`, `getContextSummary()`

**Automation Snippets (4)**: `saveSnippet()`, `getSnippets()`, `useSnippet()`, `deleteSnippet()`

**User Preferences (6)**: `logObservation()`, `setPreference()`, `logMood()`, `trackApproach()`, `getPreferenceSummary()`, `getApproaches()`

**Daily Digest (1)**: `getDailyDigest()`

**Security Scanning (2)**: `scanContent()`, `reportSecurityFinding()`

**Agent Messaging (9)**: `sendMessage()`, `getInbox()`, `markRead()`, `archiveMessages()`, `broadcast()`, `createMessageThread()`, `getMessageThreads()`, `resolveMessageThread()`, `saveSharedDoc()`

**Disabled**: `reportTokenUsage()` — exists in SDK but token tracking is disabled in the dashboard
