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
    base_url="http://localhost:3000",  # or "https://your-app.vercel.app"
    api_key="your-api-key",
    agent_id="my-python-agent",
    agent_name="My Python Agent",
    auto_recommend="warn",  # Optional: off | warn | enforce
    hitl_mode="wait" # Optional: automatically wait for human approval
)

# Record an action
with claw.track(action_type="research", declared_goal="Explore Python SDK capabilities"):
    # ... do the work ...
    print("Working...")
```

## Identity Binding (Security)

DashClaw can enforce cryptographic signatures for actions (recommended for verified agents). To enable signing in your Python agent:

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
recs = claw.get_recommendations(
    action_type="deploy",
    limit=5,
    include_metrics=True,
)
metrics = claw.get_recommendation_metrics(action_type="deploy", lookback_days=30)

candidate = {
    "action_type": "deploy",
    "declared_goal": "Ship v1.6",
    "risk_score": 85
}
adapted = claw.recommend_action(candidate)
print(adapted["action"])

# Admin/service controls
claw.set_recommendation_active("lrec_123", active=False)
claw.record_recommendation_events({
    "recommendation_id": "lrec_123",
    "event_type": "fetched",
    "details": {"source": "python-sdk"},
})
```

## Automation Snippets

Save, search, fetch, and reuse code snippets across agent sessions:

```python
# Save a snippet (upserts by name)
claw.save_snippet("fetch-with-retry", code="async def fetch_retry(url, n=3): ...", language="python")

# Fetch a single snippet by ID
snippet = claw.get_snippet("sn_abc123")

# Search snippets
results = claw.get_snippets(language="python", search="retry")

# Mark as used (increments use_count)
claw.use_snippet("sn_abc123")

# Delete
claw.delete_snippet("sn_abc123")
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

## Policy Testing

Run guardrails tests, generate compliance proof reports, and import policy packs.

```python
# Run all policy tests
report = claw.test_policies()
print(f"{report['passed']}/{report['total']} policies passed")
for r in [r for r in report["results"] if not r["passed"]]:
    print(f"FAIL: {r['policy']} — {r['reason']}")

# Generate compliance proof report
proof = claw.get_proof_report(format="md")

# Import a policy pack (admin only)
claw.import_policies(pack="enterprise-strict")

# Or import raw YAML
claw.import_policies(yaml="policies:\n  - name: block-deploys\n    ...")
```

**Methods:**

| Method | Description |
|--------|-------------|
| `test_policies()` | Run guardrails tests against all active policies |
| `get_proof_report(format="json")` | Generate compliance proof report. Format: "json" or "md" |
| `import_policies(pack=None, yaml=None)` | Import a policy pack or raw YAML. Packs: enterprise-strict, smb-safe, startup-growth, development |

## Compliance Engine

Map policies to regulatory frameworks, run gap analysis, and generate compliance reports.

```python
# Map policies to SOC 2 controls
mapping = claw.map_compliance("soc2")
print(f"SOC 2 coverage: {mapping['coverage_pct']}%")
for ctrl in [c for c in mapping["controls"] if not c["covered"]]:
    print(f"Gap: {ctrl['id']} — {ctrl['name']}")

# Run gap analysis with remediation plan
gaps = claw.analyze_gaps("soc2")

# Generate full compliance report
report = claw.get_compliance_report("iso27001", format="md")

# List available frameworks
frameworks = claw.list_frameworks()

# Get live guard decision evidence for audits
evidence = claw.get_compliance_evidence(window="30d")
```

**Methods:**

| Method | Description |
|--------|-------------|
| `map_compliance(framework)` | Map policies to framework controls. Frameworks: soc2, iso27001, gdpr, nist-ai-rmf, imda-agentic |
| `analyze_gaps(framework)` | Run gap analysis with remediation plan |
| `get_compliance_report(framework, format="json")` | Generate full report (json or md) and save snapshot |
| `list_frameworks()` | List available compliance frameworks |
| `get_compliance_evidence(window="7d")` | Get live guard decision evidence. Windows: 7d, 30d, 90d |

## Task Routing

Route tasks to agents based on capabilities, availability, and workload.

```python
# Register an agent in the routing pool
agent = claw.register_routing_agent(
    name="data-analyst",
    capabilities=["data-analysis", "reporting"],
    max_concurrent=3,
    endpoint="https://agents.example.com/analyst",
)

# Submit a task for auto-routing
task = claw.submit_routing_task(
    title="Analyze quarterly metrics",
    description="Pull Q4 data and generate summary report",
    required_skills=["data-analysis", "reporting"],
    urgency="high",
    timeout_seconds=600,
    callback_url="https://hooks.example.com/task-done",
)
print(f"Task {task['task_id']} assigned to {task.get('assigned_agent', {}).get('name', 'queue')}")

# Complete a task
claw.complete_routing_task(task["task_id"], result={"summary": "Report generated"})

# List agents and tasks
agents = claw.list_routing_agents(status="available")
tasks = claw.list_routing_tasks(status="pending")

# Monitor routing health
stats = claw.get_routing_stats()
health = claw.get_routing_health()
```

**Methods:**

| Method | Description |
|--------|-------------|
| `list_routing_agents(status=None)` | List agents. Filter by status: available, busy, offline |
| `register_routing_agent(name, capabilities=None, max_concurrent=1, endpoint=None)` | Register agent in routing pool |
| `get_routing_agent(agent_id)` | Get agent with metrics |
| `update_routing_agent_status(agent_id, status)` | Update agent status |
| `delete_routing_agent(agent_id)` | Delete agent from pool |
| `list_routing_tasks(status=None, agent_id=None, limit=50, offset=0)` | List tasks with filters |
| `submit_routing_task(title, description=None, required_skills=None, urgency="medium", timeout_seconds=None, max_retries=None, callback_url=None)` | Submit task for auto-routing |
| `complete_routing_task(task_id, result=None)` | Complete a task |
| `get_routing_stats()` | Get routing statistics |
| `get_routing_health()` | Get health status |

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
