# DashClaw SDK Reference (Full)

Full reference for the DashClaw SDK (Node.js). For Python, see the [Python SDK docs](../sdk-python/README.md).

Install, configure, and instrument your AI agents with 78+ methods across action recording, behavior guard, context management, session handoffs, security scanning, policy testing, compliance, task routing, and more.

---

## Quick Start

### 1. Copy the SDK
Install from npm, or copy the single-file SDK directly.
```bash
npm install dashclaw
```

### 2. Initialize the client
```javascript
import { DashClaw } from 'dashclaw';

const claw = new DashClaw({
  baseUrl: process.env.DASHCLAW_BASE_URL || 'http://localhost:3000',
  // Use http://localhost:3000 for local, or https://your-app.vercel.app for cloud
  apiKey: process.env.DASHCLAW_API_KEY,
  agentId: 'my-agent',
  agentName: 'My Agent',
  hitlMode: 'wait', // Optional: automatically wait for human approval
});
```

### 3. Record your first action
```javascript
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

---

## Constructor

Create a DashClaw instance. Requires Node 18+ (native fetch).

```javascript
const claw = new DashClaw({
  baseUrl,
  apiKey,
  agentId,
  agentName,
  swarmId,
  guardMode,
  guardCallback,
  autoRecommend,
  recommendationConfidenceMin,
  recommendationCallback,
  hitlMode,
});
```

### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| baseUrl | string | Yes | DashClaw dashboard URL (e.g. "http://localhost:3000" or "https://your-app.vercel.app") |
| apiKey | string | Yes | API key for authentication (determines which org\'s data you access) |
| agentId | string | Yes | Unique identifier for this agent |
| agentName | string | No | Human-readable agent name |
| swarmId | string | No | Swarm/group identifier if part of a multi-agent system |
| guardMode | string | No | Auto guard check before createAction/track: "off" (default), "warn" (log + proceed), "enforce" (throw on block) |
| guardCallback | Function | No | Called with guard decision object when guardMode is active |
| autoRecommend | string | No | Recommendation auto-adapt mode: "off" (default), "warn" (record override), "enforce" (apply safe hints) |
| recommendationConfidenceMin | number | No | Min recommendation confidence required for auto-adapt in enforce mode (default 70) |
| recommendationCallback | Function | No | Called with recommendation adaptation details when autoRecommend is active |
| hitlMode | string | No | HITL behavior: "off" (default - return 202 immediately), "wait" (automatically block and poll until approved/denied) |

### Guard Mode, Auto-Recommend, and HITL
When enabled, every call to `createAction()` can run recommendation adaptation and guard checks before submission.

```javascript
import { DashClaw, GuardBlockedError, ApprovalDeniedError } from 'dashclaw';

const claw = new DashClaw({
  baseUrl: 'http://localhost:3000',
  apiKey: process.env.DASHCLAW_API_KEY,
  agentId: 'my-agent',
  autoRecommend: 'enforce', // apply safe recommendation hints
  recommendationConfidenceMin: 80,
  guardMode: 'enforce', // throws GuardBlockedError on block
  hitlMode: 'wait',     // poll until approved or throw ApprovalDeniedError
});

