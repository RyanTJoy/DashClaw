# OpenClaw Pro

AI agent operations dashboard — a Next.js 14 app that gives AI agents (and their operators) a command center for tracking actions, token usage, learning, relationships, goals, content, and workflows.

![Next.js](https://img.shields.io/badge/Next.js-14-black) ![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38bdf8) ![Neon](https://img.shields.io/badge/Neon-Postgres-00e599) ![License](https://img.shields.io/badge/License-MIT-green)

## One-Click Deploy

[![Deploy with Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/new/clone?repository-url=https://github.com/ucsandman/OpenClaw-Pro&env=DATABASE_URL&envDescription=Your%20Neon%20PostgreSQL%20connection%20string&envLink=https://console.neon.tech)

**New to this?** Check out our [Quick Start Guide](QUICK-START.md) - no coding required!

**Already deployed?** Visit `/setup` for a guided walkthrough!

## Using this with Clawd/Clawdbot (recommended)

This repo includes a **tools bundle** (memory, security, learning, token tracking, etc.) designed to be installed into your **Clawd workspace**.

From this repo root:
- Windows: `powershell -ExecutionPolicy Bypass -File .\clawd-tools\install-windows.ps1`
- Mac/Linux: `bash ./clawd-tools/install-mac.sh`

See: [`clawd-tools/README.md`](clawd-tools/README.md)

### Tools bundle (at a glance)

Installed into your Clawd workspace, you get:
- **Security**: outbound filter, secret rotation tracker, audit logger, skill safety checker
- **Tokens**: token capture + dashboards, efficiency/budget helpers
- **Memory**: memory search, memory health scanner, memory extractor
- **Ops tracking**: learning database, relationship tracker, goal tracker, open loops
- **Workflow/ops helpers**: session handoff, context manager, daily digest, error logger, project monitor, API monitor

## Features

### Operations & Monitoring

- **Token Budget Tracking** — Real-time usage with visual charts and budget bars
- **ActionRecord Control Plane** — Full action lifecycle: create, track, signals, assumptions, open loops, post-mortem
- **Risk Signals** — 6 automated signal types (autonomy spike, stale loops, assumption drift, etc.)
- **Open Loops** — Track unresolved items with priority and type classification

### Data & Insights

- **Learning Database** — Track decisions, lessons, and outcomes over time
- **Relationship Tracker (Mini-CRM)** — Contacts, interactions, and follow-up reminders
- **Goal Tracking** — Goals, milestones, and progress visualization
- **Content Tracker** — Capture writing ideas and content workflows
- **Workflows / SOPs** — Document repeatable processes and runbooks

### Security

- **Secure Settings Store** — Credentials encrypted and stored in your database
- **Connection Tests** — Verify integrations before saving
- **Security Scanner** — Pre-deploy audit script (`node scripts/security-scan.js`)
- **Multi-Tenant Isolation** — Org-scoped data with API key authentication

### Platform & UX

- **Integrations Settings** — Configure services from the UI
- **Calendar Integration** — Upcoming events at a glance
- **Real-time Updates** — Auto-refresh with configurable intervals
- **Mobile Responsive** — Collapsible sidebar, works on any device
- **Dark Theme** — Flat surface design with Inter font and Lucide icons

## Quick Start (Local)

### 1) Clone the project

```bash
git clone git@github.com:ucsandman/OpenClaw-Pro.git
cd OpenClaw-Pro
```

### 2) Set up your database

Create a free [Neon](https://neon.tech) PostgreSQL database.

### 3) Configure environment

Create `.env.local` (you can copy `.env.example`) and set:

```bash
DATABASE_URL=postgresql://...
```

### 4) Install and run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Security

- **Local-only (http://localhost:3000):** you can run without `DASHBOARD_API_KEY`.
- **Public deployment (Vercel / any URL on the internet):** set `DASHBOARD_API_KEY` or your dashboard API data may be readable by anyone who has the link.

### Run Security Scan

Before deploying, scan your codebase:

```bash
node scripts/security-scan.js
```

### Security Documentation

- [Security Guide](docs/SECURITY.md) - How we protect your data
- [Security Checklist](docs/SECURITY-CHECKLIST.md) - Quick deployment checklist
- [Audit Template](docs/SECURITY-AUDIT-TEMPLATE.md) - Full audit methodology

## Deployment

### Vercel (Recommended)

1. Push to GitHub (or fork this repo)
2. Import in [Vercel](https://vercel.com)
3. Add `DATABASE_URL` environment variable
4. **Set `DASHBOARD_API_KEY`** (protects your `/api/*` data)
5. Deploy!

### Other platforms

Any platform supporting Next.js 14+ will work. Just set the `DATABASE_URL` environment variable.

## API Endpoints

All endpoints return JSON and support CORS.

| Endpoint | Description |
|----------|-------------|
| `/api/actions` | ActionRecord CRUD + signals + loops + assumptions |
| `/api/settings` | Integration credentials (CRUD) |
| `/api/settings/test` | Test connection with credentials |
| `/api/tokens` | Token usage snapshots |
| `/api/learning` | Decisions and lessons |
| `/api/inspiration` | Ideas and ratings |
| `/api/relationships` | Contacts and interactions |
| `/api/goals` | Goals and milestones |
| `/api/calendar` | Upcoming events |
| `/api/bounties` | Bounty tracking |
| `/api/workflows` | Workflow definitions |
| `/api/orgs` | Organization management (admin) |
| `/api/health` | Database connectivity check |

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: JavaScript
- **Styling**: Tailwind CSS 3 + CSS custom properties
- **Icons**: lucide-react
- **Font**: Inter (next/font/google)
- **Database**: Neon PostgreSQL
- **Charts**: Recharts
- **Deployment**: Vercel

## Contributing

PRs welcome! This is a community project for the Clawd ecosystem.

## License

MIT

---

Built by [ucsandman](https://github.com/ucsandman)
