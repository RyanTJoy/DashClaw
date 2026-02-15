import json
import time
import urllib.parse
import urllib.request
import urllib.error
import base64
from datetime import datetime, timezone
from contextlib import contextmanager

class DashClawError(Exception):
    """Base error for DashClaw SDK."""
    def __init__(self, message, status=None, details=None):
        super().__init__(message)
        self.status = status
        self.details = details

class GuardBlockedError(DashClawError):
    """Thrown when behavior guard blocks an action."""
    def __init__(self, decision):
        reasons = "; ".join(decision.get("reasons", [])) or "no reason"
        message = f"Guard blocked action: {decision.get('decision')}. Reasons: {reasons}"
        super().__init__(message, status=403, details=decision)
        self.decision = decision.get("decision")
        self.reasons = decision.get("reasons", [])
        self.warnings = decision.get("warnings", [])
        self.matched_policies = decision.get("matched_policies", [])
        self.risk_score = decision.get("risk_score")

class ApprovalDeniedError(DashClawError):
    """Thrown when a human operator denies an action."""
    def __init__(self, message):
        super().__init__(message, status=403)

class DashClaw:
    def __init__(
        self,
        base_url,
        api_key,
        agent_id,
        agent_name=None,
        swarm_id=None,
        guard_mode="off",
        guard_callback=None,
        hitl_mode="off",
        private_key=None,
        auto_recommend="off",
        recommendation_confidence_min=70,
        recommendation_callback=None,
    ):
        self.base_url = base_url.rstrip("/")
        if not self.base_url.startswith("https://") and "localhost" not in self.base_url and "127.0.0.1" not in self.base_url:
            import warnings
            warnings.warn(
                "DashClaw: baseUrl does not use HTTPS. API keys will be sent in plaintext. Use HTTPS in production.",
                UserWarning,
                stacklevel=2,
            )
        self.api_key = api_key
        self.agent_id = agent_id
        self.agent_name = agent_name
        self.swarm_id = swarm_id
        self.guard_mode = guard_mode
        self.guard_callback = guard_callback
        self.hitl_mode = hitl_mode # "off" | "wait"
        self.private_key = private_key # cryptography.hazmat.primitives.asymmetric.rsa.RSAPrivateKey
        self.auto_recommend = auto_recommend
        try:
            self.recommendation_confidence_min = max(0, min(float(recommendation_confidence_min), 100))
        except Exception:
            self.recommendation_confidence_min = 70
        self.recommendation_callback = recommendation_callback

        if guard_mode not in ["off", "warn", "enforce"]:
            raise ValueError("guard_mode must be one of: off, warn, enforce")
        if auto_recommend not in ["off", "warn", "enforce"]:
            raise ValueError("auto_recommend must be one of: off, warn, enforce")

    def _request(self, path, method="GET", body=None):
        url = f"{self.base_url}{path}"
        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key
        }
        
        data = None
        if body is not None:
            data = json.dumps(body).encode("utf-8")

        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            try:
                error_data = json.loads(e.read().decode("utf-8"))
                message = error_data.get("error", str(e))
                details = error_data.get("details")
            except:
                message = str(e)
                details = None
            raise DashClawError(message, status=e.code, details=details)
        except Exception as e:
            raise DashClawError(f"Request failed: {str(e)}")

    def _guard_check(self, action_def):
        if self.guard_mode == "off":
            return

        context = {
            "action_type": action_def.get("action_type"),
            "risk_score": action_def.get("risk_score"),
            "systems_touched": action_def.get("systems_touched"),
            "reversible": action_def.get("reversible"),
            "declared_goal": action_def.get("declared_goal"),
        }

        try:
            decision = self.guard(context)
        except Exception as e:
            print(f"[DashClaw] Guard check failed (proceeding): {str(e)}")
            return

        if self.guard_callback:
            try:
                self.guard_callback(decision)
            except:
                pass

        is_blocked = decision.get("decision") in ["block", "require_approval"]

        if self.guard_mode == "warn" and is_blocked:
            reasons = "; ".join(decision.get("reasons", [])) or "no reason"
            print(f"[DashClaw] Guard {decision.get('decision')}: {reasons}. Proceeding in warn mode.")
            return

        if self.guard_mode == "enforce" and is_blocked:
            raise GuardBlockedError(decision)

    def _is_restrictive_decision(self, decision):
        return isinstance(decision, dict) and decision.get("decision") in ["block", "require_approval"]

    def _build_guard_context(self, action_def):
        return {
            "action_type": action_def.get("action_type"),
            "risk_score": action_def.get("risk_score"),
            "systems_touched": action_def.get("systems_touched"),
            "reversible": action_def.get("reversible"),
            "declared_goal": action_def.get("declared_goal"),
            "agent_id": self.agent_id,
        }

    def _report_recommendation_event(self, event):
        try:
            payload = dict(event or {})
            if "agent_id" not in payload or payload.get("agent_id") is None:
                payload["agent_id"] = self.agent_id
            self._request("/api/learning/recommendations/events", method="POST", body=payload)
        except Exception:
            # Telemetry should not break action flow.
            pass

    def _auto_recommend(self, action_def):
        if self.auto_recommend == "off" or not isinstance(action_def, dict) or not action_def.get("action_type"):
            return {"action": action_def, "recommendation": None, "adapted_fields": []}

        try:
            result = self.recommend_action(action_def)
        except Exception as e:
            print(f"[DashClaw] Recommendation fetch failed (proceeding): {str(e)}")
            return {"action": action_def, "recommendation": None, "adapted_fields": []}

        if self.recommendation_callback:
            try:
                self.recommendation_callback(result)
            except Exception:
                pass

        recommendation = result.get("recommendation")
        if not isinstance(recommendation, dict):
            return result

        confidence = recommendation.get("confidence")
        try:
            confidence = float(confidence if confidence is not None else 0)
        except Exception:
            confidence = 0

        if confidence < self.recommendation_confidence_min:
            override_reason = f"confidence_below_threshold:{confidence}<{self.recommendation_confidence_min}"
            self._report_recommendation_event({
                "recommendation_id": recommendation.get("id"),
                "event_type": "overridden",
                "details": {
                    "action_type": action_def.get("action_type"),
                    "reason": override_reason,
                },
            })
            return {
                **result,
                "action": {
                    **action_def,
                    "recommendation_id": recommendation.get("id"),
                    "recommendation_applied": False,
                    "recommendation_override_reason": override_reason,
                },
            }

        guard_decision = None
        try:
            guard_decision = self.guard(self._build_guard_context(result.get("action") or action_def))
        except Exception as e:
            print(f"[DashClaw] Recommendation guard probe failed: {str(e)}")

        if self._is_restrictive_decision(guard_decision):
            override_reason = f"guard_restrictive:{guard_decision.get('decision')}"
            self._report_recommendation_event({
                "recommendation_id": recommendation.get("id"),
                "event_type": "overridden",
                "details": {
                    "action_type": action_def.get("action_type"),
                    "reason": override_reason,
                },
            })
            return {
                **result,
                "action": {
                    **action_def,
                    "recommendation_id": recommendation.get("id"),
                    "recommendation_applied": False,
                    "recommendation_override_reason": override_reason,
                },
            }

        if self.auto_recommend == "warn":
            override_reason = "warn_mode_no_autoadapt"
            self._report_recommendation_event({
                "recommendation_id": recommendation.get("id"),
                "event_type": "overridden",
                "details": {
                    "action_type": action_def.get("action_type"),
                    "reason": override_reason,
                },
            })
            return {
                **result,
                "action": {
                    **action_def,
                    "recommendation_id": recommendation.get("id"),
                    "recommendation_applied": False,
                    "recommendation_override_reason": override_reason,
                },
            }

        self._report_recommendation_event({
            "recommendation_id": recommendation.get("id"),
            "event_type": "applied",
            "details": {
                "action_type": action_def.get("action_type"),
                "adapted_fields": result.get("adapted_fields", []),
                "confidence": confidence,
            },
        })

        return {
            **result,
            "action": {
                **(result.get("action") or action_def),
                "recommendation_id": recommendation.get("id"),
                "recommendation_applied": True,
                "recommendation_override_reason": None,
            },
        }

    # --- Category 1: Action Recording ---

    def _sign_payload(self, payload):
        """Sign payload using RSASSA-PKCS1-v1_5 (PKCS#1 v1.5) + SHA-256."""
        if not self.private_key:
            return None
        
        try:
            from cryptography.hazmat.primitives import hashes
            from cryptography.hazmat.primitives.asymmetric import padding
            
            # Canonical JSON: stable bytes (no whitespace, sorted keys) so server verification is deterministic.
            data = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
            signature = self.private_key.sign(
                data,
                padding.PKCS1v15(), # Matches RSASSA-PKCS1-v1_5 used in JS SDK
                hashes.SHA256()
            )
            return base64.b64encode(signature).decode("utf-8")
        except ImportError:
            print("[DashClaw] Warning: 'cryptography' library missing. Signatures will be skipped.")
            return None
        except Exception as e:
            print(f"[DashClaw] Failed to sign action: {str(e)}")
            return None

    def create_action(self, action_type, declared_goal, **kwargs):
        action_def = {
            "action_type": action_type,
            "declared_goal": declared_goal,
            **kwargs
        }
        recommendation_result = self._auto_recommend(action_def)
        final_action = recommendation_result.get("action") or action_def
        self._guard_check(final_action)
        
        payload = {
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "swarm_id": self.swarm_id,
            **final_action
        }

        signature = self._sign_payload(payload)
        if signature:
            payload["_signature"] = signature

        res = self._request("/api/actions", method="POST", body=payload)
        
        # Handle HITL Approval
        if res.get("action", {}).get("status") == "pending_approval" and self.hitl_mode == "wait":
            print(f"[DashClaw] Action {res.get('action_id')} requires human approval. Waiting...")
            return self.wait_for_approval(res.get("action_id"))
            
        return res

    def wait_for_approval(self, action_id, timeout=300, interval=5):
        """Poll for human approval of a pending action."""
        start_time = time.time()
        while (time.time() - start_time) < timeout:
            res = self.get_action(action_id)
            action = res.get("action", {})
            
            if action.get("status") == "running":
                print(f"[DashClaw] Action {action_id} approved by operator.")
                return res
                
            if action.get("status") in ["failed", "cancelled"]:
                raise ApprovalDeniedError(action.get("error_message") or "Operator denied the action.")
                
            time.sleep(interval)
            
        raise TimeoutError(f"[DashClaw] Timed out waiting for approval of action {action_id}")

    def update_outcome(self, action_id, status=None, **kwargs):
        payload = {
            "status": status,
            **kwargs
        }
        if "timestamp_end" not in payload:
            payload["timestamp_end"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        return self._request(f"/api/actions/{action_id}", method="PATCH", body=payload)

    def get_actions(self, **filters):
        query = urllib.parse.urlencode({k: v for k, v in filters.items() if v is not None})
        path = f"/api/actions?{query}" if query else "/api/actions"
        return self._request(path)

    def get_action(self, action_id):
        return self._request(f"/api/actions/{action_id}")

    def get_action_trace(self, action_id):
        return self._request(f"/api/actions/{action_id}/trace")

    # --- Category 12: Approvals ---

    def approve_action(self, action_id, decision, reasoning=None):
        if decision not in ["allow", "deny"]:
            raise ValueError("decision must be either 'allow' or 'deny'")

        payload = {"decision": decision}
        if reasoning is not None:
            payload["reasoning"] = reasoning

        return self._request(f"/api/actions/{action_id}/approve", method="POST", body=payload)

    def get_pending_approvals(self, limit=20, offset=0):
        return self.get_actions(status="pending_approval", limit=limit, offset=offset)

    @contextmanager
    def track(self, action_type, declared_goal, **kwargs):
        start_time = time.time()
        res = self.create_action(action_type, declared_goal, **kwargs)
        action_id = res.get("action_id")
        
        try:
            yield {"action_id": action_id}
            duration_ms = int((time.time() - start_time) * 1000)
            self.update_outcome(action_id, status="completed", duration_ms=duration_ms)
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            try:
                self.update_outcome(action_id, status="failed", duration_ms=duration_ms, error_message=str(e))
            except:
                pass
            raise

    # --- Category 2: Loops & Assumptions ---

    def register_open_loop(self, action_id, loop_type, description, **kwargs):
        payload = {
            "action_id": action_id,
            "loop_type": loop_type,
            "description": description,
            **kwargs
        }
        return self._request("/api/actions/loops", method="POST", body=payload)

    def resolve_open_loop(self, loop_id, status, resolution=None):
        payload = {"status": status, "resolution": resolution}
        return self._request(f"/api/actions/loops/{loop_id}", method="PATCH", body=payload)

    def get_open_loops(self, **filters):
        query = urllib.parse.urlencode({k: v for k, v in filters.items() if v is not None})
        path = f"/api/actions/loops?{query}" if query else "/api/actions/loops"
        return self._request(path)

    def register_assumption(self, action_id, assumption, **kwargs):
        payload = {
            "action_id": action_id,
            "assumption": assumption,
            **kwargs
        }
        return self._request("/api/actions/assumptions", method="POST", body=payload)

    def get_assumption(self, assumption_id):
        return self._request(f"/api/actions/assumptions/{assumption_id}")

    def validate_assumption(self, assumption_id, validated, invalidated_reason=None):
        payload = {"validated": validated}
        if invalidated_reason:
            payload["invalidated_reason"] = invalidated_reason
        return self._request(f"/api/actions/assumptions/{assumption_id}", method="PATCH", body=payload)

    def get_drift_report(self, **filters):
        filters["drift"] = "true"
        query = urllib.parse.urlencode({k: v for k, v in filters.items() if v is not None})
        return self._request(f"/api/actions/assumptions?{query}")

    # --- Category 3: Signals ---

    def get_signals(self):
        return self._request("/api/actions/signals")

    # --- Category 4: Dashboard Data ---

    def record_decision(self, decision, **kwargs):
        payload = {"decision": decision, "agent_id": self.agent_id, **kwargs}
        return self._request("/api/learning", method="POST", body=payload)

    def get_recommendations(
        self,
        action_type=None,
        limit=50,
        agent_id=None,
        include_inactive=False,
        track_events=True,
        include_metrics=False,
        lookback_days=None,
    ):
        params = {"agent_id": agent_id or self.agent_id, "limit": limit}
        if action_type is not None:
            params["action_type"] = action_type
        if include_inactive:
            params["include_inactive"] = "true"
        if track_events:
            params["track_events"] = "true"
        if include_metrics:
            params["include_metrics"] = "true"
        if lookback_days is not None:
            params["lookback_days"] = lookback_days
        query = urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
        return self._request(f"/api/learning/recommendations?{query}")

    def get_recommendation_metrics(
        self,
        action_type=None,
        limit=100,
        agent_id=None,
        include_inactive=False,
        lookback_days=30,
    ):
        params = {
            "agent_id": agent_id or self.agent_id,
            "limit": limit,
            "lookback_days": lookback_days,
        }
        if action_type is not None:
            params["action_type"] = action_type
        if include_inactive:
            params["include_inactive"] = "true"
        query = urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
        return self._request(f"/api/learning/recommendations/metrics?{query}")

    def record_recommendation_events(self, events):
        if isinstance(events, list):
            return self._request("/api/learning/recommendations/events", method="POST", body={"events": events})
        return self._request("/api/learning/recommendations/events", method="POST", body=events or {})

    def set_recommendation_active(self, recommendation_id, active):
        recommendation_id = urllib.parse.quote(str(recommendation_id), safe="")
        return self._request(
            f"/api/learning/recommendations/{recommendation_id}",
            method="PATCH",
            body={"active": bool(active)},
        )

    def rebuild_recommendations(
        self,
        action_type=None,
        lookback_days=30,
        min_samples=5,
        episode_limit=5000,
        action_id=None,
        agent_id=None,
    ):
        payload = {
            "agent_id": agent_id or self.agent_id,
            "action_type": action_type,
            "lookback_days": lookback_days,
            "min_samples": min_samples,
            "episode_limit": episode_limit,
            "action_id": action_id,
        }
        return self._request("/api/learning/recommendations", method="POST", body=payload)

    def recommend_action(self, action):
        if not isinstance(action, dict) or not action.get("action_type"):
            return {"action": action, "recommendation": None, "adapted_fields": []}

        response = self.get_recommendations(action_type=action.get("action_type"), limit=1)
        recommendations = response.get("recommendations", [])
        recommendation = recommendations[0] if recommendations else None
        if not recommendation:
            return {"action": action, "recommendation": None, "adapted_fields": []}

        adapted = dict(action)
        adapted_fields = []
        hints = recommendation.get("hints", {}) if isinstance(recommendation, dict) else {}

        risk_cap = hints.get("preferred_risk_cap")
        if isinstance(risk_cap, (int, float)):
            current = adapted.get("risk_score")
            if current is None or current > risk_cap:
                adapted["risk_score"] = risk_cap
                adapted_fields.append("risk_score")

        if hints.get("prefer_reversible") is True and adapted.get("reversible") is None:
            adapted["reversible"] = True
            adapted_fields.append("reversible")

        confidence_floor = hints.get("confidence_floor")
        if isinstance(confidence_floor, (int, float)):
            current = adapted.get("confidence")
            if current is None or current < confidence_floor:
                adapted["confidence"] = confidence_floor
                adapted_fields.append("confidence")

        return {
            "action": adapted,
            "recommendation": recommendation,
            "adapted_fields": adapted_fields,
        }

    def create_goal(self, title, **kwargs):
        payload = {"title": title, "agent_id": self.agent_id, **kwargs}
        return self._request("/api/goals", method="POST", body=payload)

    def record_content(self, title, **kwargs):
        payload = {"title": title, "agent_id": self.agent_id, **kwargs}
        return self._request("/api/content", method="POST", body=payload)

    def record_interaction(self, summary, **kwargs):
        payload = {"summary": summary, "agent_id": self.agent_id, **kwargs}
        return self._request("/api/relationships", method="POST", body=payload)

    def report_connections(self, connections):
        # connections: list of dicts with provider, auth_type, etc.
        formatted = []
        for c in connections:
            formatted.append({
                "provider": c.get("provider"),
                "auth_type": c.get("authType") or c.get("auth_type", "api_key"),
                "plan_name": c.get("planName") or c.get("plan_name"),
                "status": c.get("status", "active"),
                "metadata": c.get("metadata")
            })
        payload = {"agent_id": self.agent_id, "connections": formatted}
        return self._request("/api/agents/connections", method="POST", body=payload)

    def report_memory_health(self, health, entities=None, topics=None):
        if isinstance(health, dict) and "health" in health and entities is None and topics is None:
            payload = health
        else:
            payload = {"health": health, "entities": entities, "topics": topics}
        return self._request("/api/memory", method="POST", body=payload)

    # --- Category 5: Session Handoffs ---

    def create_handoff(self, summary, **kwargs):
        payload = {"summary": summary, "agent_id": self.agent_id, **kwargs}
        return self._request("/api/handoffs", method="POST", body=payload)

    def get_handoffs(self, **filters):
        filters["agent_id"] = self.agent_id
        query = urllib.parse.urlencode({k: v for k, v in filters.items() if v is not None})
        return self._request(f"/api/handoffs?{query}")

    def get_latest_handoff(self):
        return self._request(f"/api/handoffs?agent_id={self.agent_id}&latest=true")

    # --- Category 6: Context Manager ---

    def capture_key_point(self, content, **kwargs):
        payload = {"content": content, "agent_id": self.agent_id, **kwargs}
        return self._request("/api/context/points", method="POST", body=payload)

    def get_key_points(self, **filters):
        filters["agent_id"] = self.agent_id
        query = urllib.parse.urlencode({k: v for k, v in filters.items() if v is not None})
        return self._request(f"/api/context/points?{query}")

    def create_thread(self, name, **kwargs):
        payload = {"name": name, "agent_id": self.agent_id, **kwargs}
        return self._request("/api/context/threads", method="POST", body=payload)

    def add_thread_entry(self, thread_id, content, entry_type="note"):
        payload = {"content": content, "entry_type": entry_type}
        return self._request(f"/api/context/threads/{thread_id}/entries", method="POST", body=payload)

    def close_thread(self, thread_id, summary=None):
        payload = {"status": "closed"}
        if summary:
            payload["summary"] = summary
        return self._request(f"/api/context/threads/{thread_id}", method="PATCH", body=payload)

    def get_threads(self, status=None, limit=None):
        params = {"agent_id": self.agent_id}
        if status is not None:
            params["status"] = status
        if limit is not None:
            params["limit"] = limit
        query = urllib.parse.urlencode(params)
        return self._request(f"/api/context/threads?{query}")

    def get_context_summary(self):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        points_result = self.get_key_points(session_date=today)
        threads_result = self.get_threads(status="active")
        return {
            "points": points_result.get("points", []),
            "threads": threads_result.get("threads", []),
        }

    # --- Category 7: Automation Snippets ---

    def save_snippet(self, name, code, **kwargs):
        payload = {"name": name, "code": code, "agent_id": self.agent_id, **kwargs}
        return self._request("/api/snippets", method="POST", body=payload)

    def get_snippets(self, **filters):
        params = {k: v for k, v in filters.items() if v is not None}
        query = urllib.parse.urlencode(params)
        return self._request(f"/api/snippets?{query}")

    def get_snippet(self, snippet_id):
        snippet_id = urllib.parse.quote(str(snippet_id), safe="")
        return self._request(f"/api/snippets/{snippet_id}")

    def use_snippet(self, snippet_id):
        snippet_id = urllib.parse.quote(str(snippet_id), safe="")
        return self._request(f"/api/snippets/{snippet_id}/use", method="POST")

    def delete_snippet(self, snippet_id):
        snippet_id = urllib.parse.quote(str(snippet_id), safe="")
        return self._request(f"/api/snippets?id={snippet_id}", method="DELETE")

    # --- Category 11: Agent Messaging ---

    def send_message(self, body, to=None, message_type="info", **kwargs):
        payload = {
            "from_agent_id": self.agent_id,
            "to_agent_id": to,
            "message_type": message_type,
            "body": body,
            **kwargs
        }
        return self._request("/api/messages", method="POST", body=payload)

    def get_inbox(self, **filters):
        filters["agent_id"] = self.agent_id
        filters["direction"] = "inbox"
        query = urllib.parse.urlencode({k: v for k, v in filters.items() if v is not None})
        return self._request(f"/api/messages?{query}")

    def mark_read(self, message_ids):
        return self._request("/api/messages", method="PATCH", body={
            "message_ids": message_ids,
            "action": "read",
            "agent_id": self.agent_id,
        })

    def archive_messages(self, message_ids):
        return self._request("/api/messages", method="PATCH", body={
            "message_ids": message_ids,
            "action": "archive",
            "agent_id": self.agent_id,
        })

    def broadcast(self, body, message_type="info", subject=None, thread_id=None):
        return self.send_message(
            body=body,
            to=None,
            message_type=message_type,
            subject=subject,
            thread_id=thread_id,
        )

    def create_message_thread(self, name, participants=None):
        return self._request("/api/messages/threads", method="POST", body={
            "name": name,
            "participants": participants,
            "created_by": self.agent_id,
        })

    def get_message_threads(self, status=None, limit=None):
        params = {"agent_id": self.agent_id}
        if status is not None:
            params["status"] = status
        if limit is not None:
            params["limit"] = limit
        query = urllib.parse.urlencode(params)
        return self._request(f"/api/messages/threads?{query}")

    def resolve_message_thread(self, thread_id, summary=None):
        return self._request("/api/messages/threads", method="PATCH", body={
            "thread_id": thread_id,
            "status": "resolved",
            "summary": summary,
        })

    def save_shared_doc(self, name, content):
        return self._request("/api/messages/docs", method="POST", body={
            "name": name,
            "content": content,
            "agent_id": self.agent_id,
        })

    # --- Category 13: Behavior Guard ---

    def guard(self, context, include_signals=False):
        params = {"include_signals": "true"} if include_signals else {}
        query = urllib.parse.urlencode(params)
        path = f"/api/guard?{query}" if query else "/api/guard"
        body = {**context, "agent_id": context.get("agent_id", self.agent_id)}
        return self._request(path, method="POST", body=body)

    def get_guard_decisions(self, decision=None, limit=20, offset=0, agent_id=None):
        params = {
            "agent_id": agent_id or self.agent_id,
            "limit": limit,
            "offset": offset,
        }
        if decision:
            params["decision"] = decision
        query = urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
        return self._request(f"/api/guard?{query}")

    # --- Category 14: Webhooks ---

    def get_webhooks(self):
        return self._request("/api/webhooks")

    def create_webhook(self, url, events=None):
        payload = {"url": url}
        if events is not None:
            payload["events"] = events
        return self._request("/api/webhooks", method="POST", body=payload)

    def delete_webhook(self, webhook_id):
        webhook_id = urllib.parse.quote(str(webhook_id), safe="")
        return self._request(f"/api/webhooks?id={webhook_id}", method="DELETE")

    def test_webhook(self, webhook_id):
        return self._request(f"/api/webhooks/{webhook_id}/test", method="POST")

    def get_webhook_deliveries(self, webhook_id):
        return self._request(f"/api/webhooks/{webhook_id}/deliveries")

    # --- Category 14: Policy Testing ---

    def test_policies(self):
        """Run guardrails tests against all active policies."""
        return self._request("/api/policies/test", method="POST", body={
            "agent_id": self.agent_id,
        })

    def get_proof_report(self, format="json"):
        """Generate a compliance proof report from active policies."""
        params = {"format": format} if format else {}
        query = urllib.parse.urlencode(params)
        return self._request(f"/api/policies/proof?{query}")

    def import_policies(self, pack=None, yaml=None):
        """Import a policy pack or raw YAML. Requires admin role."""
        payload = {}
        if pack is not None:
            payload["pack"] = pack
        if yaml is not None:
            payload["yaml"] = yaml
        return self._request("/api/policies/import", method="POST", body=payload)

    # --- Category 15: Compliance Engine ---

    def map_compliance(self, framework):
        """Map active policies to a compliance framework's controls."""
        framework_enc = urllib.parse.quote(str(framework), safe="")
        return self._request(f"/api/compliance/map?framework={framework_enc}")

    def analyze_gaps(self, framework):
        """Run gap analysis on a compliance framework mapping."""
        framework_enc = urllib.parse.quote(str(framework), safe="")
        return self._request(f"/api/compliance/gaps?framework={framework_enc}")

    def get_compliance_report(self, framework, format="json"):
        """Generate a full compliance report and save a snapshot."""
        params = {"framework": framework}
        if format:
            params["format"] = format
        query = urllib.parse.urlencode(params)
        return self._request(f"/api/compliance/report?{query}")

    def list_frameworks(self):
        """List available compliance frameworks."""
        return self._request("/api/compliance/frameworks")

    def get_compliance_evidence(self, window="30d"):
        """Get live compliance evidence from guard decisions and actions."""
        params = {"window": window} if window else {}
        query = urllib.parse.urlencode(params)
        return self._request(f"/api/compliance/evidence?{query}")

    # --- Category 16: Task Routing ---

    def list_routing_agents(self, status=None):
        """List routing agents registered in this org."""
        params = {}
        if status is not None:
            params["status"] = status
        query = urllib.parse.urlencode(params)
        path = f"/api/routing/agents?{query}" if query else "/api/routing/agents"
        return self._request(path)

    def register_routing_agent(self, name, capabilities=None, max_concurrent=3, endpoint=None):
        """Register an agent for task routing."""
        payload = {"name": name, "maxConcurrent": max_concurrent}
        if capabilities is not None:
            payload["capabilities"] = capabilities
        if endpoint is not None:
            payload["endpoint"] = endpoint
        return self._request("/api/routing/agents", method="POST", body=payload)

    def get_routing_agent(self, agent_id):
        """Get a single routing agent by ID."""
        agent_id = urllib.parse.quote(str(agent_id), safe="")
        return self._request(f"/api/routing/agents/{agent_id}")

    def update_routing_agent_status(self, agent_id, status):
        """Update routing agent status (available, busy, offline)."""
        agent_id = urllib.parse.quote(str(agent_id), safe="")
        return self._request(f"/api/routing/agents/{agent_id}", method="PATCH", body={"status": status})

    def delete_routing_agent(self, agent_id):
        """Unregister (delete) a routing agent."""
        agent_id = urllib.parse.quote(str(agent_id), safe="")
        return self._request(f"/api/routing/agents/{agent_id}", method="DELETE")

    def list_routing_tasks(self, status=None, assigned_to=None, limit=None):
        """List routing tasks with optional filters."""
        params = {}
        if status is not None:
            params["status"] = status
        if assigned_to is not None:
            params["assigned_to"] = assigned_to
        if limit is not None:
            params["limit"] = limit
        query = urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
        path = f"/api/routing/tasks?{query}" if query else "/api/routing/tasks"
        return self._request(path)

    def submit_routing_task(self, title, description=None, required_skills=None, urgency="normal",
                           timeout_seconds=3600, max_retries=2, callback_url=None):
        """Submit a task for auto-routing to the best available agent."""
        payload = {"title": title, "urgency": urgency, "timeoutSeconds": timeout_seconds, "maxRetries": max_retries}
        if description is not None:
            payload["description"] = description
        if required_skills is not None:
            payload["requiredSkills"] = required_skills
        if callback_url is not None:
            payload["callbackUrl"] = callback_url
        return self._request("/api/routing/tasks", method="POST", body=payload)

    def complete_routing_task(self, task_id, success=True, result=None, error=None):
        """Complete a routing task."""
        task_id = urllib.parse.quote(str(task_id), safe="")
        payload = {"success": success}
        if result is not None:
            payload["result"] = result
        if error is not None:
            payload["error"] = error
        return self._request(f"/api/routing/tasks/{task_id}/complete", method="POST", body=payload)

    def get_routing_stats(self):
        """Get routing statistics for the org."""
        return self._request("/api/routing/stats")

    def get_routing_health(self):
        """Get routing system health status."""
        return self._request("/api/routing/health")

    # --- Bulk Sync ---

    def sync_state(self, state):
        payload = {"agent_id": self.agent_id, **state}
        return self._request("/api/sync", method="POST", body=payload)

# Backward compatibility alias (Legacy)
OpenClawAgent = DashClaw
