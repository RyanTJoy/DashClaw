---
description: See what your AI agents are actually doing. Real-time observability, risk signals, and operational control for autonomous AI agents.
---

Agent Observability Platform

# See what your AI agents are actually doing.

Open-source, self-hosted observability, risk signals, and behavior governance for autonomous AI agents. Guard what they do before they do it.

60+ SDK methodsNode + Python SDKsSSE real-time streamBehavior guardrailsAdaptive recommendation metrics

[Live Demo ](/demo)[ Self-Host](/self-host)[ Docs](/docs)

## A dashboard you will actually use

One screen for actions, risk, approvals, messages, and fleet context. Click the screenshot to view fullscreen.

RealtimeHITL approvalsGuard policiesSwarm map



Dashboard

Fleet-wide overview: live actions, risk, and governance.

1 / 7

[View full gallery →](/gallery)

## Up and running in 5 minutes

Three steps from install to full agent observability.

1

### Install the SDK

npm install dashclaw
# or
pip install dashclaw

Zero dependencies. Works with Node.js and Python agents.

2

### Initialize your agent

const claw = new DashClaw({
  apiKey: '...',
  agentId: 'my-agent',
})

One constructor. Your API key scopes all data.

3

### See it live

with claw.track(action='deploy'):
  # ... actions stream to
  # dashboard in real-time

Actions, signals, and costs appear instantly via SSE.

## Everything you need to trust your agents

Built for teams running autonomous AI agents in production.

### Real-Time Flight Recorder

Watch your agents think and act live. Server-Sent Events (SSE) stream actions, signals, and costs directly to your mission control dashboard.

### Behavioral AI Guardrails

Advanced anomaly detection using vector embeddings (pgvector). Detect outlier agent behavior that hard-coded rules might miss.

### Token & Cost Analytics

Real-time financial tracking. See "Cost per Goal" and "Burn Rate" for every model (GPT-4o, Claude 3.5, etc.) instantly.

### Behavior Governance

Enforce safety with logic rules (rate limits) or semantic natural language policies ("Never access production secrets").

### Node.js & Python SDKs

Zero-dependency clients for both ecosystems. Native adapters for CrewAI, AutoGen, and LangChain.

### HITL Governance

Real-time Approval Queue. Agents pause and wait for human sign-off on sensitive operations.

### Identity Binding

Optional RSA signature verification binds actions to an approved agent identity.

### Memory Health

Proactive maintenance engine identifies stale facts and sends corrective messages to agents.

### DLP & Redaction

Automatic secret redaction (OpenAI, AWS, GitHub) in messages and handoffs before data is stored.

### Session Handoffs

Structured handoff documents for continuity between agent sessions.

### Open Loop Tracking

Track unresolved dependencies, pending approvals, and blockers across agents.

### Assumption Monitoring

Log what agents assume, validate or invalidate, and catch drift early.

## Complete platform scope

DashClaw is more than a dashboard. It is a full platform spanning control plane UX, APIs, data contracts, realtime transport, SDKs, and CI governance.

### Control Plane + Dashboard

Onboarding, team roles, approval queue, risk signals, live action views, and platform health cards.

### API + Data Layer

Typed repository boundaries, route contract governance, maturity labels, and OpenAPI drift checks.

### Realtime Runtime

Broker-backed SSE fanout, reconnect with Last-Event-ID replay, and cutover health controls.

### SDK + Tooling

Node and Python SDKs, CLI toolkit, parity test suites, and docs/CI governance.

### Production hardening shipped

[Adaptive Learning LoopCompleted actions are scored into episodes, recommendations are synthesized per agent/action type, telemetry is captured, and effectiveness metrics are computed.Explore ](/learning)[Route SQL GuardrailsCritical data-layer paths are protected by SQL drift checks and repository contract tests in CI.Explore ](/docs)[API Contract GovernanceOpenAPI drift checks and API inventory maturity gates prevent silent contract regressions.Explore ](/docs)[Cross-SDK Contract HarnessNode and Python SDK critical paths are validated against shared contract fixtures.Explore ](/docs)[Learning Loop AutomationBackfill and recommendation rebuild cron routes keep adaptive recommendation data fresh.Explore ](/learning)

60+ methods across 13 categories

## One SDK. Full observability.

Install from npm or pip. Zero dependencies. Native adapters for CrewAI, AutoGen, and LangChain. Actions, handoffs, context, snippets, messaging, security scanning, and more.

npm packageNode.jsESM + CJSZero Dependencies

[View full SDK docs ](/docs)

// instrument your agent

import { DashClaw } from 'dashclaw'

const claw = new DashClaw({

apiKey: process.env.DASHCLAW\_API\_KEY,

agentId: 'my-agent',

})

// check guard before acting

const { decision } = await claw.guard({

action\_type: 'deploy',

risk\_score: 85,

})

// record an action

await claw.createAction({

action\_type: 'deploy',

declared\_goal: 'Ship auth service',

})

// create a session handoff

await claw.createHandoff({

summary: 'Completed auth system',

key\_decisions: \['JWT over sessions'\],

})

// bulk sync agent state

await claw.syncState({ goals, learning, snippets })

## 7 built-in risk signals

Automatic detection of problematic agent behavior. No configuration required.

### Autonomy Spike

SIGNAL-01

Agent taking too many actions without human checkpoints

### High Impact, Low Oversight

SIGNAL-02

Critical actions without sufficient review

### Repeated Failures

SIGNAL-03

Same action type failing multiple times

### Stale Loop

SIGNAL-04

Open loops unresolved past their expected timeline

### Assumption Drift

SIGNAL-05

Assumptions becoming stale or contradicted by outcomes

### Stale Assumption

SIGNAL-06

Assumptions not validated within expected timeframe

### Stale Running Action

SIGNAL-07

Actions stuck in running state for over 4 hours

## Production-ready operations

Team management, audit trails, webhooks, and more — built in from day one.

### Team Management

Invite links, role-based access (admin/member), and workspace isolation.

### Webhooks & Alerts

HMAC-signed webhook delivery plus email alerts via Resend for signal notifications.

### Activity Audit Log

Every admin action logged — key creation, invites, role changes, and usage activity.

### Guided Onboarding

4-step checklist: create workspace, generate key, install SDK, send first action.

### Multi-Tenant

Full org isolation with API key scoping, per-agent settings, and org management.

### Agent Tools

20+ Python CLI tools for local ops with optional --push sync to the dashboard.

20+ Python CLI tools

## Local Agent Toolkit

Python CLI tools that run alongside your agent. Local-first with SQLite storage. Add `--push` to sync anything to your dashboard.

### Learning & Decisions

Log decisions, lessons, and outcomes. Track what worked and why.

learner.py log "Used JWT" --push

### Context & Handoffs

Key points, threads, and session continuity documents.

context.py capture "Dark theme" --push

### Memory & Health

Scan memory files, track entities, detect stale facts.

scanner.py scan ~/.agent/memory --push

### Goals & Relationships

Goal milestones, contacts, interactions, and follow-ups.

goals.py add "Ship auth" --push

### Security & Audit

Outbound content filtering, session isolation, audit logging.