try {
  await claw.createAction({ action_type: 'deploy', declared_goal: 'Ship v2' });
  // If a policy triggers 'require_approval', the SDK will pause here until an admin clicks 'Allow'
} catch (err) {
  if (err instanceof GuardBlockedError) {
    console.log('Blocked by policy:', err.reasons);
  } else if (err instanceof ApprovalDeniedError) {
    console.log('Denied by human operator');
  }
}
```

---

## Action Recording

Create, update, and query action records. Every agent action gets a full audit trail.

### claw.createAction(action)
Create a new action record. The agent's agentId, agentName, and swarmId are automatically attached.

If `hitlMode` is set to `'wait'` and the action requires approval, this method will not return until the action is approved or denied (or it times out).

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| action_type | string | Yes | One of: build, deploy, post, apply, security, message, api, calendar, research, review, fix, refactor, test, config, monitor, alert, cleanup, sync, migrate, other |
| declared_goal | string | Yes | What this action aims to accomplish |
| action_id | string | No | Custom action ID (auto-generated act_ UUID if omitted) |
| reasoning | string | No | Why the agent decided to take this action |
| authorization_scope | string | No | What permissions were granted |
| trigger | string | No | What triggered this action |
| systems_touched | string[] | No | Systems this action interacts with |
| input_summary | string | No | Summary of input data |
| parent_action_id | string | No | Parent action if this is a sub-action |
| reversible | boolean | No | Whether this action can be undone (default: true) |
| risk_score | number | No | Risk score 0-100 (default: 0) |
| confidence | number | No | Confidence level 0-100 (default: 50) |

**Returns:** `Promise<{ action: Object, action_id: string }>`

**Example:**
```javascript
const { action_id } = await claw.createAction({
  action_type: 'deploy',
  declared_goal: 'Deploy auth service to production',
  risk_score: 70,
  systems_touched: ['kubernetes', 'auth-service'],
  reasoning: 'Scheduled release after QA approval',
});
```

### claw.waitForApproval(actionId, options?)
Manual poll for human approval. Only needed if `hitlMode` is `'off'`.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| actionId | string | Yes | The action_id to poll |
| options.timeout | number | No | Max wait time in ms (default: 300000 / 5 min) |
| options.interval | number | No | Poll interval in ms (default: 5000) |

**Returns:** `Promise<{ action: Object, action_id: string }>`
**Throws:** `ApprovalDeniedError` if denied.

### claw.updateOutcome(actionId, outcome)
Update the outcome of an existing action. Automatically sets timestamp_end if not provided.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| actionId | string | Yes | The action_id to update |
| status | string | No | New status: completed, failed, cancelled |
| output_summary | string | No | What happened |
| side_effects | string[] | No | Unintended consequences |
| artifacts_created | string[] | No | Files, records, etc. created |
| error_message | string | No | Error details if failed |
| duration_ms | number | No | How long it took in milliseconds |
| cost_estimate | number | No | Estimated cost in USD |

**Returns:** `Promise<{ action: Object }>`

### claw.track(actionDef, fn)
Helper that creates an action, runs your async function, and auto-updates the outcome. If fn throws, the action is marked as failed with the error message.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| actionDef | Object | Yes | Action definition (same params as createAction) |
| fn | Function | Yes | Async function to execute. Receives { action_id } as argument. |

**Returns:** `Promise<*> (the return value of fn)`

### claw.getActions(filters?)
Get a list of actions with optional filters. Returns paginated results with stats.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| agent_id | string | No | Filter by agent |
| swarm_id | string | No | Filter by swarm |
| status | string | No | Filter by status (running, completed, failed, cancelled) |
| action_type | string | No | Filter by type |
| risk_min | number | No | Minimum risk score |
| limit | number | No | Max results (default: 50) |
| offset | number | No | Pagination offset (default: 0) |

**Returns:** `Promise<{ actions: Object[], total: number, stats: Object }>`

### claw.getAction(actionId)
Get a single action with its associated open loops and assumptions.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| actionId | string | Yes | The action_id to retrieve |

**Returns:** `Promise<{ action: Object, open_loops: Object[], assumptions: Object[] }>`

### claw.getActionTrace(actionId)
Get root-cause trace for an action, including its assumptions, open loops, parent chain, and related actions.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| actionId | string | Yes | The action_id to trace |

**Returns:** `Promise<{ action: Object, trace: Object }>`

---

## Real-Time Flight Recorder

Stream actions live to the dashboard as they happen.

### claw.track(actionDef, fn)
(Already documented above) - Use `track()` to automatically emit `running` events at start and `completed`/`failed` events at finish. These show up instantly on the "Flight Recorder" dashboard.

---

## Token & Cost Analytics

Track token usage and estimated costs for every action. DashClaw automatically aggregates these into "Cost per Goal" metrics.

**Usage:**
Pass `tokens_in`, `tokens_out`, and `model` when creating or updating actions.

```javascript
await claw.createAction({
  action_type: 'generation',
  declared_goal: 'Generate blog post',
  model: 'gpt-4o',
  tokens_in: 1500,
  tokens_out: 400,
  // cost_estimate is auto-calculated on the server if model is known
});
```

**Supported Models for Auto-Pricing:**
- GPT-4o, GPT-4-Turbo
- Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
- Llama 3 (70b, 8b)

---

## Loops & Assumptions

Track unresolved dependencies and log what your agents assume. Catch drift before it causes failures.

### claw.registerOpenLoop(loop)
Register an open loop (unresolved dependency, pending approval, etc.) for an action.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| action_id | string | Yes | Parent action ID |
| loop_type | string | Yes | One of: followup, question, dependency, approval, review, handoff, other |
| description | string | Yes | What needs to be resolved |
| priority | string | No | One of: low, medium, high, critical (default: medium) |
| owner | string | No | Who is responsible for resolving this |

**Returns:** `Promise<{ loop: Object, loop_id: string }>`

### claw.resolveOpenLoop(loopId, status, resolution?)
Resolve or cancel an open loop.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| loopId | string | Yes | The loop_id to resolve |
| status | string | Yes | "resolved" or "cancelled" |
| resolution | string | No | Resolution description (required when resolving) |

**Returns:** `Promise<{ loop: Object }>`

### claw.registerAssumption(assumption)
Register an assumption made during an action. Track what your agent assumes so you can validate or invalidate later.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| action_id | string | Yes | Parent action ID |
| assumption | string | Yes | The assumption being made |
| basis | string | No | Evidence or reasoning for the assumption |
| validated | boolean | No | Whether this has been validated (default: false) |

**Returns:** `Promise<{ assumption: Object, assumption_id: string }>`

### claw.getAssumption(assumptionId)
Get a single assumption by ID.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| assumptionId | string | Yes | The assumption_id to retrieve |

**Returns:** `Promise<{ assumption: Object }>`

### claw.validateAssumption(assumptionId, validated, invalidated_reason?)
Validate or invalidate an assumption. When invalidating, a reason is required.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| assumptionId | string | Yes | The assumption_id to update |
| validated | boolean | Yes | true to validate, false to invalidate |
| invalidated_reason | string | No | Required when invalidating (validated = false) |

**Returns:** `Promise<{ assumption: Object }>`

### claw.getOpenLoops(filters?)
Get open loops with optional filters. Returns paginated results with stats.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status: open, resolved, cancelled |
| loop_type | string | No | Filter by loop type |
| priority | string | No | Filter by priority |
| limit | number | No | Max results (default: 50) |

**Returns:** `Promise<{ loops: Object[], total: number, stats: Object }>`

### claw.getDriftReport(filters?)
Get drift report for assumptions with risk scoring. Shows which assumptions are stale, unvalidated, or contradicted by outcomes.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| action_id | string | No | Filter by action |
| limit | number | No | Max results (default: 50) |

**Returns:** `Promise<{ assumptions: Object[], drift_summary: Object }>`

---

## Signals

Automatic detection of problematic agent behavior. Seven signal types fire based on action patterns - no configuration required.

### claw.getSignals()
Get current risk signals across all agents. Returns 7 signal types: autonomy_spike, high_impact_low_oversight, repeated_failures, stale_loop, assumption_drift, stale_assumption, and stale_running_action.

**Returns:** `Promise<{ signals: Object[], counts: { red: number, amber: number, total: number } }>`

### Signal Types
- **autonomy_spike**: Agent taking too many actions without human checkpoints
- **high_impact_low_oversight**: Critical actions without sufficient review
- **repeated_failures**: Same action type failing multiple times
- **stale_loop**: Open loops unresolved past their expected timeline
- **assumption_drift**: Assumptions becoming stale or contradicted by outcomes
- **stale_assumption**: Assumptions not validated within expected timeframe
- **stale_running_action**: Actions stuck in running state for over 4 hours

---

## Behavior Guard

Check org-level policies before executing risky actions. Returns allow, warn, block, or require_approval based on configured guard policies.

### claw.guard(context, options?)
Evaluate guard policies for a proposed action. Call this before risky operations to get a go/no-go decision. The agent_id is auto-attached from the SDK constructor.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| context.action_type | string | Yes | The type of action being proposed |
| context.risk_score | number | No | Risk score 0-100 |
| context.systems_touched | string[] | No | Systems this action will affect |
| context.reversible | boolean | No | Whether the action can be undone |
| context.declared_goal | string | No | What the action accomplishes |
| options.includeSignals | boolean | No | Also check live risk signals (adds latency) |

**Returns:** `Promise<{ decision: string, reasons: string[], warnings: string[], matched_policies: string[], evaluated_at: string }>`

### claw.getGuardDecisions(filters?)
Retrieve recent guard evaluation decisions for audit and review.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| filters.decision | string | No | Filter by decision: allow, warn, block, require_approval |
| filters.limit | number | No | Max results (default 20, max 100) |
| filters.offset | number | No | Pagination offset |

**Returns:** `Promise<{ decisions: Object[], total: number, stats: Object }>`

---

## Dashboard Data

Push data from your agent directly to the DashClaw dashboard. All methods auto-attach the agent's agentId.

### claw.recordDecision(entry)
Record a decision for the learning database. Track what your agent decides and why.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| decision | string | Yes | What was decided |
| context | string | No | Context around the decision |
| reasoning | string | No | Why this decision was made |
| outcome | string | No | "success", "failure", or "pending" |
| confidence | number | No | Confidence level 0-100 |

**Returns:** `Promise<{ decision: Object }>`

### claw.getRecommendations(filters?)
Get adaptive recommendations synthesized from scored historical episodes.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| filters.action_type | string | No | Filter by action type |
| filters.agent_id | string | No | Override agent scope (defaults to SDK agent) |
| filters.include_inactive | boolean | No | Include disabled recommendations (admin/service only) |
| filters.track_events | boolean | No | Record fetched telemetry (default true) |
| filters.include_metrics | boolean | No | Include computed metrics in response |
| filters.lookback_days | number | No | Lookback window for include_metrics |
| filters.limit | number | No | Max results (default 50) |

**Returns:** `Promise<{ recommendations: Object[], metrics?: Object, total: number }>`

### claw.getRecommendationMetrics(filters?)
Get recommendation telemetry and effectiveness deltas.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| filters.action_type | string | No | Filter by action type |
| filters.agent_id | string | No | Override agent scope (defaults to SDK agent) |
| filters.lookback_days | number | No | Lookback window (default 30) |
| filters.limit | number | No | Max recommendations to evaluate (default 100) |
| filters.include_inactive | boolean | No | Include disabled recommendations (admin/service only) |

**Returns:** `Promise<{ metrics: Object[], summary: Object, lookback_days: number }>`

### claw.recordRecommendationEvents(events)
Write recommendation telemetry events (single event or batch).

**Returns:** `Promise<{ created: Object[], created_count: number }>`

### claw.setRecommendationActive(recommendationId, active)
Enable or disable one recommendation.

**Returns:** `Promise<{ recommendation: Object }>`

### claw.rebuildRecommendations(options?)
Recompute recommendations from recent learning episodes.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| options.action_type | string | No | Restrict rebuild to one action type |
| options.lookback_days | number | No | Episode history window (default 30) |
| options.min_samples | number | No | Minimum samples per recommendation (default 5) |
| options.episode_limit | number | No | Episode scan cap (default 5000) |
| options.action_id | string | No | Score this action before rebuilding |

**Returns:** `Promise<{ recommendations: Object[], total: number, episodes_scanned: number }>`

### claw.recommendAction(action)
Apply top recommendation hints to an action payload without mutating the original object.

**Returns:** `Promise<{ action: Object, recommendation: Object|null, adapted_fields: string[] }>`

### claw.createGoal(goal)
Create a goal in the goals tracker.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| title | string | Yes | Goal title |
| category | string | No | Goal category |
| description | string | No | Detailed description |
| target_date | string | No | Target completion date (ISO string) |
| progress | number | No | Progress 0-100 |
| status | string | No | "active", "completed", or "paused" |

**Returns:** `Promise<{ goal: Object }>`

### claw.recordContent(content)
Record content creation (articles, posts, documents).

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| title | string | Yes | Content title |
| platform | string | No | Platform (e.g., "linkedin", "twitter") |
| status | string | No | "draft" or "published" |
| url | string | No | Published URL |

**Returns:** `Promise<{ content: Object }>`

### claw.recordInteraction(interaction)
Record a relationship interaction (message, meeting, email).

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| summary | string | Yes | What happened |
| contact_name | string | No | Contact name (auto-resolves to contact_id) |
| contact_id | string | No | Direct contact ID |
| direction | string | No | "inbound" or "outbound" |
| type | string | No | Interaction type (e.g., "message", "meeting", "email") |
| platform | string | No | Platform used |

**Returns:** `Promise<{ interaction: Object }>`

### claw.reportConnections(connections)
Report active connections/integrations for this agent.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| connections | Object[] | Yes | Array of connection objects |
| connections[].provider | string | Yes | Service name (e.g., "anthropic", "github") |
| connections[].authType | string | No | Auth method |
| connections[].planName | string | No | Plan name |
| connections[].status | string | No | Connection status |
| connections[].metadata | Object|string | No | Optional metadata |

**Returns:** `Promise<{ connections: Object[], created: number }>`

---

## Session Handoffs

### claw.createHandoff(handoff)
Create a session handoff document summarizing work done, decisions made, and next priorities.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| summary | string | Yes | Session summary |
| session_date | string | No | Date string (defaults to today) |
| key_decisions | string[] | No | Key decisions made this session |
| open_tasks | string[] | No | Tasks still open |
| mood_notes | string | No | User mood/energy observations |
| next_priorities | string[] | No | What to focus on next |

**Returns:** `Promise<{handoff: Object, handoff_id: string}>`

### claw.getHandoffs(filters?)
Get handoffs for this agent with optional date and limit filters.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| date | string | No | Filter by session_date |
| limit | number | No | Max results |

**Returns:** `Promise<{handoffs: Object[], total: number}>`

---

## Context Manager

Capture key points and organize context into threads for long-running topics.

### claw.captureKeyPoint(point)
Capture a key point from the current session for later recall.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| content | string | Yes | The key point content |
| category | string | No | decision, task, insight, question, general |
| importance | number | No | Importance 1-10 (default 5) |
| session_date | string | No | Date string (defaults to today) |

**Returns:** `Promise<{point: Object, point_id: string}>`

### claw.createThread(thread)
Create a context thread for tracking a topic across multiple entries.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Thread name (unique per agent per org) |
| summary | string | No | Initial summary |

**Returns:** `Promise<{thread: Object, thread_id: string}>`

### claw.addThreadEntry(threadId, content, entryType?)
Add an entry to an existing thread.

---

## Automation Snippets

Save, search, and reuse code snippets across agent sessions.

### claw.saveSnippet(snippet)
Save or update a reusable code snippet. Upserts on name.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Snippet name (unique per org) |
| code | string | Yes | The snippet code |
| description | string | No | What this snippet does |
| language | string | No | Programming language |
| tags | string[] | No | Tags for categorization |

**Returns:** `Promise<{snippet: Object, snippet_id: string}>`

**Example:**
```javascript
await claw.saveSnippet({
  name: 'fetch-with-retry',
  code: 'async function fetchRetry(url, n = 3) { ... }',
  language: 'javascript',
  tags: ['fetch', 'retry'],
});
```

### claw.getSnippet(snippetId)
Fetch a single snippet by ID.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| snippetId | string | Yes | The snippet ID |

**Returns:** `Promise<{snippet: Object}>`

**Example:**
```javascript
const { snippet } = await claw.getSnippet('sn_abc123');
console.log(snippet.name, snippet.language);
```

### claw.getSnippets(filters?)
Search and list snippets.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| search | string | No | Search name/description |
| tag | string | No | Filter by tag |
| language | string | No | Filter by language |
| limit | number | No | Max results |

**Returns:** `Promise<{snippets: Object[], total: number}>`

**Example:**
```javascript
const { snippets } = await claw.getSnippets({ language: 'javascript' });
```

### claw.useSnippet(snippetId)
Mark a snippet as used (increments use_count).

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| snippetId | string | Yes | Snippet ID |

**Returns:** `Promise<{snippet: Object}>`

**Example:**
```javascript
await claw.useSnippet('sn_abc123');
```

### claw.deleteSnippet(snippetId)
Delete a snippet.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| snippetId | string | Yes | Snippet ID |

**Returns:** `Promise<{deleted: boolean, id: string}>`

**Example:**
```javascript
await claw.deleteSnippet('sn_abc123');
```

---

## Agent Messaging

### claw.sendMessage(params)
Send a message to another agent or broadcast.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| to | string | No | Target agent ID (null = broadcast) |
| type | string | No | info, action, lesson, question, status |
| subject | string | No | Subject line (max 200 chars) |
| body | string | Yes | Message body (max 2000 chars) |
| threadId | string | No | Thread ID to attach to |
| urgent | boolean | No | Mark as urgent |
| docRef | string | No | Reference to a shared doc ID |

**Returns:** `Promise<{message: Object, message_id: string}>`

### claw.saveSharedDoc(params)
Create or update a shared workspace document. Upserts by name.

---

## Bulk Sync

### claw.syncState(state)
Push multiple data categories in a single request. Accepts connections, memory, goals, learning, content, inspiration, context_points, context_threads, handoffs, preferences, and snippets.

**Returns:** `Promise<{results: Object, total_synced: number, total_errors: number, duration_ms: number}>`

---

## Policy Testing

Run guardrails tests, generate compliance proof reports, and import policy packs.

### claw.testPolicies()
Run guardrails tests against all active policies. Returns pass/fail results per policy.

**Returns:** `Promise<{ results: Object[], total: number, passed: number, failed: number }>`

**Example:**
```javascript
const report = await claw.testPolicies();
console.log(`${report.passed}/${report.total} policies passed`);
for (const r of report.results.filter(r => !r.passed)) {
  console.log(`FAIL: ${r.policy} — ${r.reason}`);
}
```

### claw.getProofReport(options?)
Generate a compliance proof report summarizing guard decisions, policy evaluations, and audit evidence.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| format | string | No | Output format: "json" (default) or "md" |

**Returns:** `Promise<{ report: Object|string }>`

### claw.importPolicies({ pack?, yaml? })
Import a policy pack or raw YAML. Admin only. Replaces or merges into active policies.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| pack | string | No | Named policy pack: enterprise-strict, smb-safe, startup-growth, development |
| yaml | string | No | Raw YAML policy definition |

**Returns:** `Promise<{ imported: number, policies: Object[] }>`

---

## Compliance Engine

Map policies to regulatory frameworks, run gap analysis, and generate compliance reports.

### claw.mapCompliance(framework)
Map active policies to framework controls. Returns a control-by-control coverage matrix.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| framework | string | Yes | Target framework: soc2, iso27001, gdpr, nist-ai-rmf, imda-agentic |

**Returns:** `Promise<{ framework: string, controls: Object[], coverage_pct: number }>`

**Example:**
```javascript
const { controls, coverage_pct } = await claw.mapCompliance('soc2');
console.log(`SOC 2 coverage: ${coverage_pct}%`);
for (const ctrl of controls.filter(c => !c.covered)) {
  console.log(`Gap: ${ctrl.id} — ${ctrl.name}`);
}
```

### claw.analyzeGaps(framework)
Run gap analysis with remediation plan. Identifies missing controls and suggests policy changes.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| framework | string | Yes | Target framework: soc2, iso27001, gdpr, nist-ai-rmf, imda-agentic |

**Returns:** `Promise<{ framework: string, gaps: Object[], remediation_plan: Object[] }>`

### claw.getComplianceReport(framework, options?)
Generate a full compliance report and save a point-in-time snapshot.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| framework | string | Yes | Target framework |
| options.format | string | No | Output format: "json" (default) or "md" |

**Returns:** `Promise<{ report: Object|string, snapshot_id: string }>`

### claw.listFrameworks()
List all available compliance frameworks with metadata.

**Returns:** `Promise<{ frameworks: Object[] }>`

### claw.getComplianceEvidence(options?)
Get live guard decision evidence for compliance audits. Returns timestamped decision records.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| options.window | string | No | Time window: "7d" (default), "30d", "90d" |

**Returns:** `Promise<{ evidence: Object[], window: string, total: number }>`

---

## Task Routing

Route tasks to agents based on capabilities, availability, and workload. Manage the agent pool and monitor routing health.

### claw.listRoutingAgents(filters?)
List registered routing agents with optional status filter.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| filters.status | string | No | Filter by status: available, busy, offline |

**Returns:** `Promise<{ agents: Object[], total: number }>`

### claw.registerRoutingAgent(agent)
Register a new agent in the routing pool.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Agent display name |
| capabilities | string[] | No | List of skills/capabilities |
| maxConcurrent | number | No | Max concurrent tasks (default: 1) |
| endpoint | string | No | Agent callback endpoint URL |

**Returns:** `Promise<{ agent: Object, agent_id: string }>`

### claw.getRoutingAgent(agentId)
Get a single routing agent with current metrics.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| agentId | string | Yes | The routing agent ID |

**Returns:** `Promise<{ agent: Object, metrics: Object }>`

### claw.updateRoutingAgentStatus(agentId, status)
Update a routing agent's availability status.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| agentId | string | Yes | The routing agent ID |
| status | string | Yes | New status: available, busy, offline |

**Returns:** `Promise<{ agent: Object }>`

### claw.deleteRoutingAgent(agentId)
Remove an agent from the routing pool.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| agentId | string | Yes | The routing agent ID |

**Returns:** `Promise<{ deleted: boolean, id: string }>`

### claw.listRoutingTasks(filters?)
List routing tasks with optional filters.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| filters.status | string | No | Filter by status: pending, assigned, completed, failed |
| filters.agent_id | string | No | Filter by assigned agent |
| filters.limit | number | No | Max results (default: 50) |
| filters.offset | number | No | Pagination offset |

**Returns:** `Promise<{ tasks: Object[], total: number }>`

### claw.submitRoutingTask(task)
Submit a task for automatic routing to the best available agent.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| title | string | Yes | Task title |
| description | string | No | Detailed description |
| requiredSkills | string[] | No | Skills needed to handle this task |
| urgency | string | No | low, medium, high, critical (default: medium) |
| timeoutSeconds | number | No | Task timeout in seconds |
| maxRetries | number | No | Max retry attempts on failure |
| callbackUrl | string | No | URL to notify on completion |

**Returns:** `Promise<{ task: Object, task_id: string, assigned_agent: Object|null }>`

**Example:**
```javascript
const { task_id, assigned_agent } = await claw.submitRoutingTask({
  title: 'Analyze quarterly metrics',
  description: 'Pull Q4 data and generate summary report',
  requiredSkills: ['data-analysis', 'reporting'],
  urgency: 'high',
  timeoutSeconds: 600,
  callbackUrl: 'https://hooks.example.com/task-done',
});
console.log(`Task ${task_id} assigned to ${assigned_agent?.name ?? 'queue'}`);
```

### claw.completeRoutingTask(taskId, result?)
Mark a routing task as completed with optional result payload.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| taskId | string | Yes | The task ID |
| result | Object | No | Task result data |

**Returns:** `Promise<{ task: Object }>`

### claw.getRoutingStats()
Get aggregate routing statistics (throughput, latency, agent utilization).

**Returns:** `Promise<{ stats: Object }>`

### claw.getRoutingHealth()
Get routing system health status and diagnostics.

**Returns:** `Promise<{ healthy: boolean, agents: Object, tasks: Object, latency: Object }>`

---

## Error Handling

All SDK methods throw on non-2xx responses. Errors include `status` (HTTP code) and `details` (when available).

```javascript
try {
  await claw.createAction({ ... });
} catch (err) {
  if (err.status === 401) {
    console.error('Invalid API key');
  } else {
    console.error(`Action failed: \${err.message}`);
  }
}
```
