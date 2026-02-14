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

- Node public methods: `60+`
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

## WS5 M4 Cross-SDK Integration Suite (February 14, 2026)

Cross-SDK critical-domain contract coverage is now validated against a shared harness:

- Shared fixture: `docs/sdk-critical-contract-harness.json`
- Node harness runner: `scripts/check-sdk-cross-integration.mjs` (`npm run sdk:integration`)
- Python harness test: `sdk-python/tests/test_ws5_m4_integration.py` (`npm run sdk:integration:python`)
- CI workflow steps: `.github/workflows/ci.yml` (`Run cross-SDK integration suite`, `Run cross-SDK Python contract suite`)

Current shared contract cases covered by the harness:

- `create_action`
- `update_outcome`
- `get_actions`
- `get_action`
- `guard`
- `get_guard_decisions`
- `report_memory_health`
- `close_thread`
- `get_threads`
- `mark_read`
- `archive_messages`
- `broadcast`
- `create_message_thread`
- `get_message_threads`
- `resolve_message_thread`
- `save_shared_doc`
- `sync_state`

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
- Critical-domain payload/path contract parity is validated by the shared integration harness listed above.
- Non-critical category gaps (snippets/preferences/digest/security scanning + selected dashboard-data methods) remain intentionally out-of-scope for WS5 M2-M4.

## Version Compatibility Policy

- Compatibility guarantee scope:
  - Node `sdk/dashclaw.js` and Python `sdk-python/dashclaw/client.py` remain contract-compatible for the WS5 critical domains listed in the integration harness.
- Breaking changes policy:
  - Any critical-domain request-path or payload-shape breaking change requires:
    - RFC entry in `docs/rfcs/`
    - parity harness update
    - release note entry in `docs/releases/`
- Support floor:
  - Node SDK requires Node 18+.
  - Python SDK supports Python 3.7+.
