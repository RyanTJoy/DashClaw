# DashClaw

AI agent observability platform — a Next.js 14 app (JavaScript) providing a command center for AI agents and operators to track actions, learning, relationships, goals, and workflows.

**For full technical details, API routes, patterns, and database schema, see [PROJECT_DETAILS.md](PROJECT_DETAILS.md).**

## Core Routes
- **`/`** — Public landing page (server component)
- **`/docs`** — Public SDK documentation
- **`/dashboard`** — Authenticated operations dashboard
- **`/workspace`** — Agent workspace (digest, context, handoffs, snippets, preferences, memory)
- **`/security`** — Security monitoring (risk signals, guard decisions)

## Tech Stack
- **Runtime**: Node.js 18+
- **Framework**: Next.js 14 (App Router)
- **Language**: JavaScript (not TypeScript)
- **Styling**: Tailwind CSS 3
- **Database**: Neon PostgreSQL (`@neondatabase/serverless`)
- **Auth**: NextAuth.js v4 (GitHub + Google OAuth)
- **Icons**: lucide-react

## Essential Commands
```bash
npm install          # Install dependencies
npm run dev          # Dev server on :3000
npm run build        # Production build
npm run lint         # ESLint check
node scripts/test-actions.mjs   # ActionRecord tests (needs DATABASE_URL)
node scripts/security-scan.js   # Pre-deploy security audit
```

## Environment Variables
See `.env.example`. Key variables required:
- `DATABASE_URL`: Neon PostgreSQL connection string
- `NEXTAUTH_URL` & `NEXTAUTH_SECRET`: NextAuth configuration
- `GITHUB_ID` & `GITHUB_SECRET`: GitHub OAuth credentials
- `GOOGLE_ID` & `GOOGLE_SECRET`: Google OAuth credentials
- `DASHCLAW_API_KEY`: Production API protection

## Key Patterns
- **Database**: Use ``sql`SELECT...` `` with `@neondatabase/serverless`. Always cast TEXT timestamps for comparisons.
- **Multi-Tenancy**: Every route uses `getOrgId(request)` from `app/lib/org.js` to scope queries.
- **Auth**: `middleware.js` gates all `/api/*` and dashboard routes. Roles: `admin`, `member`.
- **UI**: Dark-only theme using CSS variables in `globals.css`. Shared primitives in `app/components/ui/`.

---
Refer to **[PROJECT_DETAILS.md](PROJECT_DETAILS.md)** for:
- Detailed Directory Structure
- Complete API Route Reference
- DB Table Schemas & Migrations
- SDK Method List
- Multi-tenant Resolution Logic
- Behavior Guard Implementation
- Deployment Configurations
