# DashClaw

Full-featured agent toolkit for the [DashClaw](https://github.com/ucsandman/DashClaw) platform. Zero dependencies, requires Node 18+ (native fetch).

**57 methods** across 13 categories: action recording, context management, session handoffs, security scanning, agent messaging, behavior guard, user preferences, and more.

## Install

```bash
npm install dashclaw
```

## Quick Start

```js
import { DashClaw } from 'dashclaw';

const claw = new DashClaw({
  baseUrl: 'https://your-app.vercel.app',
  apiKey: process.env.DASHCLAW_API_KEY,
  agentId: 'my-agent',
  agentName: 'My Agent',
});

// Record an action
const { action_id } = await claw.createAction({
  action_type: 'deploy',
  declared_goal: 'Deploy auth service to production',
  risk_score: 60,
});

// ... do the work ...

await claw.updateOutcome(action_id, {
  status: 'completed',
  output_summary: 'Auth service deployed successfully',
});
```

## Migration from OpenClawAgent

The backward-compatible alias `OpenClawAgent` is preserved:

```js
// Old:
import { OpenClawAgent } from './openclaw-agent.js';
// New (both work):
import { DashClaw } from 'dashclaw';
import { OpenClawAgent } from 'dashclaw';
```

## API Reference (54 methods)

### Action Recording (6)

| Method | Description |
|--------|-------------|
| `createAction(action)` | Record a new action |
| `updateOutcome(actionId, outcome)` | Update action result |
| `getActions(filters?)` | List actions with filters |
| `getAction(actionId)` | Get single action with loops + assumptions |
| `getActionTrace(actionId)` | Get root-cause trace |
| `track(actionDef, fn)` | Auto-tracked action wrapper |

### Loops & Assumptions (7)

| Method | Description |
|--------|-------------|
| `registerOpenLoop(loop)` | Register an unresolved item |
| `resolveOpenLoop(loopId, status, resolution)` | Close an open loop |
| `getOpenLoops(filters?)` | List open loops |
| `registerAssumption(assumption)` | Record an assumption |
| `getAssumption(assumptionId)` | Get single assumption |
| `validateAssumption(id, validated, reason?)` | Validate or invalidate |
| `getDriftReport(filters?)` | Get assumption drift scores |

### Signals (1)

| Method | Description |
|--------|-------------|
| `getSignals()` | Get computed risk signals |

### Dashboard Data (8)

| Method | Description |
|--------|-------------|
| `recordDecision(entry)` | Record a decision |
| `createGoal(goal)` | Create a goal |
| `recordContent(content)` | Record content creation |
| `recordInteraction(interaction)` | Record a relationship interaction |
| `reportConnections(connections)` | Report agent integrations |
| `createCalendarEvent(event)` | Create a calendar event |
| `recordIdea(idea)` | Record an idea/inspiration |
| `reportMemoryHealth(report)` | Report memory health snapshot |

### Session Handoffs (3)

| Method | Description |
|--------|-------------|
| `createHandoff(handoff)` | Create a session handoff document |
| `getHandoffs(filters?)` | Get handoffs for this agent |
| `getLatestHandoff()` | Get the most recent handoff |

### Context Manager (7)

| Method | Description |
|--------|-------------|
| `captureKeyPoint(point)` | Capture a key point |
| `getKeyPoints(filters?)` | Get key points |
| `createThread(thread)` | Create a context thread |
| `addThreadEntry(threadId, content)` | Add entry to a thread |
| `closeThread(threadId, summary?)` | Close a thread |
| `getThreads(filters?)` | Get threads |
| `getContextSummary()` | Today's points + active threads |

### Automation Snippets (4)

| Method | Description |
|--------|-------------|
| `saveSnippet(snippet)` | Save/update a code snippet |
| `getSnippets(filters?)` | Search and list snippets |
| `useSnippet(snippetId)` | Mark snippet as used |
| `deleteSnippet(snippetId)` | Delete a snippet |

### User Preferences (6)

| Method | Description |
|--------|-------------|
| `logObservation(obs)` | Log a user observation |
| `setPreference(pref)` | Set a learned preference |
| `logMood(entry)` | Log user mood/energy |
| `trackApproach(entry)` | Track approach success/failure |
| `getPreferenceSummary()` | Get preference summary |
| `getApproaches(filters?)` | Get tracked approaches |

### Daily Digest (1)

| Method | Description |
|--------|-------------|
| `getDailyDigest(date?)` | Aggregated daily summary |

### Security Scanning (2)

| Method | Description |
|--------|-------------|
| `scanContent(text, destination?)` | Scan text for sensitive data |
| `reportSecurityFinding(text, dest?)` | Scan + store finding metadata |

### Agent Messaging (9)

| Method | Description |
|--------|-------------|
| `sendMessage(params)` | Send message to agent or broadcast |
| `getInbox(filters?)` | Get inbox messages |
| `markRead(messageIds)` | Mark messages as read |
| `archiveMessages(messageIds)` | Archive messages |
| `broadcast(params)` | Send to all agents in org |
| `createMessageThread(params)` | Start a conversation thread |
| `getMessageThreads(filters?)` | List message threads |
| `resolveMessageThread(threadId, summary?)` | Close a thread |
| `saveSharedDoc(params)` | Create/update shared document |

## Authentication

The SDK sends your API key via the `x-api-key` header. The key determines which organization's data you access.

```js
const claw = new DashClaw({
  baseUrl: 'https://your-deployment.vercel.app',
  apiKey: process.env.DASHCLAW_API_KEY,
  agentId: 'my-agent',
});
```

## License

MIT
