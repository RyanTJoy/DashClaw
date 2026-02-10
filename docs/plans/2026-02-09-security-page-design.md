# Security Page + Global Agent Filter — Design

**Date**: 2026-02-09
**Status**: Pending approval

## Goal

Add a security observability page for agent operators to monitor agent behavior risks, plus extend the agent filter globally across all data pages.

## Decisions Made

- **Audience**: Agent operators (not platform admins)
- **Data source**: Surface existing data only — no new tables, no new API routes, no SDK changes
- **Drill-down**: Slide-out panel (right-side drawer) for detail without losing page context
- **Agent filter**: Persistent across pages — lifted to SessionWrapper

## Scope

### 1. Security Page (`/security`)

**Route**: `/security` — new page, protected (added to middleware matcher)

**Components**:
- `app/security/page.js` — client component, main page
- `app/components/SecurityDetailPanel.js` — slide-out detail drawer

**Layout — 3 zones**:

| Zone | Content | Data Source |
|---|---|---|
| Stats bar (top) | Total Signals, High-Risk Actions (24h), Unscoped Actions, Invalidated Assumptions (7d) | `/api/actions/signals` + `/api/actions` + `/api/actions/assumptions` |
| Signal feed (left ~60%) | Active risk signals sorted by severity (red first), grouped by type. Shows: severity badge, signal type, agent name, detail, timestamp | `/api/actions/signals` |
| High-risk actions (right ~40%) | Actions where risk_score >= 70 OR (authorization_scope is null AND reversible = 0). Shows: agent, action type, risk score badge, goal | `/api/actions` (client-side filter) |

**Clicking any row** opens SecurityDetailPanel:

For a risk signal:
- Signal type + severity badge (red/amber)
- Help text
- Agent name + color dot
- Detail text
- Related action(s) — clickable
- Link to full post-mortem page

For a high-risk action:
- Action type icon + status badge
- Agent name + color dot
- Goal, reasoning, systems touched
- Risk score (visual bar, colored by severity)
- Authorization scope (or "None — unscoped" warning)
- Reversible badge
- Side effects
- Related assumptions (validated/invalidated status)
- Related open loops
- Link to post-mortem page

**Panel behavior**: Click outside or Escape to close. One panel at a time. Slide animation from right.

### 2. Global Agent Filter Lift

**Change**: Move `AgentFilterProvider` from `dashboard/page.js` into `SessionWrapper.js`

**Why SessionWrapper**: Already a client component wrapping all pages in root layout. Provider handles errors gracefully — on landing page, `/api/agents` fetch fails, agents stays `[]`, dropdown renders nothing.

**Files changed**:
- `app/components/SessionWrapper.js` — wrap children with `AgentFilterProvider`
- `app/dashboard/page.js` — remove local `AgentFilterProvider` wrapper

**Result**: `AgentFilterDropdown` (already in PageLayout header) starts working on all pages automatically. Filter state persists across navigation.

### 3. Agent Filtering on Existing Pages (6 pages)

Each page reads `useAgentFilter()` and passes `agentId` to fetch calls.

| Page | Fetch endpoint | Filter param |
|---|---|---|
| Security | `/api/actions/signals`, `/api/actions`, `/api/actions/assumptions` | `?agent_id=X` (signals already support it; actions/assumptions need verification) |
| Content | `/api/content` | `?agent_id=X` |
| Relationships | `/api/relationships` | `?agent_id=X` |
| Learning | `/api/learning` | `?agent_id=X` |
| Goals | `/api/goals` | `?agent_id=X` |
| Workflows | `/api/workflows` | `?agent_id=X` |

**API side**: Verify each GET endpoint supports `?agent_id=X`. Add `WHERE agent_id = $X` clause to any that don't. Most already have org_id filtering patterns to follow.

### 4. Sidebar Update

Add Security link under Operations group:
```js
{ href: '/security', icon: ShieldAlert, label: 'Security' }
```
`ShieldAlert` is already imported in Sidebar.js but unused.

### 5. Middleware Update

Add `/security` to the protected routes matcher in `middleware.js`.

## Files Created

| File | Purpose |
|---|---|
| `app/security/page.js` | Security page (client component) |
| `app/components/SecurityDetailPanel.js` | Slide-out detail panel |

## Files Modified

| File | Change |
|---|---|
| `app/components/SessionWrapper.js` | Wrap children with AgentFilterProvider |
| `app/dashboard/page.js` | Remove local AgentFilterProvider |
| `app/components/Sidebar.js` | Add Security nav item |
| `middleware.js` | Add /security to protected routes |
| `app/content/page.js` | Add useAgentFilter + pass to fetch |
| `app/relationships/page.js` | Add useAgentFilter + pass to fetch |
| `app/learning/page.js` | Add useAgentFilter + pass to fetch |
| `app/goals/page.js` | Add useAgentFilter + pass to fetch |
| `app/workflows/page.js` | Add useAgentFilter + pass to fetch |
| API routes (as needed) | Add ?agent_id query param support |

## Build Sequence

1. Lift AgentFilterProvider to SessionWrapper, remove from dashboard
2. Add /security to Sidebar + middleware
3. Build SecurityDetailPanel component
4. Build Security page
5. Wire agent filtering into existing 5 pages (+ verify API support)
6. Test: dev server, all pages load, filter persists across navigation
