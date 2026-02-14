#!/usr/bin/env python3
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "sdk-python"))

from dashclaw.client import DashClaw  # noqa: E402


class RecordingDashClaw(DashClaw):
    def __init__(self):
        super().__init__(
            base_url="https://example.test",
            api_key="test-key",
            agent_id="agent-1",
            agent_name="Agent One",
        )
        self.calls = []

    def _request(self, path, method="GET", body=None):
        call = {"path": path, "method": method, "body": body}
        self.calls.append(call)
        return {"ok": True}


def run():
    client = RecordingDashClaw()
    results = []

    def capture(case_id, fn):
        before = len(client.calls)
        fn()
        if len(client.calls) <= before:
            raise RuntimeError(f"no call captured for case: {case_id}")
        results.append({"id": case_id, "call": client.calls[-1]})

    capture(
        "create_action",
        lambda: client.create_action(
            action_type="deploy",
            declared_goal="Ship release",
            risk_score=40,
        ),
    )
    capture(
        "update_outcome",
        lambda: client.update_outcome(
            "act_1",
            status="completed",
            output_summary="done",
        ),
    )
    capture("get_actions", lambda: client.get_actions(status="running", limit=5, offset=0))
    capture("get_action", lambda: client.get_action("act_1"))
    capture(
        "guard",
        lambda: client.guard({"action_type": "deploy", "risk_score": 55}, include_signals=True),
    )
    capture(
        "get_guard_decisions",
        lambda: client.get_guard_decisions(decision="warn", limit=5, offset=1),
    )
    capture(
        "report_memory_health",
        lambda: client.report_memory_health(
            {
                "health": {"score": 88},
                "entities": [{"name": "Repo"}],
                "topics": [{"name": "Ops"}],
            }
        ),
    )
    capture("close_thread", lambda: client.close_thread("ct_1", summary="done"))
    capture("get_threads", lambda: client.get_threads(status="active", limit=10))
    capture("mark_read", lambda: client.mark_read(["msg_1"]))
    capture("archive_messages", lambda: client.archive_messages(["msg_2"]))
    capture(
        "broadcast",
        lambda: client.broadcast(
            body="status update",
            message_type="status",
            subject="daily",
            thread_id="mt_1",
        ),
    )
    capture(
        "create_message_thread",
        lambda: client.create_message_thread("Coordination", participants=["agent-1", "agent-2"]),
    )
    capture("get_message_threads", lambda: client.get_message_threads(status="open", limit=5))
    capture(
        "resolve_message_thread",
        lambda: client.resolve_message_thread("mt_1", summary="resolved"),
    )
    capture(
        "save_shared_doc",
        lambda: client.save_shared_doc(name="Ops Runbook", content="v1"),
    )
    capture(
        "sync_state",
        lambda: client.sync_state({"goals": [{"title": "Ship release"}]}),
    )

    print(json.dumps(results))


if __name__ == "__main__":
    run()
