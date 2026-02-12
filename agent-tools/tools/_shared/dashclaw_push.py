"""
DashClaw API Push Module
Zero-dependency HTTP client for syncing local tool data to a DashClaw dashboard.
"""

import json
import os
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError


def load_config():
    """Load DashClaw API config from env vars or secrets/dashclaw.env file."""
    url = os.environ.get("DASHCLAW_URL")
    api_key = os.environ.get("DASHCLAW_API_KEY")
    agent_id = os.environ.get("DASHCLAW_AGENT_ID")

    if not (url and api_key):
        env_paths = [
            Path(__file__).resolve().parent.parent.parent / "secrets" / "dashclaw.env",
            Path.home() / "dashclaw" / "secrets" / "dashclaw.env",
        ]
        for env_path in env_paths:
            if env_path.exists():
                for line in env_path.read_text().splitlines():
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    key, _, value = line.partition("=")
                    key, value = key.strip(), value.strip()
                    if key == "DASHCLAW_URL" and not url:
                        url = value
                    elif key == "DASHCLAW_API_KEY" and not api_key:
                        api_key = value
                    elif key == "DASHCLAW_AGENT_ID" and not agent_id:
                        agent_id = value
                break

    return {
        "url": (url or "").rstrip("/"),
        "api_key": api_key or "",
        "agent_id": agent_id or "",
    }


def push_to_api(path, body, method="POST"):
    """
    Send data to a DashClaw API endpoint.

    Args:
        path: API path (e.g. '/api/learning')
        body: Dict payload to send as JSON
        method: HTTP method (default POST)

    Returns:
        (success: bool, result_or_error: dict|str)
    """
    config = load_config()
    if not config["url"] or not config["api_key"]:
        return False, "DashClaw push not configured. Set DASHCLAW_URL and DASHCLAW_API_KEY."

    url = config["url"] + path
    data = json.dumps(body).encode("utf-8")

    req = Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    req.add_header("x-api-key", config["api_key"])

    try:
        with urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return True, result
    except HTTPError as e:
        try:
            err_body = e.read().decode("utf-8")
        except Exception:
            err_body = str(e)
        return False, f"HTTP {e.code}: {err_body}"
    except URLError as e:
        return False, f"Connection error: {e.reason}"
    except Exception as e:
        return False, f"Push failed: {e}"
