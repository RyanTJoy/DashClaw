# Agent Bootstrap System

Three tools for importing existing agent state into the DashClaw dashboard:

## CLI Scanner (`scripts/bootstrap-agent.mjs`)
Mechanical scanner that reads an agent's workspace and pushes discovered data.

```bash
node scripts/bootstrap-agent.mjs \
  --dir /path/to/agent \
  --agent-id my-agent \
  --agent-name "My Agent" \
  --dry-run              # Preview without pushing

node scripts/bootstrap-agent.mjs \
  --dir /path/to/agent \
  --agent-id my-agent \
  --local                # Push to localhost:3000

node scripts/bootstrap-agent.mjs \
  --dir /path/to/agent \
  --agent-id my-agent \
  --api-key oc_live_xxx  # Push to production
```

**Flags**: `--dir` (required), `--agent-id` (required), `--agent-name`, `--base-url` (falls back to `DASHCLAW_BASE_URL`), `--api-key` (falls back to `DASHCLAW_API_KEY`), `--local`, `--dry-run`

**7 scanners**: connections (env keys + package.json deps), memory (.claude/ health + entities), goals (todo.md), learning (lessons.md), context points (CLAUDE.md sections), context threads (CLAUDE.md headings), snippets (fenced code blocks)

**Security**: Never reads .env values. Never transmits raw file contents. Only structured extracts.

## Agent Self-Discovery Prompt (`scripts/bootstrap-prompt.md`)
Markdown prompt file users paste to their agent. The agent introspects its own workspace and pushes state via the SDK. 10 steps covering all data categories. Uses `syncState()` for bulk efficiency with fallback to individual methods.

## Bulk Sync API (`POST /api/sync`)
Single endpoint that accepts all data categories in one request. Each category is a try/catch island — partial failures don't block other categories.

**Request** (every key optional):
```json
{
  "agent_id": "my-agent",
  "connections": [{ "provider": "github", "auth_type": "oauth", "status": "active" }],
  "memory": { "health": { "score": 75 }, "entities": [], "topics": [] },
  "goals": [{ "title": "Deploy v2", "status": "active" }],
  "learning": [{ "decision": "Used JWT", "reasoning": "Edge compat" }],
  "content": [{ "title": "API Docs", "platform": "docs" }],
  "inspiration": [{ "title": "Real-time signals", "category": "feature" }],
  "context_points": [{ "content": "Dark theme", "category": "insight", "importance": 7 }],
  "context_threads": [{ "name": "Auth", "summary": "Tracking auth decisions" }],
  "handoffs": [{ "summary": "Completed auth", "key_decisions": ["JWT"] }],
  "preferences": {
    "observations": [{ "observation": "Prefers dark mode" }],
    "preferences": [{ "preference": "Concise responses", "confidence": 90 }],
    "moods": [{ "mood": "focused", "energy": 8 }],
    "approaches": [{ "approach": "Code-first", "success": true }]
  },
  "snippets": [{ "name": "api-pattern", "code": "...", "language": "javascript" }]
}
```

**Response**:
```json
{
  "results": { "connections": { "synced": 5 }, "goals": { "synced": 3, "errors": ["..."] } },
  "total_synced": 46,
  "total_errors": 1,
  "duration_ms": 1250
}
```

**Limits**: connections 50, goals/learning/content/inspiration 100, context_points 200, threads/snippets/handoffs/preference sub-arrays 50
