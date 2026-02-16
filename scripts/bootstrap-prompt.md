# DashClaw Agent Self-Discovery Prompt

> Paste this prompt into an agent's session. The agent introspects its own state and outputs a single JSON payload you can push to DashClaw via `POST /api/sync`.

---

## Instructions for the agent

Your operator uses **DashClaw** to track agent state, decisions, and operational data. Answer each section below to sync your current state. Output a single JSON object at the end — do NOT make individual API calls.

**Rules:**
- Be honest and specific — generic filler ("I aim to be helpful") is not useful.
- Skip any section you genuinely have nothing for — omit the key entirely.
- All string fields have max lengths noted in brackets. Truncate if needed.
- Set `agent_id` to your own identifier (the name your operator uses for you).
- NEVER include secrets, API keys, passwords, or tokens.

---

### 1. Goals & Priorities

What are you actively working toward? Include both high-level objectives and current tasks.

For each goal:
- `title` [max 500 chars]: what the goal is
- `status`: one of `"active"`, `"completed"`, `"paused"`
- `category` (optional): e.g. `"project"`, `"task"`, `"learning"`
- `description` (optional) [max 500 chars]: why it matters or additional context
- `progress` (optional): 0–100

---

### 2. Learning & Decisions

Key lessons you've learned, decisions you've made, and their outcomes.

For each entry:
- `decision` [max 2000 chars]: what was decided or learned
- `context` (optional): when/why this came up
- `reasoning` (optional): the rationale
- `outcome`: one of `"success"`, `"failure"`, `"pending"`
- `confidence`: 0–100

---

### 3. Handoffs (Recent Sessions)

Summarize your recent work sessions. Each entry represents one session or work block.

For each handoff:
- `session_date` (optional): `"YYYY-MM-DD"` format
- `summary` [max 4000 chars]: what happened in this session
- `key_decisions` (optional): array of strings — decisions made
- `open_tasks` (optional): array of strings — what's still pending
- `mood_notes` (optional) [max 500 chars]: energy/focus/mood during the session
- `next_priorities` (optional): array of strings — what should happen next

---

### 4. Preferences & Communication Style

How you prefer to work and communicate.

#### 4a. Preferences
For each:
- `preference` [max 2000 chars]: the preference statement
- `category` (optional): e.g. `"communication"`, `"workflow"`, `"technical"`
- `confidence`: 0–100

#### 4b. Observations
Things you've noticed about the user, project, or environment.

For each:
- `observation` [max 2000 chars]: what you observed
- `category` (optional): e.g. `"user"`, `"project"`, `"environment"`
- `importance` (optional): 1–10

#### 4c. Approaches
Preferred workflows, strategies, or techniques you use.

For each:
- `approach` [max 500 chars]: the technique/workflow
- `context` (optional): when you use it
- `success` (optional): `true`/`false` — has it worked well?

#### 4d. Moods
Your recent operational moods/energy (if applicable).

For each:
- `mood` [max 100 chars]: the mood state
- `energy` (optional) [max 50 chars]: energy level
- `notes` (optional) [max 500 chars]: additional context

---

### 5. Relationships

People and entities you interact with regularly.

For each:
- `name` [max 255 chars]: the person/entity name
- `relationship_type`: e.g. `"operator"`, `"collaborator"`, `"stakeholder"`, `"contact"`
- `description` (optional): how you relate to them

---

### 6. Inspiration

Ideas, bookmarks, references, or reading material worth tracking.

For each:
- `title` [max 500 chars]: the idea or reference
- `description` (optional): additional detail
- `category` (optional) [max 50 chars]: grouping
- `source` (optional) [max 500 chars]: URL if applicable
- `status`: `"pending"` or `"completed"`

---

### 7. Context Points

Important facts, insights, or decisions about the project/environment that should persist.

For each:
- `content` [max 2000 chars]: the fact/insight
- `category`: one of `"general"`, `"insight"`, `"decision"`
- `importance`: 1–10

---

## What NOT to include

The CLI scanner (`scripts/bootstrap-agent.mjs`) handles these categories better mechanically — skip them here:

- **Connections** — detected from `.env` key names and `package.json` dependencies
- **Memory health** — computed from file stats
- **Snippets** — extracted from fenced code blocks in docs
- **Capabilities** — discovered from skill/tool directories
- **Context threads** — derived from document structure

---

## Output format

Produce a single JSON object matching this structure. Omit any top-level key you have no data for.

```json
{
  "agent_id": "your-agent-id",
  "goals": [
    { "title": "...", "status": "active", "progress": 50 }
  ],
  "learning": [
    { "decision": "...", "reasoning": "...", "outcome": "success", "confidence": 80 }
  ],
  "handoffs": [
    {
      "session_date": "2026-02-15",
      "summary": "...",
      "key_decisions": ["..."],
      "open_tasks": ["..."],
      "mood_notes": "...",
      "next_priorities": ["..."]
    }
  ],
  "preferences": {
    "preferences": [
      { "preference": "...", "category": "communication", "confidence": 85 }
    ],
    "observations": [
      { "observation": "...", "category": "user", "importance": 7 }
    ],
    "approaches": [
      { "approach": "...", "context": "...", "success": true }
    ],
    "moods": [
      { "mood": "focused", "energy": "high" }
    ]
  },
  "relationships": [
    { "name": "...", "relationship_type": "operator", "description": "..." }
  ],
  "inspiration": [
    { "title": "...", "source": "https://...", "status": "pending" }
  ],
  "context_points": [
    { "content": "...", "category": "insight", "importance": 8 }
  ]
}
```

---

## How to submit

Save the JSON output to a file (e.g. `payload.json`), then use one of:

### Option A: curl

```bash
curl -X POST https://your-dashclaw-host/api/sync \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '@payload.json'
```

### Option B: Node SDK

```javascript
import { DashClaw } from 'dashclaw';

const claw = new DashClaw({
  baseUrl: 'https://your-dashclaw-host',
  apiKey: 'YOUR_API_KEY',
  agentId: 'your-agent-id',
});

await claw.syncState(payload);
```

### Option C: Python SDK

```python
from dashclaw import DashClaw

claw = DashClaw(
    base_url="https://your-dashclaw-host",
    api_key="YOUR_API_KEY",
    agent_id="your-agent-id",
)

claw.sync_state(payload)
```
