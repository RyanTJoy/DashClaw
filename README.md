---
source-of-truth: false
owner: DevEx Lead
last-verified: 2026-02-14
doc-type: onboarding
---

# DashClaw

DashClaw is an AI agent observability and governance platform built on Next.js 15.

## What This Repo Contains

- `app/`: Next.js App Router dashboard and API routes
- `sdk/`: Node SDK
- `sdk-python/`: Python SDK
- `agent-tools/`: Local Python agent tool suite
- `docs/`: Security, setup, decisions, and RFCs

## Quick Start

1. Clone and install:

```bash
git clone https://github.com/ucsandman/DashClaw.git
cd DashClaw
npm install
```

2. Configure environment:

```bash
cp .env.example .env.local
```

Set at minimum:

```bash
DATABASE_URL=postgresql://...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret
```

3. Run locally:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Primary Product Surfaces

- Customer website (platform narrative): `/`
- Dashboard (operator control plane): `/dashboard`
- SDK/public docs (full method reference + convergence status): `/docs`
- Toolkit overview: `/toolkit`

## Core Commands

```bash
npm run dev
npm run lint
npm run docs:check
npm run openapi:check
npm run api:inventory:check
npm run route-sql:check
npm run test -- --run
npm run build
```

## Canonical Documentation

- Architecture and system behavior: `PROJECT_DETAILS.md`
- Documentation governance rules: `docs/documentation-governance.md`
- RFC execution plan: `docs/rfcs/platform-convergence.md`
- RFC milestone status: `docs/rfcs/platform-convergence-status.md`
- SDK parity matrix and coverage status: `docs/sdk-parity.md`
- Client setup and usage: `docs/client-setup-guide.md`
- Agent bootstrap flow: `docs/agent-bootstrap.md`
- Security guide: `docs/SECURITY.md`
- Security checklist: `docs/SECURITY-CHECKLIST.md`
- Security audit template: `docs/SECURITY-AUDIT-TEMPLATE.md`
- Decisions (ADRs): `docs/decisions/`

## Deployment

- Vercel configuration: `vercel.json`
- Docker support: `Dockerfile`, `docker-compose.yml`

## Contributing

See `CONTRIBUTING.md`.

## License

MIT. See `LICENSE`.
