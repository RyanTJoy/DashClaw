# DashClaw Agent Tools

This folder contains the **agent ops tools** (memory, security, learning, token tracking, etc.) that run locally alongside your AI agent.

## Where this goes

These tools should be copied into **your DashClaw workspace** like:
- `~/dashclaw/tools` (Mac/Linux)
- `C:\Users\<you>\dashclaw\tools` (Windows)

This repo's dashboard app can live anywhere. The tools bundle is what belongs in the agent workspace.

## What's included (quick glance)

- **Security**: outbound filter, secret rotation tracker, audit logger (with auto-redaction), skill safety checker
- **Tokens**: token capture + dashboards, efficiency/budget helpers
- **Memory**: memory search, memory health scanner, memory extractor
- **Ops tracking**: learning database, relationship tracker, goal tracker, open loops
- **Workflow/ops helpers**: session handoff, context manager, daily digest, error logger, project monitor, API monitor

## Install (recommended)

### Windows (PowerShell)
From the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\agent-tools\install-windows.ps1
```

### Mac/Linux (bash)
From the repo root:

```bash
bash ./agent-tools/install-mac.sh
```

## Dashboard sync (optional)

Tools run local-only by default. To sync data to a DashClaw dashboard, add `--push` to write commands:

```bash
python learner.py log "Made decision X" --push
```

Configure sync credentials in `secrets/dashclaw.env` or via environment variables. See `.env.example`.

## Privacy note

Some tools (like `user-context`) create local SQLite databases (example: `tools/user-context/data/user_context.db`) that can contain personal notes. Keep those databases private and never commit `*.db` files.

## Secrets

Do **not** put secrets in this repo.

Use a `secrets/` folder inside your DashClaw workspace (it is typically gitignored), or environment variables.
