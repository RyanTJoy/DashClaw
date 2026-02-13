# DashClaw Python SDK

Full-featured agent toolkit for the [DashClaw](https://github.com/ucsandman/DashClaw) platform. Zero dependencies, requires Python 3.7+.

## Install

```bash
pip install dashclaw
```

## Quick Start

```python
from dashclaw import DashClaw

claw = DashClaw(
    base_url="https://your-app.vercel.app",
    api_key="your-api-key",
    agent_id="my-python-agent",
    agent_name="My Python Agent"
)

# Record an action
with claw.track(action_type="research", declared_goal="Explore Python SDK capabilities"):
    # ... do the work ...
    print("Working...")
```

## API Parity

This SDK provides parity with the [DashClaw Node.js SDK](https://github.com/ucsandman/DashClaw/tree/main/sdk).

## License

MIT
