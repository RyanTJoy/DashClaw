# OpenClaw Agent SDK

Zero-dependency SDK for recording agent actions to the OpenClaw OPS Suite. Requires Node 18+ (native fetch).

## Setup

```js
import { OpenClawAgent } from './openclaw-agent.js';

const agent = new OpenClawAgent({
  baseUrl: 'https://your-ops-suite.vercel.app',
  apiKey: process.env.DASHBOARD_API_KEY,
  agentId: 'clawd-main',
  agentName: 'Clawd',
  swarmId: 'openclaw-v1'      // optional
});
```

## Usage

### Record an action manually

```js
// 1. Create the action
const { action_id } = await agent.createAction({
  action_type: 'deploy',
  declared_goal: 'Deploy dashboard v2.1 to production',
  reasoning: 'User requested deployment after tests passed',
  systems_touched: ['vercel', 'github'],
  risk_score: 40,
  confidence: 85,
  reversible: true
});

// 2. Do the work...
await deployToProduction();

// 3. Update the outcome
await agent.updateOutcome(action_id, {
  status: 'completed',
  output_summary: 'Deployed successfully to vercel production',
  duration_ms: 45000,
  cost_estimate: 0.002
});
```

### Track with auto-complete

```js
const result = await agent.track({
  action_type: 'build',
  declared_goal: 'Build token efficiency report',
  risk_score: 10,
  confidence: 90
}, async ({ action_id }) => {
  // Your logic here - outcome is auto-recorded
  const report = await generateReport();
  return report;
});
```

### Open loops

```js
// Register a loop
const { loop_id } = await agent.registerOpenLoop({
  action_id: 'act_abc123',
  loop_type: 'approval',
  description: 'Needs human approval before sending email',
  priority: 'high',
  owner: 'wes'
});

// Resolve it later
await agent.resolveOpenLoop(loop_id, 'resolved', 'Wes approved via dashboard');
```

### Assumptions

```js
await agent.registerAssumption({
  action_id: 'act_abc123',
  assumption: 'User email is verified and active',
  basis: 'Email was used for login 2 hours ago'
});
```

### Query data

```js
// Get actions with filters
const { actions, stats } = await agent.getActions({
  status: 'failed',
  risk_min: 70,
  limit: 10
});

// Get risk signals
const { signals, counts } = await agent.getSignals();
console.log(`${counts.red} red, ${counts.amber} amber signals`);

// Get open loops
const { loops } = await agent.getOpenLoops({ status: 'open', priority: 'critical' });
```

## API Reference

| Method | Description |
|--------|-------------|
| `createAction(action)` | Record a new action |
| `updateOutcome(actionId, outcome)` | Update action result |
| `registerOpenLoop(loop)` | Register an unresolved item |
| `resolveOpenLoop(loopId, status, resolution)` | Close an open loop |
| `registerAssumption(assumption)` | Record an assumption |
| `getActions(filters?)` | List actions with filters |
| `getAction(actionId)` | Get single action with loops + assumptions |
| `getSignals()` | Get computed risk signals |
| `getOpenLoops(filters?)` | List open loops |
| `track(actionDef, fn)` | Auto-tracked action wrapper |

## Authentication

The SDK sends your API key via the `x-api-key` header. Set `DASHBOARD_API_KEY` in your environment.
