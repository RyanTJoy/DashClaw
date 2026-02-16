# Agent Bootstrap

DashClaw supports importing existing agent state (memory, goals, decisions, snippets, preferences, handoffs, inspiration, and more) into the dashboard.

There are three supported paths:

1. CLI scanner: `scripts/bootstrap-agent.mjs` — mechanical file scanning (best for structured data)
2. Agent self-discovery prompt: `scripts/bootstrap-prompt.md` — agent introspects and self-reports (best for semantic data)
3. Bulk sync API: `POST /api/sync` — direct API calls

### Recommended: Hybrid Workflow

Run the scanner first (handles files, connections, snippets, capabilities mechanically), then paste the prompt to the agent (handles semantic understanding — relationships, reasoning, observations).

```powershell
# Step 1: Scanner — captures file-based data
node scripts/bootstrap-agent.mjs --dir "C:\path\to\agent" --agent-id "my-agent" --local --dry-run
# Review the output, then run without --dry-run to push

# Step 2: Prompt — paste scripts/bootstrap-prompt.md to the agent
# Agent outputs JSON → push via curl or SDK
```

### What each path covers

| Category | Scanner | Prompt | Notes |
|---|---|---|---|
| `connections` | yes | — | Detected from `.env` keys and `package.json` deps |
| `memory` | yes | — | Computed from file stats, headings, entities |
| `goals` | yes | yes | Scanner: checkboxes/project files. Prompt: semantic priorities |
| `learning` | yes | yes | Scanner: decision tables/lessons. Prompt: reasoning context |
| `content` | yes | — | Creative works from file discovery |
| `context_points` | yes | yes | Scanner: doc sections. Prompt: key insights |
| `context_threads` | yes | — | Derived from document structure |
| `snippets` | yes | — | Fenced code blocks from docs |
| `relationships` | yes | yes | Scanner: structured files. Prompt: semantic understanding |
| `capabilities` | yes | — | Skill/tool directories |
| `handoffs` | yes | yes | Scanner: daily log files. Prompt: session narratives |
| `inspiration` | yes | yes | Scanner: idea/bookmark files. Prompt: tracked references |
| `preferences.preferences` | yes | yes | Scanner: MEMORY.md lists. Prompt: communication style |
| `preferences.observations` | yes | yes | Scanner: observation/pattern headings. Prompt: noticed patterns |
| `preferences.moods` | yes | yes | Scanner: daily log mood sections. Prompt: operational state |
| `preferences.approaches` | yes | yes | Scanner: approach/strategy headings. Prompt: workflow preferences |

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
  - `preferences`: `MEMORY.md` "Active Preferences" bullet list, identity-derived values/traits, operational config rules
  - `observations`: bullets under observation/noticed/pattern headings in `MEMORY.md`, `CLAUDE.md`, `tasks/lessons.md`
  - `moods`: mood/energy/feeling sections from daily log files
  - `approaches`: bullets under approach/strategy/technique/method/workflow headings
- `handoffs`: daily log files (`YYYY-MM-DD*.md`) parsed into session summaries with decisions, open tasks, mood, and priorities (capped at 100 most recent)
- `inspiration`: `inspiration.md`, `ideas.md`, `bookmarks.md`, `reading-list.md`, `references.md` at root or in `memory/` (capped at 200 items)
- `relationships`: people/contacts extracted from relationship files and structured JSON
- `capabilities`: skills and tools discovered from skill/tool directories and documentation
- `content`: creative works imported from creative/writing directories

### Security notes

- The scanner does **not** transmit `.env` values.
- It **does** transmit extracted text and code blocks from markdown when importing snippets/context/goals/decisions. Use `--dry-run` to preview exactly what will be sent.
- The server applies best-effort DLP redaction before storing high-risk text fields, but do not rely on DLP as your only defense.

## 2) Agent Self-Discovery Prompt (`scripts/bootstrap-prompt.md`)

A self-contained prompt you paste into any agent session. The agent scans its own workspace files, builds a sync payload covering all 13 categories, adds self-reported semantic data (relationships, reasoning, observations), and pushes everything via `syncState()` — no operator intervention required.

The agent needs the DashClaw SDK already installed (Node or Python). The prompt includes file scanning instructions, output shapes with max lengths, and the SDK call to push.

Use this:
- As the primary bootstrap method — paste to an agent, it does everything
- When you want the agent to both scan files AND self-report semantic understanding
- When you cannot run the CLI scanner on the same machine as the workspace

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

