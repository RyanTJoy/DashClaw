---
source-of-truth: true
owner: Platform PM
last-verified: 2026-02-14
doc-type: rfc
---

# RFC: Adaptive Learning Loop MVP

- RFC ID: RFC-2026-02-14-adaptive-learning-loop-mvp
- Status: Approved and implemented (MVP slice)
- Date: February 14, 2026
- Horizon: 2 weeks

## 1. Objective

Implement a lightweight adaptive loop so agent behavior improves from observed outcomes without introducing full RL infrastructure.

MVP outcome:
- Score completed agent actions as learning episodes.
- Synthesize per-agent/per-action-type recommendations from historical high-performing episodes.
- Expose recommendations via API and SDKs.

## 2. Non-Goals (MVP)

- No online policy gradient or runtime model fine-tuning.
- No automated prompt mutation pipeline.
- No cross-org learning transfer.
- No breaking changes to existing action/learning APIs.

## 3. Design Summary

The MVP introduces two new data planes:
1. `learning_episodes`: normalized, scored trajectory outcomes for actions.
2. `learning_recommendations`: synthesized hints derived from top-scoring episodes.

Flow:
1. Agent updates an action outcome (`PATCH /api/actions/{actionId}`).
2. Server computes an episode score from outcome/risk/reversibility/loops/assumptions.
3. Episode is upserted into `learning_episodes`.
4. Rebuild API synthesizes recommendations from recent episodes.
5. SDK methods fetch/rebuild/apply hints before future actions.

## 4. Schema Changes

Migration script:
- `scripts/migrate-learning-loop-mvp.mjs`

New tables:
- `learning_episodes`
  - Keys: `id` (PK), unique `(org_id, action_id)`
  - Core fields: `agent_id`, `action_type`, `status`, `outcome_label`, `risk_score`, `reversible`, `confidence`, `duration_ms`, `cost_estimate`
  - Diagnostics: `invalidated_assumptions`, `open_loops`, `score`, `score_breakdown`
  - Timestamps: `created_at`, `updated_at`
- `learning_recommendations`
  - Keys: `id` (PK), unique `(org_id, agent_id, action_type)`
  - Core fields: `confidence`, `sample_size`, `top_sample_size`, `success_rate`, `avg_score`
  - Recommendation payloads: `hints` (JSON string), `guidance` (JSON string)
  - Timestamps: `computed_at`, `updated_at`

Indexes:
- `learning_episodes(org_id, agent_id, action_type)`
- `learning_episodes(updated_at)`
- `learning_recommendations(org_id, agent_id)`

## 5. API Changes

### Existing Endpoint Extension

- `PATCH /api/actions/{actionId}`
  - Existing contract unchanged.
  - New side effect: best-effort episode scoring and upsert into `learning_episodes`.

### New Endpoint

- `GET /api/learning/recommendations`
  - Query: `agent_id?`, `action_type?`, `limit?`
  - Returns: recommendation rows with `hints` + `guidance`.

- `POST /api/learning/recommendations`
  - Body: `agent_id?`, `action_type?`, `lookback_days?`, `episode_limit?`, `min_samples?`, `action_id?`
  - Behavior:
    - Optional `action_id` pre-score before rebuild.
    - Rebuild recommendations from filtered recent episodes.
  - Returns: rebuild summary + recommendation rows.

## 6. SDK Changes

Node SDK (`sdk/dashclaw.js`):
- `getRecommendations(filters?)`
- `rebuildRecommendations(options?)`
- `recommendAction(action)`

Python SDK (`sdk-python/dashclaw/client.py`):
- `get_recommendations(...)`
- `rebuild_recommendations(...)`
- `recommend_action(action)`

## 7. Scoring Heuristic (MVP)

Episode score range: `0..100`.

Signals used:
- Outcome status (`completed` vs `failed`/`cancelled`)
- Risk score
- Reversibility
- Duration and cost
- Confidence calibration
- Invalidated assumptions
- Open loops

This is deliberately deterministic and auditable for v1.

## 8. Rollout Plan

1. Run `npm run migrate:learning-loop` in each environment.
2. Deploy API + SDK changes.
3. Backfill episodes passively as actions complete.
4. Trigger recommendation rebuild job on schedule (or manually via POST endpoint).

## 9. Acceptance Criteria

- Action outcome updates produce `learning_episodes` rows.
- Recommendation rebuild returns non-empty rows for agents with sufficient history.
- SDKs can fetch and apply hints with no breaking API changes.
- Unit tests cover scoring and recommendation synthesis behavior.

## 10. Risks and Mitigations

- Sparse data yields weak recommendations.
  - Mitigation: `min_samples` threshold + confidence scaling + explicit guidance note.
- Heuristic bias from simplistic scoring.
  - Mitigation: store `score_breakdown` for audit and tuning.
- Runtime overhead on action PATCH.
  - Mitigation: single best-effort scoring pass; failure does not block action update.

