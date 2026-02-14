import json
import pathlib
import sys
import unittest
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[2]
FIXTURE_PATH = ROOT / "docs" / "sdk-critical-contract-harness.json"
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
        self.calls.append({"path": path, "method": method, "body": body})
        return {"ok": True}


def normalize_call(call):
    parsed = urllib.parse.urlsplit(call["path"])
    query = sorted([list(item) for item in urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)])
    body = call.get("body")

    if isinstance(body, dict) and isinstance(body.get("timestamp_end"), str):
        body = {**body, "timestamp_end": "<timestamp>"}

    return {
        "method": str(call.get("method", "")).upper(),
        "pathname": parsed.path,
        "query": query,
        "body": body if body is not None else None,
    }


class WS5M4IntegrationHarnessTests(unittest.TestCase):
    def test_python_sdk_matches_shared_contract_harness(self):
        expected_entries = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
        expected = {entry["id"]: entry["call"] for entry in expected_entries}

        client = RecordingDashClaw()

        cases = [
            ("create_action", lambda: client.create_action(action_type="deploy", declared_goal="Ship release", risk_score=40)),
            ("update_outcome", lambda: client.update_outcome("act_1", status="completed", output_summary="done")),
            ("get_actions", lambda: client.get_actions(status="running", limit=5, offset=0)),
            ("get_action", lambda: client.get_action("act_1")),
            ("guard", lambda: client.guard({"action_type": "deploy", "risk_score": 55}, include_signals=True)),
            ("get_guard_decisions", lambda: client.get_guard_decisions(decision="warn", limit=5, offset=1)),
            (
                "report_memory_health",
                lambda: client.report_memory_health(
                    {
                        "health": {"score": 88},
                        "entities": [{"name": "Repo"}],
                        "topics": [{"name": "Ops"}],
                    }
                ),
            ),
            ("close_thread", lambda: client.close_thread("ct_1", summary="done")),
            ("get_threads", lambda: client.get_threads(status="active", limit=10)),
            ("mark_read", lambda: client.mark_read(["msg_1"])),
            ("archive_messages", lambda: client.archive_messages(["msg_2"])),
            (
                "broadcast",
                lambda: client.broadcast(
                    body="status update",
                    message_type="status",
                    subject="daily",
                    thread_id="mt_1",
                ),
            ),
            ("create_message_thread", lambda: client.create_message_thread("Coordination", participants=["agent-1", "agent-2"])),
            ("get_message_threads", lambda: client.get_message_threads(status="open", limit=5)),
            ("resolve_message_thread", lambda: client.resolve_message_thread("mt_1", summary="resolved")),
            ("save_shared_doc", lambda: client.save_shared_doc("Ops Runbook", "v1")),
            ("sync_state", lambda: client.sync_state({"goals": [{"title": "Ship release"}]})),
        ]

        seen = set()
        for case_id, fn in cases:
            before = len(client.calls)
            fn()
            self.assertGreater(len(client.calls), before, msg=f"no call captured for case {case_id}")

            normalized = normalize_call(client.calls[-1])
            self.assertIn(case_id, expected, msg=f"missing fixture case: {case_id}")
            self.assertEqual(expected[case_id], normalized, msg=f"contract mismatch for {case_id}")
            seen.add(case_id)

        self.assertEqual(set(expected.keys()), seen, msg="fixture and Python case sets differ")


if __name__ == "__main__":
    unittest.main()
