import json
import time
import urllib.parse
import urllib.request
import urllib.error
import base64
from datetime import datetime
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
    def __init__(self, base_url, api_key, agent_id, agent_name=None, swarm_id=None, guard_mode="off", guard_callback=None, hitl_mode="off", private_key=None):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.agent_id = agent_id
        self.agent_name = agent_name
        self.swarm_id = swarm_id
        self.guard_mode = guard_mode
        self.guard_callback = guard_callback
        self.hitl_mode = hitl_mode # "off" | "wait"
        self.private_key = private_key # cryptography.hazmat.primitives.asymmetric.rsa.RSAPrivateKey

        if guard_mode not in ["off", "warn", "enforce"]:
            raise ValueError("guard_mode must be one of: off, warn, enforce")

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

    # --- Category 1: Action Recording ---

    def _sign_payload(self, payload):
        """Sign payload using RSA-PSS SHA-256."""
        if not self.private_key:
            return None
        
        try:
            from cryptography.hazmat.primitives import hashes
            from cryptography.hazmat.primitives.asymmetric import padding
            
            data = json.dumps(payload, sort_keys=True).encode("utf-8")
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
        self._guard_check(action_def)
        
        payload = {
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "swarm_id": self.swarm_id,
            **action_def
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
            payload["timestamp_end"] = datetime.utcnow().isoformat() + "Z"
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
        today = datetime.utcnow().strftime("%Y-%m-%d")
        points_result = self.get_key_points(session_date=today)
        threads_result = self.get_threads(status="active")
        return {
            "points": points_result.get("points", []),
            "threads": threads_result.get("threads", []),
        }

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

    # --- Bulk Sync ---

    def sync_state(self, state):
        payload = {"agent_id": self.agent_id, **state}
        return self._request("/api/sync", method="POST", body=payload)

# Backward compatibility alias (Legacy)
OpenClawAgent = DashClaw