outbound_filter.py scan message.txt --push

### Automation & Snippets

Reusable code snippets with search, tags, and use tracking.

snippets.py add "retry logic" --push

[View full toolkit docs ](/docs#agent-tools)

## Start monitoring in 5 minutes

Install the SDK, send your first action, and see signals on the dashboard. Open-source and self-hosted.

[Live Demo ](/demo)[ Self-Host](/self-host)

---
description: See what your AI agents are actually doing. Real-time observability, risk signals, and operational control for autonomous AI agents.
---

# Agent Toolkit

20+ Python CLI tools for local agent operations and state management.

## Operations & Continuity

### session-handoff

CLI

Generates structured handover documents for agent session continuity.

`python handoff.py create`

### goal-tracker

CLI

Tracks goals, milestones, and real-time progress markers.

`python goals.py add "Feature X"`

### daily-digest

CLI

Aggregates all agent activity into a single daily summary.

`python digest.py generate`

### project-monitor

CLI

Tracks engagement across different systems and repositories.

`python monitor.py status`

## Knowledge & Learning

### learning-database

CLI

Logs key decisions and lessons learned with outcome tracking.

`python learner.py log "Decision X"`

### memory-health

CLI

Scans memory files for duplication, staleness, and knowledge density.

`python scanner.py scan`

### context-manager

CLI

Manages key points and organizes context into topical threads.

`python context.py capture`

### memory-search

CLI

Advanced search utility for semantic lookup across agent memory.

`python search.py "auth flow"`

## Security & Governance

### outbound-filter

CLI

Scans agent responses for leaked API keys, tokens, or PII.

`python filter.py scan response.txt`

### session-isolator

CLI

Ensures agent work remains within specific directory boundaries.

`python isolate.py check .`

### audit-logger

CLI

Local-first append-only log of all shell commands executed.

`python audit.py tail`

### token-optimizer

CLI

Analyzes prompt history to suggest context window efficiencies.

`python optimize.py analyze`

## Intelligence & Discovery

### memory-extractor

CLI

Automatically extracts entities and topics from raw memory files.

`python extract.py entities`

### relationship-tracker

CLI

Mini-CRM for tracking contacts and previous interaction summaries.

`python crm.py contact "Alice"`

### error-logger

CLI

Identifies recurring failure patterns in agent execution logs.

`python error_log.py analyze`

### communication-analytics

CLI

Analyzes tone and style consistency across messages.

`python stats.py communication`

## Ready to instrument your agent?

Install the toolkit and the SDK to get full dashboard observability in minutes.

[Install Toolkit](/docs)[ Star on GitHub](https://github.com/ucsandman/DashClaw)

---
description: Full reference for the DashClaw SDK. Install, configure, and instrument your AI agents with 60+ methods across action recording, behavior guard, context management, session handoffs, security scanning, and more.
---

[Home](/)SDK Documentation

# SDK Documentation

Full reference for the DashClaw SDK. 60+ methods across 13 categories to instrument your AI agents with action recording, governance, context management, session handoffs, security scanning, and more.

Copy as Markdown[View raw](/api/docs/raw)

## Quick Start

1

### Copy the SDK

Install from npm, or copy the single-file SDK directly.

terminal

npm install dashclaw

2

### Initialize the client

agent.js

import { DashClaw } from 'dashclaw';

const claw = new DashClaw({
  baseUrl: 'http://localhost:3000',
  apiKey: process.env.DASHCLAW_API_KEY,
  agentId: 'my-agent',
  agentName: 'My Agent',
});

3

### Record your first action

agent.js

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

Or use [track()](#track) to wrap it in a single call that auto-records success/failure.

## Constructor

Create a DashClaw instance. Requires Node 18+ (native fetch).

const claw = new DashClaw({ baseUrl, apiKey, agentId, agentName, swarmId, guardMode, guardCallback });

| Parameter     | Type     | Required | Description                                                                                                     |
| ------------- | -------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| baseUrl       | string   | Yes      | DashClaw dashboard URL (e.g. "http://localhost:3000" or "https://your-app.vercel.app")                                                     |
| apiKey        | string   | Yes      | API key for authentication (determines which org's data you access)                                             |
| agentId       | string   | Yes      | Unique identifier for this agent                                                                                |
| agentName     | string   | No       | Human-readable agent name                                                                                       |
| swarmId       | string   | No       | Swarm/group identifier if part of a multi-agent system                                                          |
| guardMode     | string   | No       | Auto guard check before createAction/track: "off" (default), "warn" (log + proceed), "enforce" (throw on block) |
| guardCallback | Function | No       | Called with guard decision object when guardMode is active                                                      |

#### Guard Mode

When `guardMode` is set, every call to `createAction()` and `track()` automatically checks guard policies before proceeding.

import { DashClaw, GuardBlockedError } from 'dashclaw';

const claw = new DashClaw({
  baseUrl: 'http://localhost:3000',
  apiKey: process.env.DASHCLAW_API_KEY,
  agentId: 'my-agent',
  guardMode: 'enforce', // throws GuardBlockedError on block/require_approval
  guardCallback: (decision) => console.log('Guard:', decision.decision),
});

try {
  await claw.createAction({ action_type: 'deploy', declared_goal: 'Ship v2' });
} catch (err) {
  if (err instanceof GuardBlockedError) {
    console.log(err.decision);  // 'block' or 'require_approval'
    console.log(err.reasons);   // ['Risk score 90 >= threshold 80']
  }
}

## Action Recording

Create, update, and query action records. Every agent action gets a full audit trail.

### claw.createAction(action)

Create a new action record. The agent's agentId, agentName, and swarmId are automatically attached.

| Parameter            | Type       | Required | Description                                                                                                                                                        |
| -------------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| action\_type         | string     | Yes      | One of: build, deploy, post, apply, security, message, api, calendar, research, review, fix, refactor, test, config, monitor, alert, cleanup, sync, migrate, other |
| declared\_goal       | string     | Yes      | What this action aims to accomplish                                                                                                                                |
| action\_id           | string     | No       | Custom action ID (auto-generated act\_ UUID if omitted)                                                                                                            |
| reasoning            | string     | No       | Why the agent decided to take this action                                                                                                                          |
| authorization\_scope | string     | No       | What permissions were granted                                                                                                                                      |
| trigger              | string     | No       | What triggered this action                                                                                                                                         |
| systems\_touched     | string\[\] | No       | Systems this action interacts with                                                                                                                                 |
| input\_summary       | string     | No       | Summary of input data                                                                                                                                              |
| parent\_action\_id   | string     | No       | Parent action if this is a sub-action                                                                                                                              |
| reversible           | boolean    | No       | Whether this action can be undone (default: true)                                                                                                                  |
| risk\_score          | number     | No       | Risk score 0-100 (default: 0)                                                                                                                                      |
| confidence           | number     | No       | Confidence level 0-100 (default: 50)                                                                                                                               |

Returns: `Promise<{ action: Object, action_id: string }>`

const { action_id } = await claw.createAction({
  action_type: 'deploy',
  declared_goal: 'Deploy auth service to production',
  risk_score: 70,
  systems_touched: ['kubernetes', 'auth-service'],
  reasoning: 'Scheduled release after QA approval',
});

### claw.waitForApproval(actionId, options?)

Poll for human approval when an action enters pending\_approval status. Useful with hitlMode='off' when you want explicit control over blocking behavior.

| Parameter        | Type   | Required | Description                            |
| ---------------- | ------ | -------- | -------------------------------------- |
| actionId         | string | Yes      | The pending action\_id to poll         |
| options.timeout  | number | No       | Maximum wait in ms (default: 300000)   |
| options.interval | number | No       | Polling interval in ms (default: 5000) |

Returns: `Promise<{ action: Object, action_id: string }>`

const { action_id } = await claw.createAction({
  action_type: 'deploy',
  declared_goal: 'Ship release candidate',
});

const approval = await claw.waitForApproval(action_id, {
  timeout: 180000,
  interval: 3000,
});

console.log('Approved status:', approval.action.status);

### claw.updateOutcome(actionId, outcome)

Update the outcome of an existing action. Automatically sets timestamp\_end if not provided.

| Parameter          | Type       | Required | Description                              |
| ------------------ | ---------- | -------- | ---------------------------------------- |
| actionId           | string     | Yes      | The action\_id to update                 |
| status             | string     | No       | New status: completed, failed, cancelled |
| output\_summary    | string     | No       | What happened                            |
| side\_effects      | string\[\] | No       | Unintended consequences                  |
| artifacts\_created | string\[\] | No       | Files, records, etc. created             |
| error\_message     | string     | No       | Error details if failed                  |
| duration\_ms       | number     | No       | How long it took in milliseconds         |
| cost\_estimate     | number     | No       | Estimated cost in USD                    |

Returns: `Promise<{ action: Object }>`

await claw.updateOutcome(action_id, {
  status: 'completed',
  output_summary: 'Auth service deployed successfully',
  artifacts_created: ['deploy-log-2024-01.txt'],
  duration_ms: 45000,
});

### claw.track(actionDef, fn)

Helper that creates an action, runs your async function, and auto-updates the outcome. If fn throws, the action is marked as failed with the error message.

| Parameter | Type     | Required | Description                                                     |
| --------- | -------- | -------- | --------------------------------------------------------------- |
| actionDef | Object   | Yes      | Action definition (same params as createAction)                 |
| fn        | Function | Yes      | Async function to execute. Receives { action\_id } as argument. |

Returns: `Promise<*> (the return value of fn)`

const result = await claw.track(
  { action_type: 'build', declared_goal: 'Compile project' },
  async ({ action_id }) => {
    // Your logic here. If this throws, the action is marked failed.
    await runBuild();
    return 'Build succeeded';
  }
);

### claw.getActions(filters?)

Get a list of actions with optional filters. Returns paginated results with stats.

| Parameter    | Type   | Required | Description                                              |
| ------------ | ------ | -------- | -------------------------------------------------------- |
| agent\_id    | string | No       | Filter by agent                                          |
| swarm\_id    | string | No       | Filter by swarm                                          |
| status       | string | No       | Filter by status (running, completed, failed, cancelled) |
| action\_type | string | No       | Filter by type                                           |
| risk\_min    | number | No       | Minimum risk score                                       |
| limit        | number | No       | Max results (default: 50)                                |
| offset       | number | No       | Pagination offset (default: 0)                           |

Returns: `Promise<{ actions: Object[], total: number, stats: Object }>`

const { actions, total } = await claw.getActions({
  status: 'failed',
  risk_min: 50,
  limit: 20,
});

### claw.getAction(actionId)

Get a single action with its associated open loops and assumptions.

| Parameter | Type   | Required | Description                |
| --------- | ------ | -------- | -------------------------- |
| actionId  | string | Yes      | The action\_id to retrieve |

Returns: `Promise<{ action: Object, open_loops: Object[], assumptions: Object[] }>`

const { action, open_loops, assumptions } = await claw.getAction('act_abc123');

### claw.getActionTrace(actionId)

Get root-cause trace for an action, including its assumptions, open loops, parent chain, and related actions.

| Parameter | Type   | Required | Description             |
| --------- | ------ | -------- | ----------------------- |
| actionId  | string | Yes      | The action\_id to trace |

Returns: `Promise<{ action: Object, trace: Object }>`

const { trace } = await claw.getActionTrace('act_abc123');
// trace includes: assumptions, open_loops, parent_chain, related_actions

## Loops & Assumptions

Track unresolved dependencies and log what your agents assume. Catch drift before it causes failures.

### claw.registerOpenLoop(loop)

Register an open loop (unresolved dependency, pending approval, etc.) for an action.

| Parameter   | Type   | Required | Description                                                              |
| ----------- | ------ | -------- | ------------------------------------------------------------------------ |
| action\_id  | string | Yes      | Parent action ID                                                         |
| loop\_type  | string | Yes      | One of: followup, question, dependency, approval, review, handoff, other |
| description | string | Yes      | What needs to be resolved                                                |
| priority    | string | No       | One of: low, medium, high, critical (default: medium)                    |
| owner       | string | No       | Who is responsible for resolving this                                    |

Returns: `Promise<{ loop: Object, loop_id: string }>`

const { loop_id } = await claw.registerOpenLoop({
  action_id: 'act_abc123',
  loop_type: 'approval',
  description: 'Needs manager approval for prod deploy',
  priority: 'high',
  owner: 'ops-team',
});

### claw.resolveOpenLoop(loopId, status, resolution?)

Resolve or cancel an open loop.

| Parameter  | Type   | Required | Description                                      |
| ---------- | ------ | -------- | ------------------------------------------------ |
| loopId     | string | Yes      | The loop\_id to resolve                          |
| status     | string | Yes      | "resolved" or "cancelled"                        |
| resolution | string | No       | Resolution description (required when resolving) |

Returns: `Promise<{ loop: Object }>`

await claw.resolveOpenLoop('loop_xyz789', 'resolved', 'Manager approved via Slack');

### claw.registerAssumption(assumption)

Register an assumption made during an action. Track what your agent assumes so you can validate or invalidate later.

| Parameter  | Type    | Required | Description                                      |
| ---------- | ------- | -------- | ------------------------------------------------ |
| action\_id | string  | Yes      | Parent action ID                                 |
| assumption | string  | Yes      | The assumption being made                        |
| basis      | string  | No       | Evidence or reasoning for the assumption         |
| validated  | boolean | No       | Whether this has been validated (default: false) |

Returns: `Promise<{ assumption: Object, assumption_id: string }>`

const { assumption_id } = await claw.registerAssumption({
  action_id: 'act_abc123',
  assumption: 'Database schema is unchanged since last deploy',
  basis: 'No migration files found in latest commits',
});

### claw.getAssumption(assumptionId)

Get a single assumption by ID.

| Parameter    | Type   | Required | Description                    |
| ------------ | ------ | -------- | ------------------------------ |
| assumptionId | string | Yes      | The assumption\_id to retrieve |

Returns: `Promise<{ assumption: Object }>`

const { assumption } = await claw.getAssumption('asm_abc123');

### claw.validateAssumption(assumptionId, validated, invalidated\_reason?)

Validate or invalidate an assumption. When invalidating, a reason is required.

| Parameter           | Type    | Required | Description                                    |
| ------------------- | ------- | -------- | ---------------------------------------------- |
| assumptionId        | string  | Yes      | The assumption\_id to update                   |
| validated           | boolean | Yes      | true to validate, false to invalidate          |
| invalidated\_reason | string  | No       | Required when invalidating (validated = false) |

Returns: `Promise<{ assumption: Object }>`

// Validate
await claw.validateAssumption('asm_abc123', true);

// Invalidate
await claw.validateAssumption('asm_abc123', false, 'Schema was altered by migration #47');

### claw.getOpenLoops(filters?)

Get open loops with optional filters. Returns paginated results with stats.

| Parameter  | Type   | Required | Description                                 |
| ---------- | ------ | -------- | ------------------------------------------- |
| status     | string | No       | Filter by status: open, resolved, cancelled |
| loop\_type | string | No       | Filter by loop type                         |
| priority   | string | No       | Filter by priority                          |
| limit      | number | No       | Max results (default: 50)                   |

Returns: `Promise<{ loops: Object[], total: number, stats: Object }>`

const { loops } = await claw.getOpenLoops({
  status: 'open',
  priority: 'critical',
});

### claw.getDriftReport(filters?)

Get drift report for assumptions with risk scoring. Shows which assumptions are stale, unvalidated, or contradicted by outcomes.

| Parameter  | Type   | Required | Description               |
| ---------- | ------ | -------- | ------------------------- |
| action\_id | string | No       | Filter by action          |
| limit      | number | No       | Max results (default: 50) |

Returns: `Promise<{ assumptions: Object[], drift_summary: Object }>`

const { assumptions, drift_summary } = await claw.getDriftReport();
console.log(drift_summary);
// { total, validated, invalidated, unvalidated, drift_score }

## Signals

Automatic detection of problematic agent behavior. Seven signal types fire based on action patterns — no configuration required.

### claw.getSignals()

Get current risk signals across all agents. Returns 7 signal types: autonomy\_spike, high\_impact\_low\_oversight, repeated\_failures, stale\_loop, assumption\_drift, stale\_assumption, and stale\_running\_action.

Returns: `Promise<{ signals: Object[], counts: { red: number, amber: number, total: number } }>`

const { signals, counts } = await claw.getSignals();
console.log(`${counts.red} red, ${counts.amber} amber signals`);

for (const signal of signals) {
  console.log(`[${signal.severity}] ${signal.signal_type}: ${signal.help}`);
}

#### Signal Types

`autonomy_spike`Agent taking too many actions without human checkpoints

`high_impact_low_oversight`Critical actions without sufficient review

`repeated_failures`Same action type failing multiple times

`stale_loop`Open loops unresolved past their expected timeline

`assumption_drift`Assumptions becoming stale or contradicted by outcomes

`stale_assumption`Assumptions not validated within expected timeframe

`stale_running_action`Actions stuck in running state for over 4 hours

## Behavior Guard

Check org-level policies before executing risky actions. Returns allow, warn, block, or require\_approval based on configured guard policies.

### claw.guard(context, options?)

Evaluate guard policies for a proposed action. Call this before risky operations to get a go/no-go decision. The agent\_id is auto-attached from the SDK constructor.

| Parameter                | Type       | Required | Description                                 |
| ------------------------ | ---------- | -------- | ------------------------------------------- |
| context.action\_type     | string     | Yes      | The type of action being proposed           |
| context.risk\_score      | number     | No       | Risk score 0-100                            |
| context.systems\_touched | string\[\] | No       | Systems this action will affect             |
| context.reversible       | boolean    | No       | Whether the action can be undone            |
| context.declared\_goal   | string     | No       | What the action accomplishes                |
| options.includeSignals   | boolean    | No       | Also check live risk signals (adds latency) |

Returns: `Promise<{ decision: string, reasons: string[], warnings: string[], matched_policies: string[], evaluated_at: string }>`

const result = await claw.guard({
  action_type: 'deploy',
  risk_score: 85,
  systems_touched: ['production-api'],
  reversible: false,
  declared_goal: 'Deploy auth service v2',
});

if (result.decision === 'block') {
  console.log('Blocked:', result.reasons);
  return; // abort the action
}

if (result.decision === 'warn') {
  console.log('Warnings:', result.warnings);
}

// proceed with the action
await claw.createAction({ action_type: 'deploy', ... });

### claw.getGuardDecisions(filters?)

Retrieve recent guard evaluation decisions for audit and review.

| Parameter        | Type   | Required | Description                                               |
| ---------------- | ------ | -------- | --------------------------------------------------------- |
| filters.decision | string | No       | Filter by decision: allow, warn, block, require\_approval |
| filters.limit    | number | No       | Max results (default 20, max 100)                         |
| filters.offset   | number | No       | Pagination offset                                         |

Returns: `Promise<{ decisions: Object[], total: number, stats: { total_24h, blocks_24h, warns_24h, approvals_24h } }>`

const { decisions, stats } = await claw.getGuardDecisions({
  decision: 'block',
  limit: 10,
});

console.log(`${stats.blocks_24h} blocks in last 24h`);

#### Policy Types

`risk_threshold`Block or warn when an action's risk score exceeds a configured threshold

`require_approval`Require human approval for specific action types (e.g., deploy, security)

`block_action_type`Unconditionally block specific action types from executing

`rate_limit`Warn or block when an agent exceeds a configured action frequency

`webhook_check`Call an external HTTPS endpoint for custom decision logic (can only escalate severity, never downgrade)

Policies are configured per-org via the Policies page in the dashboard. The guard endpoint evaluates all active policies and returns the strictest applicable decision.

## Dashboard Data

Push data from your agent directly to the DashClaw dashboard. All methods auto-attach the agent's agentId.

### claw.reportTokenUsage(usage)

Report token and model-usage snapshots for cost/burn-rate analytics. API remains available even when token widgets are disabled in certain dashboard modes.

| Parameter     | Type   | Required | Description                          |
| ------------- | ------ | -------- | ------------------------------------ |
| tokens\_in    | number | Yes      | Input tokens consumed                |
| tokens\_out   | number | Yes      | Output tokens generated              |
| context\_used | number | No       | Context window tokens used           |
| context\_max  | number | No       | Maximum context window size          |
| model         | string | No       | Model identifier (e.g., gpt-4o-mini) |

Returns: `Promise<{ snapshot: Object }>`

await claw.reportTokenUsage({
  tokens_in: 1234,
  tokens_out: 980,
  context_used: 2214,
  context_max: 128000,
  model: 'gpt-4o',
});

### claw.recordDecision(entry)

Record a decision for the learning database. Track what your agent decides and why.

| Parameter  | Type   | Required | Description                        |
| ---------- | ------ | -------- | ---------------------------------- |
| decision   | string | Yes      | What was decided                   |
| context    | string | No       | Context around the decision        |
| reasoning  | string | No       | Why this decision was made         |
| outcome    | string | No       | "success", "failure", or "pending" |
| confidence | number | No       | Confidence level 0-100             |

Returns: `Promise<{ decision: Object }>`

await claw.recordDecision({
  decision: 'Use Redis for session caching',
  reasoning: 'Lower latency than Postgres for read-heavy access pattern',
  confidence: 85,
});

### claw.createGoal(goal)

Create a goal in the goals tracker.

| Parameter    | Type   | Required | Description                         |
| ------------ | ------ | -------- | ----------------------------------- |
| title        | string | Yes      | Goal title                          |
| category     | string | No       | Goal category                       |
| description  | string | No       | Detailed description                |
| target\_date | string | No       | Target completion date (ISO string) |
| progress     | number | No       | Progress 0-100                      |
| status       | string | No       | "active", "completed", or "paused"  |

Returns: `Promise<{ goal: Object }>`

await claw.createGoal({
  title: 'Complete API migration',
  category: 'engineering',
  target_date: '2025-03-01T00:00:00.000Z',
  progress: 30,
});

### claw.recordContent(content)

Record content creation (articles, posts, documents).

| Parameter | Type   | Required | Description                            |
| --------- | ------ | -------- | -------------------------------------- |
| title     | string | Yes      | Content title                          |
| platform  | string | No       | Platform (e.g., "linkedin", "twitter") |
| status    | string | No       | "draft" or "published"                 |
| url       | string | No       | Published URL                          |

Returns: `Promise<{ content: Object }>`

await claw.recordContent({
  title: 'How We Migrated to Edge Functions',
  platform: 'linkedin',
  status: 'published',
  url: 'https://linkedin.com/posts/...',
});

### claw.recordInteraction(interaction)

Record a relationship interaction (message, meeting, email).

| Parameter     | Type   | Required | Description                                            |
| ------------- | ------ | -------- | ------------------------------------------------------ |
| summary       | string | Yes      | What happened                                          |
| contact\_name | string | No       | Contact name (auto-resolves to contact\_id)            |
| contact\_id   | string | No       | Direct contact ID                                      |
| direction     | string | No       | "inbound" or "outbound"                                |
| type          | string | No       | Interaction type (e.g., "message", "meeting", "email") |
| platform      | string | No       | Platform used                                          |

Returns: `Promise<{ interaction: Object }>`

await claw.recordInteraction({
  contact_name: 'Jane Smith',
  summary: 'Discussed Q1 roadmap and timeline',
  type: 'meeting',
  direction: 'outbound',
});

### claw.reportConnections(connections)

Report active connections/integrations for this agent. Call at agent startup to register what services the agent is connected to.

| Parameter                | Type           | Required | Description                                                              |
| ------------------------ | -------------- | -------- | ------------------------------------------------------------------------ |
| connections              | Object\[\]     | Yes      | Array of connection objects                                              |
| connections\[\].provider | string         | Yes      | Service name (e.g., "anthropic", "github")                               |
| connections\[\].authType | string         | No       | Auth method: api\_key, subscription, oauth, pre\_configured, environment |
| connections\[\].planName | string         | No       | Plan name (e.g., "Pro Max")                                              |
| connections\[\].status   | string         | No       | Connection status: active, inactive, error                               |
| connections\[\].metadata | Object\|string | No       | Optional metadata (e.g., { cost: "$100/mo" })                            |

Returns: `Promise<{ connections: Object[], created: number }>`

await claw.reportConnections([
  { provider: 'anthropic', authType: 'subscription', planName: 'Pro Max', status: 'active' },
  { provider: 'github', authType: 'oauth', status: 'active' },
  { provider: 'slack', authType: 'api_key', status: 'active', metadata: { workspace: 'eng-team' } },
]);

### claw.createCalendarEvent(event)

Create a calendar event.

| Parameter   | Type   | Required | Description             |
| ----------- | ------ | -------- | ----------------------- |
| summary     | string | Yes      | Event title/summary     |
| start\_time | string | Yes      | Start time (ISO string) |
| end\_time   | string | No       | End time (ISO string)   |
| location    | string | No       | Event location          |
| description | string | No       | Event description       |

Returns: `Promise<{ event: Object }>`

await claw.createCalendarEvent({
  summary: 'Deploy review',
  start_time: '2025-02-10T14:00:00.000Z',
  end_time: '2025-02-10T14:30:00.000Z',
  description: 'Review prod deploy results',
});

### claw.recordIdea(idea)

Record an idea or inspiration for later review.

| Parameter   | Type   | Required | Description                                           |
| ----------- | ------ | -------- | ----------------------------------------------------- |
| title       | string | Yes      | Idea title                                            |
| description | string | No       | Detailed description                                  |
| category    | string | No       | Category (e.g., "feature", "optimization", "content") |
| score       | number | No       | Priority/quality score 0-100 (default: 50)            |
| status      | string | No       | "pending", "in\_progress", "shipped", "rejected"      |
| source      | string | No       | Where this idea came from                             |

Returns: `Promise<{ idea: Object }>`

await claw.recordIdea({
  title: 'Auto-summarize daily agent activity',
  category: 'feature',
  score: 75,
  source: 'User feedback in Slack #agents',
});

### claw.reportMemoryHealth(report)

Report memory health snapshot with entities and topics. Call periodically (e.g., daily) to track memory system health over time.

| Parameter              | Type       | Required | Description                   |
| ---------------------- | ---------- | -------- | ----------------------------- |
| health                 | Object     | Yes      | Health metrics object         |
| health.score           | number     | Yes      | Health score 0-100            |
| health.total\_files    | number     | No       | Number of memory files        |
| health.total\_lines    | number     | No       | Total lines across all files  |
| health.total\_size\_kb | number     | No       | Total size in KB              |
| health.duplicates      | number     | No       | Potential duplicate facts     |
| health.stale\_count    | number     | No       | Stale facts count             |
| entities               | Object\[\] | No       | Key entities found in memory  |
| topics                 | Object\[\] | No       | Topics/themes found in memory |

Returns: `Promise<{ snapshot: Object, entities_count: number, topics_count: number }>`

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

## Session Handoffs

Create structured session handoff documents for continuity between agent sessions.

### createHandoff(handoff)

Create a session handoff document summarizing work done, decisions made, and next priorities.

| Parameter        | Type       | Required | Description                     |
| ---------------- | ---------- | -------- | ------------------------------- |
| summary          | string     | Yes      | Session summary                 |
| session\_date    | string     | No       | Date string (defaults to today) |
| key\_decisions   | string\[\] | No       | Key decisions made this session |
| open\_tasks      | string\[\] | No       | Tasks still open                |
| mood\_notes      | string     | No       | User mood/energy observations   |
| next\_priorities | string\[\] | No       | What to focus on next           |

Returns: `Promise<{handoff: Object, handoff_id: string}>`

await claw.createHandoff({
  summary: 'Completed auth system overhaul',
  key_decisions: ['JWT over sessions', 'Added refresh tokens'],
  open_tasks: ['Write migration guide', 'Load test'],
  next_priorities: ['Deploy to staging'],
});

### getHandoffs(filters?)

Get handoffs for this agent with optional date and limit filters.

| Parameter | Type   | Required | Description             |
| --------- | ------ | -------- | ----------------------- |
| date      | string | No       | Filter by session\_date |
| limit     | number | No       | Max results             |

Returns: `Promise<{handoffs: Object[], total: number}>`

const { handoffs } = await claw.getHandoffs({ limit: 5 });

### getLatestHandoff()

Get the most recent handoff for this agent. Useful at session start to restore context.

Returns: `Promise<{handoff: Object|null}>`

const { handoff } = await claw.getLatestHandoff();
if (handoff) {
  console.log('Last session:', handoff.summary);
  console.log('Open tasks:', JSON.parse(handoff.open_tasks));
}

## Context Manager

Capture key points and organize context into threads for long-running topics.

### captureKeyPoint(point)

Capture a key point from the current session for later recall.

| Parameter     | Type   | Required | Description                                        |
| ------------- | ------ | -------- | -------------------------------------------------- |
| content       | string | Yes      | The key point content                              |
| category      | string | No       | One of: decision, task, insight, question, general |
| importance    | number | No       | Importance 1-10 (default 5)                        |
| session\_date | string | No       | Date string (defaults to today)                    |

Returns: `Promise<{point: Object, point_id: string}>`

await claw.captureKeyPoint({
  content: 'User wants dark mode as the default theme',
  category: 'decision',
  importance: 8,
});

### getKeyPoints(filters?)

Get key points with optional category and date filters.

| Parameter     | Type   | Required | Description        |
| ------------- | ------ | -------- | ------------------ |
| category      | string | No       | Filter by category |
| session\_date | string | No       | Filter by date     |
| limit         | number | No       | Max results        |

Returns: `Promise<{points: Object[], total: number}>`

const { points } = await claw.getKeyPoints({ category: 'decision' });

### createThread(thread)

Create a context thread for tracking a topic across multiple entries.

| Parameter | Type   | Required | Description                            |
| --------- | ------ | -------- | -------------------------------------- |
| name      | string | Yes      | Thread name (unique per agent per org) |
| summary   | string | No       | Initial summary                        |

Returns: `Promise<{thread: Object, thread_id: string}>`

const { thread_id } = await claw.createThread({ name: 'Auth System', summary: 'Tracking auth decisions' });

### addThreadEntry(threadId, content, entryType?)

Add an entry to an existing thread.

| Parameter | Type   | Required | Description                |
| --------- | ------ | -------- | -------------------------- |
| threadId  | string | Yes      | Thread ID                  |
| content   | string | Yes      | Entry content              |
| entryType | string | No       | Entry type (default: note) |

Returns: `Promise<{entry: Object, entry_id: string}>`

await claw.addThreadEntry(threadId, 'Decided on JWT strategy');

### closeThread(threadId, summary?)

Close a thread with an optional final summary.

| Parameter | Type   | Required | Description   |
| --------- | ------ | -------- | ------------- |
| threadId  | string | Yes      | Thread ID     |
| summary   | string | No       | Final summary |

Returns: `Promise<{thread: Object}>`

await claw.closeThread(threadId, 'Auth complete: JWT + refresh tokens');

### getThreads(filters?)

Get threads with optional status filter.

| Parameter | Type   | Required | Description              |
| --------- | ------ | -------- | ------------------------ |
| status    | string | No       | Filter: active or closed |
| limit     | number | No       | Max results              |

Returns: `Promise<{threads: Object[], total: number}>`

const { threads } = await claw.getThreads({ status: 'active' });

### getContextSummary()

Get a combined view of today's key points and active threads.

Returns: `Promise<{points: Object[], threads: Object[]}>`

const { points, threads } = await claw.getContextSummary();

## Automation Snippets

Save, search, and reuse code snippets across agent sessions.

### saveSnippet(snippet)

Save or update a reusable code snippet. Upserts on name.

| Parameter   | Type       | Required | Description                   |
| ----------- | ---------- | -------- | ----------------------------- |
| name        | string     | Yes      | Snippet name (unique per org) |
| code        | string     | Yes      | The snippet code              |
| description | string     | No       | What this snippet does        |
| language    | string     | No       | Programming language          |
| tags        | string\[\] | No       | Tags for categorization       |

Returns: `Promise<{snippet: Object, snippet_id: string}>`

await claw.saveSnippet({
  name: 'fetch-with-retry',
  code: 'async function fetchRetry(url, n = 3) { ... }',
  language: 'javascript',
  tags: ['fetch', 'retry'],
});

### getSnippets(filters?)

Search and list snippets.

| Parameter | Type   | Required | Description             |
| --------- | ------ | -------- | ----------------------- |
| search    | string | No       | Search name/description |
| tag       | string | No       | Filter by tag           |
| language  | string | No       | Filter by language      |
| limit     | number | No       | Max results             |

Returns: `Promise<{snippets: Object[], total: number}>`

const { snippets } = await claw.getSnippets({ language: 'javascript' });

### useSnippet(snippetId)

Mark a snippet as used (increments use\_count).

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| snippetId | string | Yes      | Snippet ID  |

Returns: `Promise<{snippet: Object}>`

await claw.useSnippet('sn_abc123');

### deleteSnippet(snippetId)

Delete a snippet.

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| snippetId | string | Yes      | Snippet ID  |

Returns: `Promise<{deleted: boolean, id: string}>`

await claw.deleteSnippet('sn_abc123');

## User Preferences

Track user observations, learned preferences, mood, and successful approaches.

### logObservation(obs)

Log something you noticed about the user.

| Parameter   | Type   | Required | Description          |
| ----------- | ------ | -------- | -------------------- |
| observation | string | Yes      | The observation text |
| category    | string | No       | Category tag         |
| importance  | number | No       | Importance 1-10      |

Returns: `Promise<{observation: Object}>`

await claw.logObservation({ observation: 'Prefers tabs over spaces', category: 'coding', importance: 6 });

### setPreference(pref)

Record a learned user preference.

| Parameter  | Type   | Required | Description            |
| ---------- | ------ | -------- | ---------------------- |
| preference | string | Yes      | Preference description |
| category   | string | No       | Category tag           |
| confidence | number | No       | Confidence 0-100       |

Returns: `Promise<{preference: Object}>`

await claw.setPreference({ preference: 'Prefers concise responses', confidence: 90 });

### logMood(entry)

Log user mood and energy level.

| Parameter | Type   | Required | Description                      |
| --------- | ------ | -------- | -------------------------------- |
| mood      | string | Yes      | Mood (e.g., focused, frustrated) |
| energy    | string | No       | Energy level (high, low)         |
| notes     | string | No       | Additional notes                 |

Returns: `Promise<{mood: Object}>`

await claw.logMood({ mood: 'focused', energy: 'high' });

### trackApproach(entry)

Track an approach and whether it worked. Upserts — repeated calls update success/fail counts.

| Parameter | Type    | Required | Description                   |
| --------- | ------- | -------- | ----------------------------- |
| approach  | string  | Yes      | Approach description          |
| context   | string  | No       | When to use this              |
| success   | boolean | No       | true = worked, false = failed |

Returns: `Promise<{approach: Object}>`

await claw.trackApproach({ approach: 'Show code before explanation', success: true });

### getPreferenceSummary()

Get a summary of all user preference data for this agent.

Returns: `Promise<{summary: Object}>`

const { summary } = await claw.getPreferenceSummary();

### getApproaches(filters?)

Get tracked approaches ranked by success count.

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| limit     | number | No       | Max results |

Returns: `Promise<{approaches: Object[], total: number}>`

const { approaches } = await claw.getApproaches({ limit: 10 });

## Daily Digest

Aggregated daily summary from all data sources — no new storage needed.

### getDailyDigest(date?)

Get a daily activity digest aggregated from actions, decisions, lessons, content, ideas, interactions, and goals.

| Parameter | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| date      | string | No       | YYYY-MM-DD (defaults to today) |

Returns: `Promise<{date: string, digest: Object, summary: Object}>`

const { digest, summary } = await claw.getDailyDigest();
console.log(`Today: ${summary.action_count} actions, ${summary.decision_count} decisions`);

## Security Scanning

Scan text for sensitive data (API keys, tokens, PII) before sending it externally. Content is never stored — only metadata.

### scanContent(text, destination?)

Scan text for sensitive data. Returns findings and redacted text. Does not store anything.

| Parameter   | Type   | Required | Description                    |
| ----------- | ------ | -------- | ------------------------------ |
| text        | string | Yes      | Text to scan                   |
| destination | string | No       | Where text is headed (context) |

Returns: `Promise<{clean: boolean, findings_count: number, findings: Object[], redacted_text: string}>`

const result = await claw.scanContent(messageText, 'slack');
if (!result.clean) {
  console.warn(`Found ${result.findings_count} issues`);
  messageText = result.redacted_text; // Use redacted version
}

### reportSecurityFinding(text, destination?)

Same as scanContent but stores finding metadata (never the content) for audit trails.

| Parameter   | Type   | Required | Description          |
| ----------- | ------ | -------- | -------------------- |
| text        | string | Yes      | Text to scan         |
| destination | string | No       | Where text is headed |

Returns: `Promise<{clean: boolean, findings_count: number, findings: Object[], redacted_text: string}>`

await claw.reportSecurityFinding(outboundMessage, 'email');

## Agent Messaging

Direct inter-agent messaging with inbox semantics, conversation threads, shared workspace documents, and broadcast capability.

### sendMessage({ to, type, subject, body, threadId?, urgent?, docRef? })

Send a message to another agent. Omit 'to' to broadcast to all agents.

| Parameter | Type    | Required | Description                                                       |
| --------- | ------- | -------- | ----------------------------------------------------------------- |
| to        | string  | No       | Target agent ID (null = broadcast)                                |
| type      | string  | No       | Message type: action\|info|lesson|question|status (default: info) |
| subject   | string  | No       | Subject line (max 200 chars)                                      |
| body      | string  | Yes      | Message body (max 2000 chars)                                     |
| threadId  | string  | No       | Thread ID to attach to                                            |
| urgent    | boolean | No       | Mark as urgent                                                    |
| docRef    | string  | No       | Reference to a shared doc ID                                      |

Returns: `Promise<{message: Object, message_id: string}>`

await claw.sendMessage({
  to: 'ops-agent',
  type: 'question',
  subject: 'Deploy approval needed',
  body: 'Auth service ready for prod. Please review.',
  urgent: true,
});

### getInbox({ type?, unread?, threadId?, limit? })

Get inbox messages for this agent (direct + broadcasts, excluding archived).

| Parameter | Type    | Required | Description                |
| --------- | ------- | -------- | -------------------------- |
| type      | string  | No       | Filter by message type     |
| unread    | boolean | No       | Only unread messages       |
| threadId  | string  | No       | Filter by thread           |
| limit     | number  | No       | Max messages (default: 50) |

Returns: `Promise<{messages: Object[], total: number, unread_count: number}>`

const { messages, unread_count } = await claw.getInbox({ unread: true });
console.log(`${unread_count} unread messages`);

### markRead(messageIds)

Mark one or more messages as read.

| Parameter  | Type       | Required | Description          |
| ---------- | ---------- | -------- | -------------------- |
| messageIds | string\[\] | Yes      | Array of message IDs |

Returns: `Promise<{updated: number}>`

await claw.markRead(['msg_abc123', 'msg_def456']);

### archiveMessages(messageIds)

Archive messages (removes from inbox).

| Parameter  | Type       | Required | Description          |
| ---------- | ---------- | -------- | -------------------- |
| messageIds | string\[\] | Yes      | Array of message IDs |

Returns: `Promise<{updated: number}>`

await claw.archiveMessages(['msg_abc123']);

### broadcast({ type, subject, body, threadId? })

Broadcast a message to all agents in the organization.

| Parameter | Type   | Required | Description                  |
| --------- | ------ | -------- | ---------------------------- |
| type      | string | No       | Message type (default: info) |
| subject   | string | No       | Subject line                 |
| body      | string | Yes      | Message body                 |
| threadId  | string | No       | Thread ID                    |

Returns: `Promise<{message: Object, message_id: string}>`

await claw.broadcast({
  type: 'status',
  subject: 'Deployment complete',
  body: 'Auth service v2.1 deployed to production.',
});

### createMessageThread({ name, participants? })

Start a new conversation thread.

| Parameter    | Type       | Required | Description                    |
| ------------ | ---------- | -------- | ------------------------------ |
| name         | string     | Yes      | Thread name                    |
| participants | string\[\] | No       | Agent IDs (null = open to all) |

Returns: `Promise<{thread: Object, thread_id: string}>`

const { thread_id } = await claw.createMessageThread({
  name: 'Auth Service Migration',
  participants: ['ops-agent', 'security-agent'],
});

### getMessageThreads({ status?, limit? })

List message threads this agent participates in.

| Parameter | Type   | Required | Description                     |
| --------- | ------ | -------- | ------------------------------- |
| status    | string | No       | Filter: open\|resolved|archived |
| limit     | number | No       | Max threads (default: 20)       |

Returns: `Promise<{threads: Object[], total: number}>`

const { threads } = await claw.getMessageThreads({ status: 'open' });

### resolveMessageThread(threadId, summary?)

Close a conversation thread with an optional summary.

| Parameter | Type   | Required | Description        |
| --------- | ------ | -------- | ------------------ |
| threadId  | string | Yes      | Thread ID          |
| summary   | string | No       | Resolution summary |

Returns: `Promise<{thread: Object}>`

await claw.resolveMessageThread('mt_abc123', 'Migration completed successfully.');

### saveSharedDoc({ name, content })

Create or update a shared workspace document. Upserts by name — updates increment the version.

| Parameter | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| name      | string | Yes      | Document name (unique per org) |
| content   | string | Yes      | Document content               |

Returns: `Promise<{doc: Object, doc_id: string}>`

await claw.saveSharedDoc({
  name: 'runbook/auth-deploy',
  content: '# Auth Deploy Runbook\n\n1. Run migrations...',
});

## Bulk Sync

Push multiple data categories in a single request. Ideal for bootstrapping agent state or periodic state snapshots. Every key is optional — only provided categories are processed. Each category is independent; partial failures in one category don't block others.

### syncState(state)

Sync multiple data categories in a single request. Accepts connections, memory, goals, learning, content, inspiration, context\_points, context\_threads, handoffs, preferences, and snippets.

| Parameter              | Type       | Required | Description                                                      |
| ---------------------- | ---------- | -------- | ---------------------------------------------------------------- |
| state.connections      | Object\[\] | No       | Service connections (max 50)                                     |
| state.memory           | Object     | No       | { health, entities\[\], topics\[\] }                             |
| state.goals            | Object\[\] | No       | Goals (max 100)                                                  |
| state.learning         | Object\[\] | No       | Decisions/lessons (max 100)                                      |
| state.context\_points  | Object\[\] | No       | Key points (max 200)                                             |
| state.context\_threads | Object\[\] | No       | Threads (max 50, upserts by name)                                |
| state.snippets         | Object\[\] | No       | Code snippets (max 50, upserts by name)                          |
| state.handoffs         | Object\[\] | No       | Session handoffs (max 50)                                        |
| state.preferences      | Object     | No       | { observations\[\], preferences\[\], moods\[\], approaches\[\] } |
| state.content          | Object\[\] | No       | Content items (max 100)                                          |
| state.inspiration      | Object\[\] | No       | Ideas (max 100)                                                  |

Returns: `Promise<{results: Object, total_synced: number, total_errors: number, duration_ms: number}>`

const result = await claw.syncState({
  connections: [
    { provider: 'github', auth_type: 'oauth', status: 'active' },
    { provider: 'neon', auth_type: 'api_key', status: 'active' },
  ],
  goals: [
    { title: 'Deploy v2', status: 'active' },
  ],
  learning: [
    { decision: 'Used JWT for Edge compat', reasoning: 'NextAuth on Vercel Edge' },
  ],
  context_points: [
    { content: 'Dark-only theme', category: 'insight', importance: 7 },
  ],
});
console.log(`Synced ${result.total_synced} items in ${result.duration_ms}ms`);

## Error Handling

All SDK methods throw on non-2xx responses. Errors include `status` (HTTP code) and `details` (when available).

Error shape

{
  message: "Validation failed",  // error.message
  status: 400,                    // error.status (HTTP status code)
  details: { ... }                // error.details (optional)
}

Recommended pattern

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

## Agent Tools (Python)

The `agent-tools/` directory contains Python CLI tools that run locally alongside your agent. They track learning, goals, context, memory health, security, and more in local SQLite databases. Each tool supports an optional `--push` flag to sync data to your DashClaw dashboard.

### Install & Configure

Run the installer for your platform, then configure dashboard sync (optional).

Mac / Linux

bash ./agent-tools/install-mac.sh

Windows (PowerShell)

powershell -ExecutionPolicy Bypass -File .\agent-tools\install-windows.ps1

Configure dashboard sync (optional)

# Copy and edit the config file
cp agent-tools/.env.example agent-tools/secrets/dashclaw.env

# Set your dashboard URL, API key, and agent ID
DASHCLAW_URL=http://localhost:3000
DASHCLAW_API_KEY=oc_live_...
DASHCLAW_AGENT_ID=my-agent

### Tool Categories

#### Ops & Learning

learning-databaseerror-loggerdaily-digestapi-monitor

#### Context & Sessions

context-managersession-handoffopen-loops

#### Memory & Knowledge

memory-healthmemory-searchtoken-efficiency

#### Security & Audit

outbound-filtersession-isolatoraudit-logger

#### Relationships

relationship-trackercommunication-analyticsuser-context

#### Automation

automation-librarytoken-capturesync\_to\_dashclaw

### Tool-to-SDK Mapping

Python CLI tools push to the same API endpoints as the JavaScript SDK methods.

| Python Tool         | Command        | API Endpoint              | JS SDK Method        |
| ------------------- | -------------- | ------------------------- | -------------------- |
| learner.py          | log --push     | POST /api/learning        | recordDecision()     |
| goals.py            | add --push     | POST /api/goals           | createGoal()         |
| tracker.py          | log --push     | POST /api/relationships   | recordInteraction()  |
| scanner.py          | scan --push    | POST /api/memory          | reportMemoryHealth() |
| context.py          | capture --push | POST /api/context/points  | captureKeyPoint()    |
| context.py          | thread --push  | POST /api/context/threads | createThread()       |
| handoff.py          | create --push  | POST /api/handoffs        | createHandoff()      |
| snippets.py         | add --push     | POST /api/snippets        | saveSnippet()        |
| user\_context.py    | note --push    | POST /api/preferences     | logObservation()     |
| loops.py            | add --push     | POST /api/actions/loops   | registerOpenLoop()   |
| comms.py            | log --push     | POST /api/relationships   | recordInteraction()  |
| errors.py           | log --push     | POST /api/learning        | recordDecision()     |
| outbound\_filter.py | scan --push    | POST /api/security/scan   | scanContent()        |

### Bulk Sync

Sync all local data

# Preview what would sync
python agent-tools/tools/sync_to_dashclaw.py --dry-run

# Sync everything
python agent-tools/tools/sync_to_dashclaw.py

# Sync specific categories
python agent-tools/tools/sync_to_dashclaw.py --categories learning,goals,context_points

---
description: Run your own DashClaw dashboard locally or in your cloud account. You pay, you own the data.
---

[Home](/)Self-Host

# Self-host DashClaw

You own the dashboard, you own the data, and you pay your own hosting bill. Your agents point at your base URL.

[View Live Demo](/demo)[SDK Docs](/docs)[Open Source Repo ](https://github.com/ucsandman/DashClaw)

1

## Start your dashboard (local)

The installer generates secrets, writes .env.local, installs dependencies, and prints the API key your agents should use.

Copy Server Setup Prompt[View prompt](/api/prompts/server-setup/raw)

Windows (PowerShell)

./install-windows.bat

Mac / Linux (bash)

bash ./install-mac.sh

When it finishes, open http://localhost:3000.

2

## Point your agents at your base URL

Agents do not need your database URL. They only need a base URL + API key. Paste these into your agent machine.

Copy Agent Connect Prompt[View prompt](/api/prompts/agent-connect/raw)

Agent environment (example)

DASHCLAW_BASE_URL=http://localhost:3000
DASHCLAW_API_KEY=oc_live_...
DASHCLAW_AGENT_ID=cinder

Your server uses .env.local. Your agent uses its own environment variables.

3

## Optional: enable verified agents (one-click pairing)

If you want cryptographic identity binding, your agent generates a keypair and prints a one-click pairing URL. You approve once (or approve-all).

Agent environment (verified mode)

# Optional: sign actions with a private key
DASHCLAW_PRIVATE_KEY_PATH=./secrets/cinder-private.jwk

# Optional: server-side enforcement (set on the dashboard host)
ENFORCE_AGENT_SIGNATURES=true

The goal is: no manual public key uploads. Pairing registers the matching public key automatically.

Next: we’ll add “pairIfNeeded()” helpers to the SDK so agents print a link and block until approved.