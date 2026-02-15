# Agent Bootstrap

DashClaw supports importing existing agent state (memory, goals, decisions, snippets, preferences) into the dashboard.

There are three supported paths:

1. CLI scanner: `scripts/bootstrap-agent.mjs` (recommended)
2. Agent self-discovery prompt: `scripts/bootstrap-prompt.md`
3. Bulk sync API: `POST /api/sync`

## 1) CLI Scanner (`scripts/bootstrap-agent.mjs`)

This is a mechanical scanner that reads an agent workspace directory and pushes discovered state to DashClaw.

### One-liner examples

Preview only (no writes to DashClaw):

```powershell
node scripts/bootstrap-agent.mjs --dir "C:\path\to\agent" --agent-id "my-agent" --agent-name "My Agent" --local --dry-run
```

Push to local dashboard:

```powershell
node scripts/bootstrap-agent.mjs --dir "C:\path\to\agent" --agent-id "my-agent" --agent-name "My Agent" --local
```

Push to a remote dashboard:

```bash
node scripts/bootstrap-agent.mjs --dir "/path/to/agent" --agent-id "my-agent" --agent-name "My Agent" --base-url "https://your-host" --api-key "oc_live_..."
```

### Flags

- `--dir` (required): agent workspace directory
- `--agent-id` (required): unique agent identifier (e.g. `moltfire`)
- `--agent-name` (optional): display name
- `--base-url` (optional): API base URL (default `http://localhost:3000`)
- `--api-key` (optional): API key (defaults to `DASHCLAW_API_KEY` from the DashClaw server `.env.local`)
- `--org-id` (optional): target org ID (overrides API key org resolution; requires admin role)
- `--local`: shorthand for `--base-url http://localhost:3000`
- `--dry-run`: print JSON payload preview and exit

### How it works

The scanner runs three phases:

1. **Discover** — recursively walks the workspace directory, collecting all text files (excludes `node_modules`, `.git`, binaries, files > 512KB; max depth 8, max 5000 files)
2. **Classify** — each file is classified into one of 15 categories (identity, relationships, skills, tools, projects, etc.) using a priority-ordered classifier chain with confidence scoring
3. **Extract** — classified files are dispatched to category-specific extractors, plus the original curated scanners run for backward compatibility

### What it reads (workspace)

**Adaptive discovery** finds all relevant files automatically. The following are examples — the scanner adapts to any workspace structure:

- Identity files (`IDENTITY.md`, `SOUL.md`, `VALUES.md`, etc.)
- User/operator files (`USER.md`, `OPERATOR.md`)
- Relationship data (`people/`, `relationships.json`, individual `.md` files per person)
- Skill directories (`skills/`, `.claude/skills/`)
- Tool documentation (`tools/`, `TOOLS*.md`)
- Operational config (`SECURITY.md`, `GUARDRAILS.md`, `HEARTBEAT.md`)
- Project files (`projects/`, `PROJECT_STATUS.md`)
- Creative works (`creative/`, `writing/`)
- Decision logs (`decisions/`)
- Daily logs (`YYYY-MM-DD.md` pattern)
- Goals/tasks (`tasks/`, `todo.md`)
- Memory markdown (`memory/`, `.claude/`)
- Connection detection from `.env*` key names and `package.json` dependencies

### What it syncs

- `connections`: inferred providers (GitHub, Google, Neon, Stripe, etc.) from env key names and dependencies
- `memory`:
  - health snapshot (file/line/size stats, daily log span)
  - entities/topics extracted from markdown headings/bold/backticks
- `goals`:
  - `tasks/todo.md` checkboxes (if present)
  - `projects.md` and discovered project files (with deduplication)
  - `memory/pending-tasks.md` `**Task:**` blocks (if present)
- `learning` (decisions/lessons):
  - `memory/decisions/*.md` tables: `Decision | Why | Outcome`
  - `tasks/lessons.md` bullets (if present)
  - `CLAUDE.md` lesson/pattern sections (if present)
- `context_points`:
  - `CLAUDE.md` sections (if present)
  - `MEMORY.md` section summaries (lightweight)
  - Identity, user profile, and operational config context (from adaptive extractors)
- `snippets`:
  - fenced code blocks from a small set of high-signal docs (e.g. `TOOLS*.md`, `projects.md`, `MEMORY.md`)
- `preferences`:
  - `MEMORY.md` "Active Preferences" bullet list (if present)
  - Identity-derived preferences (values, traits)
  - Operational config preferences (guardrails, rules)
- `relationships` (new): people/contacts extracted from relationship files and structured JSON
- `capabilities` (new): skills and tools discovered from skill/tool directories and documentation
- `content` (new): creative works imported from creative/writing directories

### Security notes

- The scanner does **not** transmit `.env` values.
- It **does** transmit extracted text and code blocks from markdown when importing snippets/context/goals/decisions. Use `--dry-run` to preview exactly what will be sent.
- The server applies best-effort DLP redaction before storing high-risk text fields, but do not rely on DLP as your only defense.

## 2) Agent Self-Discovery Prompt (`scripts/bootstrap-prompt.md`)

This is a markdown prompt you paste to an agent. The agent introspects its own workspace and pushes state via the SDK.

Use this when you cannot run `scripts/bootstrap-agent.mjs` on the same machine as the workspace.

## 3) Bulk Sync API (`POST /api/sync`)

Single endpoint that accepts multiple data categories in one request. Each category is processed independently (partial failures do not block other categories).

Request (every key optional):

```json
{
  "connections": [{ "provider": "github", "auth_type": "oauth", "status": "active" }],
  "memory": { "health": { "score": 75 }, "entities": [], "topics": [] },
  "goals": [{ "title": "Deploy v2", "status": "active" }],
  "learning": [{ "decision": "Used JWT", "reasoning": "Edge compat", "outcome": "success" }],
  "context_points": [{ "content": "Dark-only theme", "category": "insight", "importance": 7 }],
  "snippets": [{ "name": "api-pattern", "code": "...", "language": "javascript" }],
  "preferences": { "preferences": [{ "preference": "Prefer concise output", "confidence": 80 }] }
}
```

Category limits (current defaults; see `app/api/sync/route.js`):

- `connections`: 1000
- `goals`: 2000
- `learning`: 2000
- `content`: 2000
- `inspiration`: 2000
- `context_points`: 5000
- `context_threads`: 1000
- `snippets`: 1000
- `handoffs`: 1000
- `observations` / `preferences` / `moods` / `approaches`: 1000 each
- `relationships`: 1000
- `capabilities`: 1000

