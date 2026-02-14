# Agent Bootstrap Prompt

> Paste this to any AI agent to have it self-discover its state and push it to DashClaw.
> Prerequisites: `dashclaw` package installed, API key available.

---

## Your Task

You are going to introspect your own workspace and report your current state to DashClaw, an observability platform. This lets the dashboard display your connections, memory health, goals, learning, context, and more.

**Important security rules:**
- NEVER transmit secrets, API keys, passwords, or tokens as values
- Only report key NAMES from .env files, never their values
- When syncing snippets/context/goals/learning, transmit only reviewed extracts (use `--dry-run` if using the CLI scanner). Do not include secrets.

## Setup

First, initialize the DashClaw SDK:

```javascript
import { DashClaw } from 'dashclaw';

const claw = new DashClaw({
  baseUrl: process.env.DASHCLAW_BASE_URL || 'http://localhost:3000',
  apiKey: process.env.DASHCLAW_API_KEY,
  agentId: 'YOUR_AGENT_ID',      // Replace with your agent identifier
  agentName: 'YOUR_AGENT_NAME',  // Replace with a human-readable name
});
```

## Option A: Bulk Sync (Recommended)

Build a single state object and push everything at once using `syncState()`. This is more efficient than individual calls.

```javascript
const state = {};
// ... populate categories below ...
const result = await claw.syncState(state);
console.log(`Synced ${result.total_synced} items in ${result.duration_ms}ms`);
```

## Option B: Individual Methods

If you prefer granular control, use individual SDK methods per step below.

---

## Step 1: Report Connections

Scan your environment to identify what services you connect to. Read `.env`, `.env.local`, and `package.json`.

**What to look for:** Environment variable key names (NOT values) that indicate integrations.

| Env Prefix | Provider | Auth Type |
|---|---|---|
| `GITHUB_` | github | oauth |
| `GOOGLE_` | google | oauth |
| `OPENAI_` | openai | api_key |
| `ANTHROPIC_` | anthropic | api_key |
| `STRIPE_` | stripe | api_key |
| `AWS_` | aws | api_key |
| `DATABASE_URL` (neon) | neon | api_key |
| `RESEND_` | resend | api_key |
| `SLACK_` | slack | api_key |
| `VERCEL_` | vercel | api_key |

Also check `package.json` dependencies for `stripe`, `openai`, `@anthropic-ai/sdk`, `@neondatabase/serverless`, etc.

**Bulk sync:**
```javascript
state.connections = [
  { provider: 'github', auth_type: 'oauth', status: 'active' },
  { provider: 'neon', auth_type: 'api_key', status: 'active' },
  // ... more
];
```

**Individual method:**
```javascript
await claw.reportConnections([
  { provider: 'github', auth_type: 'oauth', status: 'active' },
  { provider: 'neon', auth_type: 'api_key', status: 'active' },
]);
```

## Step 2: Report Memory Health

Scan your `.claude/` directory (or equivalent memory storage). Count markdown files, total lines, and estimate a health score.

**Health score heuristic:**
- Base: 50
- +10 if MEMORY.md exists
- +10 if total lines > 100
- +10 if more than 3 memory files
- +10 if CLAUDE.md exists at project root
- +5 if more than 5 topics identified

