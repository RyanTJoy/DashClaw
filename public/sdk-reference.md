# OpenClaw Agent SDK Reference

Full reference for the OpenClaw Agent SDK. 22 methods to instrument your AI agents with action recording, risk signals, open loop tracking, and dashboard data reporting.

---

## Quick Start

### 1. Copy the SDK

The SDK is a single file with zero dependencies. Copy `sdk/openclaw-agent.js` into your project, or fetch it from the repo.

```bash
cp sdk/openclaw-agent.js ./your-agent/lib/openclaw-agent.js
```

### 2. Initialize the client

```js
import { OpenClawAgent } from './lib/openclaw-agent.js';

const claw = new OpenClawAgent({
  baseUrl: 'https://your-dashboard.vercel.app',
  apiKey: process.env.OPENCLAW_API_KEY,
  agentId: 'my-agent',
  agentName: 'My Agent',
});
```

### 3. Record your first action

```js
// Create an action before doing work
const { action_id } = await claw.createAction({
  action_type: 'deploy',
  declared_goal: 'Deploy authentication service',
  risk_score: 60,
});

// ... do the work ...

// Update when done
await claw.updateOutcome(action_id, {
  status: 'completed',
  output_summary: 'Auth service deployed to prod',
});
```

Or use [`track()`](#track) to wrap it in a single call that auto-records success/failure.

---

## Constructor

Create an OpenClawAgent instance. Requires Node 18+ (native fetch).

```js
const claw = new OpenClawAgent({ baseUrl, apiKey, agentId, agentName, swarmId });
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `baseUrl` | string | Yes | OpenClaw dashboard URL (e.g. `"https://your-app.vercel.app"`) |
| `apiKey` | string | Yes | API key for authentication (determines which org's data you access) |
| `agentId` | string | Yes | Unique identifier for this agent |
| `agentName` | string | No | Human-readable agent name |
| `swarmId` | string | No | Swarm/group identifier if part of a multi-agent system |

---

## Action Recording

Create, update, and query action records. Every agent action gets a full audit trail.

### `claw.createAction(action)`

Create a new action record. The agent's agentId, agentName, and swarmId are automatically attached.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `action_type` | string | Yes | One of: build, deploy, post, apply, security, message, api, calendar, research, review, fix, refactor, test, config, monitor, alert, cleanup, sync, migrate, other |
| `declared_goal` | string | Yes | What this action aims to accomplish |
| `action_id` | string | No | Custom action ID (auto-generated `act_` UUID if omitted) |
| `reasoning` | string | No | Why the agent decided to take this action |
| `authorization_scope` | string | No | What permissions were granted |
| `trigger` | string | No | What triggered this action |
| `systems_touched` | string[] | No | Systems this action interacts with |
| `input_summary` | string | No | Summary of input data |
| `parent_action_id` | string | No | Parent action if this is a sub-action |
| `reversible` | boolean | No | Whether this action can be undone (default: true) |
| `risk_score` | number | No | Risk score 0-100 (default: 0) |
| `confidence` | number | No | Confidence level 0-100 (default: 50) |

**Returns:** `Promise<{ action: Object, action_id: string }>`

```js
const { action_id } = await claw.createAction({
  action_type: 'deploy',
  declared_goal: 'Deploy auth service to production',
  risk_score: 70,
  systems_touched: ['kubernetes', 'auth-service'],
  reasoning: 'Scheduled release after QA approval',
});
```

### `claw.updateOutcome(actionId, outcome)`

Update the outcome of an existing action. Automatically sets timestamp_end if not provided.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `actionId` | string | Yes | The action_id to update |
| `status` | string | No | New status: completed, failed, cancelled |
| `output_summary` | string | No | What happened |
| `side_effects` | string[] | No | Unintended consequences |
| `artifacts_created` | string[] | No | Files, records, etc. created |
| `error_message` | string | No | Error details if failed |
| `duration_ms` | number | No | How long it took in milliseconds |
| `cost_estimate` | number | No | Estimated cost in USD |

**Returns:** `Promise<{ action: Object }>`

```js
await claw.updateOutcome(action_id, {
  status: 'completed',
  output_summary: 'Auth service deployed successfully',
  artifacts_created: ['deploy-log-2024-01.txt'],
  duration_ms: 45000,
});
```

### `claw.track(actionDef, fn)`

Helper that creates an action, runs your async function, and auto-updates the outcome. If fn throws, the action is marked as failed with the error message.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `actionDef` | Object | Yes | Action definition (same params as createAction) |
| `fn` | Function | Yes | Async function to execute. Receives `{ action_id }` as argument. |

**Returns:** `Promise<*>` (the return value of fn)

```js
const result = await claw.track(
  { action_type: 'build', declared_goal: 'Compile project' },
  async ({ action_id }) => {
    // Your logic here. If this throws, the action is marked failed.
    await runBuild();
    return 'Build succeeded';
  }
);
```

### `claw.getActions(filters?)`

Get a list of actions with optional filters. Returns paginated results with stats.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `agent_id` | string | No | Filter by agent |
| `swarm_id` | string | No | Filter by swarm |
| `status` | string | No | Filter by status (running, completed, failed, cancelled) |
| `action_type` | string | No | Filter by type |
| `risk_min` | number | No | Minimum risk score |
| `limit` | number | No | Max results (default: 50) |
| `offset` | number | No | Pagination offset (default: 0) |

**Returns:** `Promise<{ actions: Object[], total: number, stats: Object }>`

```js
const { actions, total } = await claw.getActions({
  status: 'failed',
  risk_min: 50,
  limit: 20,
});
```

### `claw.getAction(actionId)`

Get a single action with its associated open loops and assumptions.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `actionId` | string | Yes | The action_id to retrieve |

**Returns:** `Promise<{ action: Object, open_loops: Object[], assumptions: Object[] }>`

```js
const { action, open_loops, assumptions } = await claw.getAction('act_abc123');
```

### `claw.getActionTrace(actionId)`

Get root-cause trace for an action, including its assumptions, open loops, parent chain, and related actions.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `actionId` | string | Yes | The action_id to trace |

**Returns:** `Promise<{ action: Object, trace: Object }>`

```js
const { trace } = await claw.getActionTrace('act_abc123');
// trace includes: assumptions, open_loops, parent_chain, related_actions
```

---

## Loops & Assumptions

Track unresolved dependencies and log what your agents assume. Catch drift before it causes failures.

### `claw.registerOpenLoop(loop)`

Register an open loop (unresolved dependency, pending approval, etc.) for an action.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `action_id` | string | Yes | Parent action ID |
| `loop_type` | string | Yes | One of: followup, question, dependency, approval, review, handoff, other |
| `description` | string | Yes | What needs to be resolved |
| `priority` | string | No | One of: low, medium, high, critical (default: medium) |
| `owner` | string | No | Who is responsible for resolving this |

**Returns:** `Promise<{ loop: Object, loop_id: string }>`

```js
const { loop_id } = await claw.registerOpenLoop({
  action_id: 'act_abc123',
  loop_type: 'approval',
  description: 'Needs manager approval for prod deploy',
  priority: 'high',
  owner: 'ops-team',
});
```

### `claw.resolveOpenLoop(loopId, status, resolution?)`

Resolve or cancel an open loop.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `loopId` | string | Yes | The loop_id to resolve |
| `status` | string | Yes | `"resolved"` or `"cancelled"` |
| `resolution` | string | No | Resolution description (required when resolving) |

**Returns:** `Promise<{ loop: Object }>`

```js
await claw.resolveOpenLoop('loop_xyz789', 'resolved', 'Manager approved via Slack');
```

### `claw.registerAssumption(assumption)`

Register an assumption made during an action. Track what your agent assumes so you can validate or invalidate later.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `action_id` | string | Yes | Parent action ID |
| `assumption` | string | Yes | The assumption being made |
| `basis` | string | No | Evidence or reasoning for the assumption |
| `validated` | boolean | No | Whether this has been validated (default: false) |

**Returns:** `Promise<{ assumption: Object, assumption_id: string }>`

```js
const { assumption_id } = await claw.registerAssumption({
  action_id: 'act_abc123',
  assumption: 'Database schema is unchanged since last deploy',
  basis: 'No migration files found in latest commits',
});
```

### `claw.getAssumption(assumptionId)`

Get a single assumption by ID.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `assumptionId` | string | Yes | The assumption_id to retrieve |

**Returns:** `Promise<{ assumption: Object }>`

```js
const { assumption } = await claw.getAssumption('asm_abc123');
```

### `claw.validateAssumption(assumptionId, validated, invalidated_reason?)`

Validate or invalidate an assumption. When invalidating, a reason is required.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `assumptionId` | string | Yes | The assumption_id to update |
| `validated` | boolean | Yes | true to validate, false to invalidate |
| `invalidated_reason` | string | No | Required when invalidating (validated = false) |

**Returns:** `Promise<{ assumption: Object }>`

```js
// Validate
await claw.validateAssumption('asm_abc123', true);

// Invalidate
await claw.validateAssumption('asm_abc123', false, 'Schema was altered by migration #47');
```

### `claw.getOpenLoops(filters?)`

Get open loops with optional filters. Returns paginated results with stats.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `status` | string | No | Filter by status: open, resolved, cancelled |
| `loop_type` | string | No | Filter by loop type |
| `priority` | string | No | Filter by priority |
| `limit` | number | No | Max results (default: 50) |

**Returns:** `Promise<{ loops: Object[], total: number, stats: Object }>`

```js
const { loops } = await claw.getOpenLoops({
  status: 'open',
  priority: 'critical',
});
```

### `claw.getDriftReport(filters?)`

Get drift report for assumptions with risk scoring. Shows which assumptions are stale, unvalidated, or contradicted by outcomes.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `action_id` | string | No | Filter by action |
| `limit` | number | No | Max results (default: 50) |

**Returns:** `Promise<{ assumptions: Object[], drift_summary: Object }>`

```js
const { assumptions, drift_summary } = await claw.getDriftReport();
console.log(drift_summary);
// { total, validated, invalidated, unvalidated, drift_score }
```

---

## Signals

Automatic detection of problematic agent behavior. Seven signal types fire based on action patterns — no configuration required.

### `claw.getSignals()`

Get current risk signals across all agents. Returns 7 signal types: autonomy_spike, high_impact_low_oversight, repeated_failures, stale_loop, assumption_drift, stale_assumption, and stale_running_action.

**Returns:** `Promise<{ signals: Object[], counts: { red: number, amber: number, total: number } }>`

```js
const { signals, counts } = await claw.getSignals();
console.log(`${counts.red} red, ${counts.amber} amber signals`);

for (const signal of signals) {
  console.log(`[${signal.severity}] ${signal.signal_type}: ${signal.help}`);
}
```

### Signal Types

| Signal | Description |
|---|---|
| `autonomy_spike` | Agent taking too many actions without human checkpoints |
| `high_impact_low_oversight` | Critical actions without sufficient review |
| `repeated_failures` | Same action type failing multiple times |
| `stale_loop` | Open loops unresolved past their expected timeline |
| `assumption_drift` | Assumptions becoming stale or contradicted by outcomes |
| `stale_assumption` | Assumptions not validated within expected timeframe |
| `stale_running_action` | Actions stuck in running state for over 4 hours |

---

## Dashboard Data

Push data from your agent directly to the OpenClaw dashboard. All methods auto-attach the agent's agentId.

### `claw.recordDecision(entry)`

Record a decision for the learning database. Track what your agent decides and why.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `decision` | string | Yes | What was decided |
| `context` | string | No | Context around the decision |
| `reasoning` | string | No | Why this decision was made |
| `outcome` | string | No | `"success"`, `"failure"`, or `"pending"` |
| `confidence` | number | No | Confidence level 0-100 |

**Returns:** `Promise<{ decision: Object }>`

```js
await claw.recordDecision({
  decision: 'Use Redis for session caching',
  reasoning: 'Lower latency than Postgres for read-heavy access pattern',
  confidence: 85,
});
```

### `claw.createGoal(goal)`

Create a goal in the goals tracker.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `title` | string | Yes | Goal title |
| `category` | string | No | Goal category |
| `description` | string | No | Detailed description |
| `target_date` | string | No | Target completion date (ISO string) |
| `progress` | number | No | Progress 0-100 |
| `status` | string | No | `"active"`, `"completed"`, or `"paused"` |

**Returns:** `Promise<{ goal: Object }>`

```js
await claw.createGoal({
  title: 'Complete API migration',
  category: 'engineering',
  target_date: '2025-03-01T00:00:00.000Z',
  progress: 30,
});
```

### `claw.recordContent(content)`

Record content creation (articles, posts, documents).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `title` | string | Yes | Content title |
| `platform` | string | No | Platform (e.g., `"linkedin"`, `"twitter"`) |
| `status` | string | No | `"draft"` or `"published"` |
| `url` | string | No | Published URL |

**Returns:** `Promise<{ content: Object }>`

```js
await claw.recordContent({
  title: 'How We Migrated to Edge Functions',
  platform: 'linkedin',
  status: 'published',
  url: 'https://linkedin.com/posts/...',
});
```

### `claw.recordInteraction(interaction)`

Record a relationship interaction (message, meeting, email).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `summary` | string | Yes | What happened |
| `contact_name` | string | No | Contact name (auto-resolves to contact_id) |
| `contact_id` | string | No | Direct contact ID |
| `direction` | string | No | `"inbound"` or `"outbound"` |
| `type` | string | No | Interaction type (e.g., `"message"`, `"meeting"`, `"email"`) |
| `platform` | string | No | Platform used |

**Returns:** `Promise<{ interaction: Object }>`

```js
await claw.recordInteraction({
  contact_name: 'Jane Smith',
  summary: 'Discussed Q1 roadmap and timeline',
  type: 'meeting',
  direction: 'outbound',
});
```

### `claw.reportConnections(connections)`

Report active connections/integrations for this agent. Call at agent startup to register what services the agent is connected to.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `connections` | Object[] | Yes | Array of connection objects |
| `connections[].provider` | string | Yes | Service name (e.g., `"anthropic"`, `"github"`) |
| `connections[].authType` | string | No | Auth method: api_key, subscription, oauth, pre_configured, environment |
| `connections[].planName` | string | No | Plan name (e.g., `"Pro Max"`) |
| `connections[].status` | string | No | Connection status: active, inactive, error |
| `connections[].metadata` | Object\|string | No | Optional metadata (e.g., `{ cost: "$100/mo" }`) |

**Returns:** `Promise<{ connections: Object[], created: number }>`

```js
await claw.reportConnections([
  { provider: 'anthropic', authType: 'subscription', planName: 'Pro Max', status: 'active' },
  { provider: 'github', authType: 'oauth', status: 'active' },
  { provider: 'slack', authType: 'api_key', status: 'active', metadata: { workspace: 'eng-team' } },
]);
```

### `claw.createCalendarEvent(event)`

Create a calendar event.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `summary` | string | Yes | Event title/summary |
| `start_time` | string | Yes | Start time (ISO string) |
| `end_time` | string | No | End time (ISO string) |
| `location` | string | No | Event location |
| `description` | string | No | Event description |

**Returns:** `Promise<{ event: Object }>`

```js
await claw.createCalendarEvent({
  summary: 'Deploy review',
  start_time: '2025-02-10T14:00:00.000Z',
  end_time: '2025-02-10T14:30:00.000Z',
  description: 'Review prod deploy results',
});
```

### `claw.recordIdea(idea)`

Record an idea or inspiration for later review.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `title` | string | Yes | Idea title |
| `description` | string | No | Detailed description |
| `category` | string | No | Category (e.g., `"feature"`, `"optimization"`, `"content"`) |
| `score` | number | No | Priority/quality score 0-100 (default: 50) |
| `status` | string | No | `"pending"`, `"in_progress"`, `"shipped"`, `"rejected"` |
| `source` | string | No | Where this idea came from |

**Returns:** `Promise<{ idea: Object }>`

```js
await claw.recordIdea({
  title: 'Auto-summarize daily agent activity',
  category: 'feature',
  score: 75,
  source: 'User feedback in Slack #agents',
});
```

### `claw.reportMemoryHealth(report)`

Report memory health snapshot with entities and topics. Call periodically (e.g., daily) to track memory system health over time.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `health` | Object | Yes | Health metrics object |
| `health.score` | number | Yes | Health score 0-100 |
| `health.total_files` | number | No | Number of memory files |
| `health.total_lines` | number | No | Total lines across all files |
| `health.total_size_kb` | number | No | Total size in KB |
| `health.duplicates` | number | No | Potential duplicate facts |
| `health.stale_count` | number | No | Stale facts count |
| `entities` | Object[] | No | Key entities found in memory |
| `topics` | Object[] | No | Topics/themes found in memory |

**Returns:** `Promise<{ snapshot: Object, entities_count: number, topics_count: number }>`

```js
await claw.reportMemoryHealth({
  health: {
    score: 82,
    total_files: 15,
    total_lines: 340,
    duplicates: 3,
    stale_count: 7,
  },
  entities: [
    { name: 'PostgreSQL', type: 'service', mentions: 12 },
    { name: 'auth-service', type: 'service', mentions: 8 },
  ],
  topics: [
    { name: 'deployment', mentions: 15 },
    { name: 'authentication', mentions: 9 },
  ],
});
```

---

## Error Handling

All SDK methods throw on non-2xx responses. Errors include `status` (HTTP code) and `details` (when available).

### Error shape

```js
{
  message: "Validation failed",  // error.message
  status: 400,                    // error.status (HTTP status code)
  details: { ... }                // error.details (optional)
}
```

### Recommended pattern

```js
try {
  const { action_id } = await claw.createAction({
    action_type: 'deploy',
    declared_goal: 'Deploy to production',
  });
} catch (err) {
  if (err.status === 401) {
    console.error('Invalid API key');
  } else if (err.status === 429) {
    console.error('Rate limited — slow down');
  } else {
    console.error(`Action failed: ${err.message}`);
  }
}
```
