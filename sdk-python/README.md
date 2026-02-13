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

## Identity Binding (Security)

DashClaw v1.3.0+ enforces cryptographic signatures for actions in production. To enable this in your Python agent:

1. Install the `cryptography` library: `pip install cryptography`
2. Generate an RSA keypair using `node scripts/generate-agent-keys.mjs <agent-id>` from the DashClaw repo.
3. Pass the private key to the constructor:

```python
from dashclaw import DashClaw
from cryptography.hazmat.primitives import serialization

# Load your private key (from env or file)
with open("private_key.pem", "rb") as key_file:
    private_key = serialization.load_pem_private_key(
        key_file.read(),
        password=None
    )

claw = DashClaw(
    ...,
    private_key=private_key
)
```

## Integrations

### LangChain

Automatically log LLM calls, tool usage, and costs with one line of code.

```python
from dashclaw.integrations.langchain import DashClawCallbackHandler

handler = DashClawCallbackHandler(claw)

# Pass to your agent or chain
agent.run("Hello world", callbacks=[handler])
```

## API Parity

This SDK provides parity with the [DashClaw Node.js SDK](https://github.com/ucsandman/DashClaw/tree/main/sdk).

## License

MIT