Extract entities (bold terms, code references) and topics (## headings).

**Bulk sync:**
```javascript
state.memory = {
  health: { score: 75, total_files: 8, total_lines: 450, total_size_kb: 12 },
  entities: [
    { name: 'NextAuth', type: 'code', mentions: 5 },
    { name: 'PostgreSQL', type: 'concept', mentions: 3 },
  ],
  topics: [
    { name: 'Architecture Notes', mentions: 1 },
    { name: 'Deployment', mentions: 2 },
  ],
};
```

**Individual method:**
```javascript
await claw.reportMemoryHealth({
  health: { score: 75, total_files: 8, total_lines: 450 },
  entities: [...],
  topics: [...],
});
```

## Step 3: Report Goals

Look for goals in `tasks/todo.md`, `TODO.md`, or project documentation. Checkboxes indicate status:
- `- [ ] Task` -> status: `'active'`
- `- [x] Task` -> status: `'completed'`, progress: 100

**Bulk sync:**
```javascript
state.goals = [
  { title: 'Deploy v2 to production', status: 'active' },
  { title: 'Set up CI/CD pipeline', status: 'completed', progress: 100 },
];
```

**Individual method:**
```javascript
await claw.createGoal({ title: 'Deploy v2 to production', status: 'active' });
```

## Step 4: Report Learning

Scan `tasks/lessons.md`, decision logs, or CLAUDE.md sections about lessons learned and key patterns.

**Bulk sync:**
```javascript
state.learning = [
  { decision: 'Used JWT for Edge compatibility', reasoning: 'NextAuth on Vercel Edge', outcome: 'confirmed' },
  { decision: 'Neon tagged templates for simple queries', context: 'Database patterns' },
];
```

**Individual method:**
```javascript
await claw.recordDecision({
  decision: 'Used JWT for Edge compatibility',
  reasoning: 'NextAuth on Vercel Edge',
  outcome: 'confirmed',
});
```

## Step 5: Capture Context Points

Extract key insights from your CLAUDE.md and memory files. Categorize each:
- `insight` - architectural understanding, patterns (importance: 7-8)
- `decision` - choices made and why (importance: 7)
- `task` - pending work items (importance: 5-6)
- `general` - other useful context (importance: 5)

**Bulk sync:**
```javascript
state.context_points = [
  { content: 'Next.js 15 App Router with JavaScript only', category: 'insight', importance: 8 },
  { content: 'Dark-only theme, flat surfaces', category: 'insight', importance: 6 },
];
```

**Individual method:**
```javascript
await claw.captureKeyPoint({
  content: 'Next.js 15 App Router with JavaScript only',
  category: 'insight',
  importance: 8,
});
```

## Step 6: Create Context Threads

Each major topic area in your project should become a thread. Threads upsert by name, so this is safe to re-run.

**Bulk sync:**
```javascript
state.context_threads = [
  { name: 'Authentication', summary: 'NextAuth v4 with GitHub + Google OAuth, JWT strategy' },
  { name: 'Database', summary: 'Neon PostgreSQL with tagged template queries' },
];
```

**Individual method:**
```javascript
await claw.createThread({
  name: 'Authentication',
  summary: 'NextAuth v4 with GitHub + Google OAuth, JWT strategy',
});
```

## Step 7: Create Session Handoff

Summarize your current state as a handoff document. This helps continuity between sessions.

**Bulk sync:**
```javascript
state.handoffs = [{
  summary: 'Completed auth system, working on billing integration',
  key_decisions: ['JWT over sessions', 'Stripe Checkout redirect flow'],
  open_tasks: ['Add webhook handler', 'Test quota enforcement'],
  next_priorities: ['Finish billing', 'Add activity logging'],
  mood_notes: 'Productive session, good progress',
}];
```

**Individual method:**
```javascript
await claw.createHandoff({
  summary: 'Completed auth system, working on billing integration',
  key_decisions: ['JWT over sessions', 'Stripe Checkout redirect flow'],
  open_tasks: ['Add webhook handler'],
  next_priorities: ['Finish billing'],
});
```

## Step 8: Save Code Snippets

Find important code patterns in your documentation (fenced code blocks). Snippets upsert by name.

**Bulk sync:**
```javascript
state.snippets = [
  {
    name: 'api-route-pattern',
    description: 'Standard API route boilerplate',
    code: 'export const dynamic = "force-dynamic";\n...',
    language: 'javascript',
  },
];
```

**Individual method:**
```javascript
await claw.saveSnippet({
  name: 'api-route-pattern',
  description: 'Standard API route boilerplate',
  code: '...',
  language: 'javascript',
});
```

## Step 9: Report Preferences & Observations

Share what you know about the user's preferences, your observations, and tracked approaches.

**Bulk sync:**
```javascript
state.preferences = {
  observations: [
    { observation: 'User prefers concise commit messages', category: 'workflow', importance: 7 },
  ],
  preferences: [
    { preference: 'Dark mode only', category: 'ui', confidence: 95 },
  ],
  moods: [
    { mood: 'focused', energy: 8, notes: 'Deep work session' },
  ],
  approaches: [
    { approach: 'Code-first prototyping', success: true, context: 'Feature development' },
  ],
};
```

**Individual methods:**
```javascript
await claw.logObservation({ observation: 'User prefers concise commit messages', category: 'workflow' });
await claw.setPreference({ preference: 'Dark mode only', category: 'ui', confidence: 95 });
await claw.logMood({ mood: 'focused', energy: 8 });
await claw.trackApproach({ approach: 'Code-first prototyping', success: true });
```

## Step 10: Report Ideas

Any pending ideas, feature requests, or inspiration items.

**Bulk sync:**
```javascript
state.inspiration = [
  { title: 'Add real-time WebSocket updates', category: 'feature', description: 'Live signal feed' },
];
```

**Individual method:**
```javascript
await claw.recordIdea({ title: 'Add real-time WebSocket updates', category: 'feature' });
```

---

## Verify

After syncing, confirm your data appears:

```javascript
const digest = await claw.getDailyDigest();
console.log(digest);
// Should show counts for today's synced data
```

You can also check the DashClaw dashboard:
- `/workspace` - Overview tab shows today's digest
- `/workspace` - Context tab shows points and threads
- `/dashboard` - Widgets show goals, learning, integrations

## Notes

- **Idempotent**: Connections, threads, snippets, and approaches all use upsert logic - safe to re-run
- **Security**: Never transmit .env values, only key names for provider detection
- **Independent steps**: Each step is standalone. Skip any that don't apply.
- **Limits**: Max items per category - connections: 50, goals/learning/content: 100, context points: 200, threads/snippets: 50
- **Bulk vs individual**: Use `syncState()` when pushing many categories at once. Use individual methods for targeted updates during normal operation.
