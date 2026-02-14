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
    agent_name="My Python Agent",
    hitl_mode="wait" # Optional: automatically wait for human approval
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

## Human-in-the-Loop (HITL) Governance

When `hitl_mode="wait"` is set, any action that triggers a "Require Approval" policy will automatically pause.

```python
try:
    claw.create_action(action_type="deploy", declared_goal="Ship to production")
    # Agent automatically pauses here until approved in the dashboard
except ApprovalDeniedError:
    print("Human operator denied the action!")
```

Manual approval API access is also available when building operator tooling:

```python
claw.approve_action("action_123", decision="allow", reasoning="Change window approved")
pending = claw.get_pending_approvals(limit=25)
```

## Guard Audit + Webhooks

Fetch recent guard decisions and manage webhook endpoints directly from the SDK:

```python
decisions = claw.get_guard_decisions(decision="block", limit=50)

created = claw.create_webhook(
    url="https://hooks.example.com/dashclaw",
    events=["all"]
)
webhooks = claw.get_webhooks()
deliveries = claw.get_webhook_deliveries(created["webhook"]["id"])
claw.test_webhook(created["webhook"]["id"])
```

## Adaptive Recommendations

Build and consume action recommendations based on prior outcomes:

```python
claw.rebuild_recommendations(lookback_days=30, min_samples=5)
recs = claw.get_recommendations(action_type="deploy", limit=5)

candidate = {
    "action_type": "deploy",
    "declared_goal": "Ship v1.6",
    "risk_score": 85
}
adapted = claw.recommend_action(candidate)
print(adapted["action"])
```

## Context + Messaging APIs

Python SDK parity now includes context thread management, message lifecycle, and shared docs:

```python
thread = claw.create_thread("Release Planning")
claw.add_thread_entry(thread["thread_id"], "Kickoff complete")
claw.close_thread(thread["thread_id"], summary="Done for today")

inbox = claw.get_inbox(unread=True)
claw.mark_read([msg["id"] for msg in inbox["messages"][:2]])

msg_thread = claw.create_message_thread("Ops Coordination")
claw.broadcast(body="Maintenance window starts in 5 minutes", message_type="status")
claw.save_shared_doc(name="Ops Runbook", content="Updated checklist")
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

### CrewAI

Instrument CrewAI tasks and agents to track research and decision-making.

```python
from dashclaw.integrations.crewai import DashClawCrewIntegration

integration = DashClawCrewIntegration(claw)

# Method A: Task callback
task = Task(
    description="Analyze market trends",
    agent=analyst,
    callback=integration.task_callback
)

# Method B: Instrument Agent (Step-by-step tracking)
analyst = integration.instrument_agent(analyst)
```

### AutoGen

Monitor multi-agent conversations and protocol exchanges.

```python
from dashclaw.integrations.autogen import DashClawAutoGenIntegration

integration = DashClawAutoGenIntegration(claw)

# Instrument an agent to log all received messages
integration.instrument_agent(assistant)
```

## API Parity

This SDK provides parity with the [DashClaw Node.js SDK](https://github.com/ucsandman/DashClaw/tree/main/sdk).

## License

MIT
