# DashClaw Agent Tools

**31 tools** - A complete AI agent self-improvement toolkit with security hardening.

Security audit completed 2026-02-04

## Quick Reference

### Learning Database - Get Smarter Over Time
```bash
cd tools/learning-database
python learner.py log "Made decision X" --context "situation" --tags tag1,tag2
python learner.py outcome <id> --result success|failure|mixed --notes "what happened"
python learner.py lesson "Learned that X works better than Y" --confidence 80
python learner.py patterns   # See what's working
python learner.py stats
```

### Context Manager - Stay Coherent
```bash
cd tools/context-manager
python context.py capture "Important point" --category decision --importance 8
python context.py summary    # Get current context summary
python context.py thread "project-name" --add "progress update"
python context.py compress   # Compress old context
python context.py export     # Export to markdown
```

### Inspiration Capture - Turn Ideas Into Projects
```bash
cd tools/inspiration
python ideas.py capture "Cool project idea" --desc "details" --tags ai,tool
python ideas.py score <id>   # Interactive scoring
python ideas.py top          # Top ideas to build
python ideas.py random       # Can't decide? Random pick!
python ideas.py status <id> shipped --url https://...
```

### Communication Analytics - Learn What Works
```bash
cd tools/communication-analytics
python comms.py log "Asked for help with X" --type request --response 4 --tone casual
python comms.py patterns     # What communication styles work
python comms.py best         # Best performing messages
```

### Memory Search - Find Anything
```bash
cd tools/memory-search
python search.py "query"           # Search all memory
python search.py "query" --recent 7  # Last 7 days
python search.py files             # List memory files
python search.py recent            # Recent entries
```

### Session Handoff - Context for Future-Me
```bash
cd tools/session-handoff
python handoff.py generate   # Generate context summary
python handoff.py save       # Save to memory file
python handoff.py quick      # Quick status for new session
```

### Goal Tracker - Long-Term Goals
```bash
cd tools/goal-tracker
python goals.py add "goal" --category work --target 2026-03-01
python goals.py milestone <id> "milestone description"
python goals.py progress <id> <percent>
python goals.py check        # Health check all goals
python goals.py view <id>
```

### Daily Digest - Auto-Compile Day's Work
```bash
cd tools/daily-digest
python digest.py generate    # Generate today's digest
python digest.py save        # Save to memory file
```

### Error Logger - Learn From Mistakes
```bash
cd tools/error-logger
python errors.py log "what went wrong" --context "situation" --severity high
python errors.py resolve <id> --fix "solution" --prevention "how to prevent"
python errors.py patterns    # Analyze error patterns
python errors.py list --unresolved
```

### Time Estimator - Get Better at Planning
```bash
cd tools/time-estimator
python timer.py start "task" --estimate 30
python timer.py stop
python timer.py log "task" --estimate 30 --actual 45
python timer.py accuracy     # Check estimation accuracy
```

### Skill Tracker - Know Your Abilities
```bash
cd tools/skill-tracker
python skills.py add "Python" --category tech --level 7
python skills.py update "Python" --level 8 --notes "improved"
python skills.py list
python skills.py gaps        # Show skill gaps
python skills.py growth      # Show improvement history
```

### User Context Tracker - Understand Your Human
```bash
cd tools/user-context
python user_context.py preference "prefers X" --category communication --confidence 90
python user_context.py mood --current excited --energy high
python user_context.py works "approach that worked"
python user_context.py whatworks      # Show what works best
python user_context.py summary        # Full context summary
```

### Automation Library - Reusable Snippets
```bash
cd tools/automation-library
python snippets.py add "name" --code "command" --tags git,deploy
python snippets.py get "name"
python snippets.py search "query"
python snippets.py list
```

### Project Health Monitor - Track All Projects
```bash
cd tools/project-monitor
python monitor.py scan       # Scan all projects
python monitor.py status <project>
python monitor.py stalled    # Show stalled projects
```

### API/Service Monitor - Track Costs & Reliability
```bash
cd tools/api-monitor
python apis.py add "service" --endpoint "url" --limit "100/day"
python apis.py use "service" --calls 1 --cost 0.01
python apis.py status        # Show all services
python apis.py costs --period week
```

### Token Efficiency - Budget Management
```bash
cd tools/token-efficiency
python token-tracker.py      # Check budget
python efficiency-cli.py check --operation browser_snapshot
python efficiency-cli.py status
```

