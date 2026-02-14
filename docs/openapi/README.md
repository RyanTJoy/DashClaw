---
source-of-truth: false
owner: API Governance Lead
last-verified: 2026-02-13
doc-type: architecture
---

# OpenAPI Artifacts

This folder contains generated OpenAPI artifacts for DashClaw APIs.

## Critical Stable Spec

- Artifact: `docs/openapi/critical-stable.openapi.json`
- Generator: `scripts/generate-openapi.mjs`
- Command: `npm run openapi:generate`
- Drift check command: `npm run openapi:check`

## Scope

The generated critical stable spec includes endpoints under these prefixes:

- `/api/actions`
- `/api/guard`
- `/api/policies`
- `/api/settings`
- `/api/webhooks`
- `/api/messages`
- `/api/context`
- `/api/handoffs`
- `/api/snippets`
- `/api/memory`
- `/api/keys`
- `/api/orgs`
- `/api/team`
- `/api/invite`
- `/api/usage`
- `/api/health`
