---
source-of-truth: false
owner: SDK Lead
last-verified: 2026-02-14
doc-type: architecture
---

# SDK Parity Matrix (Node vs Python)

Baseline parity for critical SDK capabilities, derived from:

- `sdk/dashclaw.js`
- `sdk-python/dashclaw/client.py`

## Snapshot Summary

- Node public methods: `59`
- Python public methods: `50`
- Current parity (method-level, normalized by Node surface): `85%`

## WS5 M2 Critical Domain Delta (February 14, 2026)

Python SDK additions shipped for critical domains:

- Actions/Approvals:
  - `approve_action`
  - `get_pending_approvals`
- Guard:
  - `get_guard_decisions`
- Webhooks:
  - `get_webhooks`
  - `create_webhook`
  - `delete_webhook`
  - `test_webhook`
  - `get_webhook_deliveries`

Validation coverage:

- `sdk-python/tests/test_ws5_m2_parity.py`

## WS5 M3 Context/Memory/Messages Delta (February 14, 2026)

Python SDK additions shipped for WS5 M3 domains:

- Context:
  - `close_thread`
  - `get_threads`
  - `get_context_summary`
- Messages:
  - `mark_read`
  - `archive_messages`
  - `broadcast`
  - `create_message_thread`
  - `get_message_threads`
  - `resolve_message_thread`
  - `save_shared_doc`
- Memory:
  - `report_memory_health` now accepts both composed report payload and split arguments.

Validation coverage:

- `sdk-python/tests/test_ws5_m3_parity.py`

## Category Matrix

| Category | Node | Python | Status |
|---|---:|---:|---|
| Action Recording | 7 | 7 | Full parity |
| Loops & Assumptions | 7 | 7 | Full parity |
| Signals | 1 | 1 | Full parity |
| Dashboard Data | 9 | 6 | Partial parity |
| Session Handoffs | 3 | 3 | Full parity |
| Context Manager | 7 | 7 | Full parity |
| Automation Snippets | 4 | 0 | Missing in Python |
| User Preferences | 6 | 0 | Missing in Python |
| Daily Digest | 1 | 0 | Missing in Python |
| Security Scanning | 2 | 0 | Missing in Python |
| Agent Messaging | 9 | 9 | Full parity |
| Behavior Guard | 2 | 2 | Full parity |
| Bulk Sync | 1 | 1 | Full parity |

## Confirmed Missing Python Methods

- Dashboard Data:
  - `reportTokenUsage`
  - `createCalendarEvent`
  - `recordIdea`
- Automation Snippets:
  - `saveSnippet`
  - `getSnippets`
  - `useSnippet`
  - `deleteSnippet`
- User Preferences:
  - `logObservation`
  - `setPreference`
  - `logMood`
  - `trackApproach`
  - `getPreferenceSummary`
  - `getApproaches`
- Daily Digest:
  - `getDailyDigest`
- Security Scanning:
  - `scanContent`
  - `reportSecurityFinding`
- Behavior Guard:
  - None

## Notes

- Python method naming uses `snake_case`; Node uses `camelCase`.
- This matrix tracks method availability only; it does not yet validate payload or response parity.
- WS5 M4 remains open for cross-SDK integration suite coverage and release documentation finalization.