### Relationship Tracker - CRM
```bash
cd tools/relationship-tracker
python tracker.py list --hot  # Hot leads
python tracker.py due         # Follow-ups due
python tracker.py log <id> -t reply -d outbound -s "Summary"
```

### Security Tools - Protect Sensitive Data

#### Outbound Filter - Scan Before Sending
```bash
cd tools/security
python outbound_filter.py scan "text to check"   # Check for secrets
python outbound_filter.py test                   # Run test patterns
python outbound_filter.py report                 # Show findings report
```

#### Session Isolator - Control File Access
```bash
cd tools/security
python session_isolator.py check MEMORY.md      # Check file access
python session_isolator.py status               # Show current session type
python session_isolator.py mode block           # Set enforcement mode
python session_isolator.py types                # Show session types
```

#### Audit Logger - Track External Actions
```bash
cd tools/security
python audit_logger.py log email --target user@example.com
python audit_logger.py recent                   # View recent actions
python audit_logger.py stats                    # View statistics
python audit_logger.py search "query"           # Search logs
```

#### Secret Tracker - Manage Credential Rotation
```bash
cd tools/security
python secret_tracker.py add "API Key" --type api_key --service openai
python secret_tracker.py list                   # View all secrets
python secret_tracker.py due                    # Check rotation due
python secret_tracker.py rotate <id>            # Mark as rotated
```

#### Data Classifier - Check File Sensitivity
```bash
cd tools/security
python data_classifier.py classify /path/to/file
python data_classifier.py scan /path/to/dir
```

---

## Tool Locations

| Tool | Location |
|------|----------|
| Learning Database | `tools/learning-database/` |
| Context Manager | `tools/context-manager/` |
| Inspiration | `tools/inspiration/` |
| Communication Analytics | `tools/communication-analytics/` |
| Memory Search | `tools/memory-search/` |
| Session Handoff | `tools/session-handoff/` |
| Goal Tracker | `tools/goal-tracker/` |
| Daily Digest | `tools/daily-digest/` |
| Error Logger | `tools/error-logger/` |
| Time Estimator | `tools/time-estimator/` |
| Skill Tracker | `tools/skill-tracker/` |
| User Context | `tools/user-context/` |
| Automation Library | `tools/automation-library/` |
| Project Monitor | `tools/project-monitor/` |
| API Monitor | `tools/api-monitor/` |
| Token Efficiency | `tools/token-efficiency/` |
| Relationship Tracker | `tools/relationship-tracker/` |
| **Security Tools** | `tools/security/` |
| - Outbound Filter | `tools/security/outbound_filter.py` |
| - Session Isolator | `tools/security/session_isolator.py` |
| - Audit Logger | `tools/security/audit_logger.py` |
| - Secret Tracker | `tools/security/secret_tracker.py` |
| - Data Classifier | `tools/security/data_classifier.py` |

---

## Daily Workflow

1. **Session Start**: Run `handoff.py quick` to see context
2. **Morning**: Check priorities
3. **Throughout day**: Capture key points with `context.py capture`
4. **After decisions**: Log with `learner.py log`
5. **When outcomes known**: Record with `learner.py outcome`
6. **Ideas strike**: Capture with `ideas.py capture`
7. **End of day**: Run `digest.py save` and `handoff.py save`

---

## Syncing to Dashboard

All tools support an optional `--push` flag on write commands. When enabled, the tool will also send data to a DashClaw dashboard via the API.

```bash
# Local only (default)
python learner.py log "Made decision X"

# Local + push to dashboard
python learner.py log "Made decision X" --push
```

Configure in `secrets/dashclaw.env`:
```bash
DASHCLAW_URL=http://localhost:3000  # or https://your-app.vercel.app
DASHCLAW_API_KEY=oc_live_your_key_here
DASHCLAW_AGENT_ID=my-agent
```

For bulk sync of all local data, use:
```bash
python sync_to_dashclaw.py           # Sync everything
python sync_to_dashclaw.py --dry-run # Preview what would sync
python sync_to_dashclaw.py --categories learning,goals  # Specific categories
```

---

## Environment Setup

See `.env.example` for all required variables.

---

## Security Notes

- All tools load credentials from `secrets/` directory (never hardcoded)
- Session isolator defaults to `block` mode (fail-closed)
- Outbound filter scans for 18+ secret patterns
- Audit logger hashes content previews (no plaintext secrets in logs)
