/**
 * OpenClaw Agent SDK
 * Zero-dependency SDK for recording agent actions to the OpenClaw OPS Suite.
 * Requires Node 18+ (native fetch).
 */

class OpenClawAgent {
  /**
   * @param {Object} options
   * @param {string} options.baseUrl - OPS Suite base URL (e.g. "https://your-app.vercel.app")
   * @param {string} options.apiKey - API key for authentication (determines which org's data you access)
   * @param {string} options.agentId - Unique identifier for this agent
   * @param {string} [options.agentName] - Human-readable agent name
   * @param {string} [options.swarmId] - Swarm/group identifier if part of a multi-agent system
   */
  constructor({ baseUrl, apiKey, agentId, agentName, swarmId }) {
    if (!baseUrl) throw new Error('baseUrl is required');
    if (!apiKey) throw new Error('apiKey is required');
    if (!agentId) throw new Error('agentId is required');

    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.agentId = agentId;
    this.agentName = agentName || null;
    this.swarmId = swarmId || null;
  }

  async _request(path, method, body) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await res.json();

    if (!res.ok) {
      const err = new Error(data.error || `Request failed with status ${res.status}`);
      err.status = res.status;
      err.details = data.details;
      throw err;
    }

    return data;
  }

  /**
   * Create a new action record.
   * @param {Object} action
   * @param {string} action.action_type - One of: build, deploy, post, apply, security, message, api, calendar, research, review, fix, refactor, test, config, monitor, alert, cleanup, sync, migrate, other
   * @param {string} action.declared_goal - What this action aims to accomplish
   * @param {string} [action.action_id] - Custom action ID (auto-generated if omitted)
   * @param {string} [action.reasoning] - Why the agent decided to take this action
   * @param {string} [action.authorization_scope] - What permissions were granted
   * @param {string} [action.trigger] - What triggered this action
   * @param {string[]} [action.systems_touched] - Systems this action interacts with
   * @param {string} [action.input_summary] - Summary of input data
   * @param {string} [action.parent_action_id] - Parent action if this is a sub-action
   * @param {boolean} [action.reversible=true] - Whether this action can be undone
   * @param {number} [action.risk_score=0] - Risk score 0-100
   * @param {number} [action.confidence=50] - Confidence level 0-100
   * @returns {Promise<{action: Object, action_id: string}>}
   */
  async createAction(action) {
    return this._request('/api/actions', 'POST', {
      agent_id: this.agentId,
      agent_name: this.agentName,
      swarm_id: this.swarmId,
      ...action
    });
  }

  /**
   * Update the outcome of an existing action.
   * @param {string} actionId - The action_id to update
   * @param {Object} outcome
   * @param {string} [outcome.status] - New status: completed, failed, cancelled
   * @param {string} [outcome.output_summary] - What happened
   * @param {string[]} [outcome.side_effects] - Unintended consequences
   * @param {string[]} [outcome.artifacts_created] - Files, records, etc. created
   * @param {string} [outcome.error_message] - Error details if failed
   * @param {number} [outcome.duration_ms] - How long it took
   * @param {number} [outcome.cost_estimate] - Estimated cost in USD
   * @returns {Promise<{action: Object}>}
   */
  async updateOutcome(actionId, outcome) {
    return this._request(`/api/actions/${actionId}`, 'PATCH', {
      ...outcome,
      timestamp_end: outcome.timestamp_end || new Date().toISOString()
    });
  }

  /**
   * Register an open loop for an action.
   * @param {Object} loop
   * @param {string} loop.action_id - Parent action ID
   * @param {string} loop.loop_type - One of: followup, question, dependency, approval, review, handoff, other
   * @param {string} loop.description - What needs to be resolved
   * @param {string} [loop.priority='medium'] - One of: low, medium, high, critical
   * @param {string} [loop.owner] - Who is responsible for resolving this
   * @returns {Promise<{loop: Object, loop_id: string}>}
   */
  async registerOpenLoop(loop) {
    return this._request('/api/actions/loops', 'POST', loop);
  }

  /**
   * Resolve or cancel an open loop.
   * @param {string} loopId - The loop_id to resolve
   * @param {string} status - 'resolved' or 'cancelled'
   * @param {string} [resolution] - Resolution description (required when resolving)
   * @returns {Promise<{loop: Object}>}
   */
  async resolveOpenLoop(loopId, status, resolution) {
    return this._request(`/api/actions/loops/${loopId}`, 'PATCH', {
      status,
      resolution
    });
  }

  /**
   * Register assumptions made during an action.
   * @param {Object} assumption
   * @param {string} assumption.action_id - Parent action ID
   * @param {string} assumption.assumption - The assumption being made
   * @param {string} [assumption.basis] - Evidence or reasoning for the assumption
   * @param {boolean} [assumption.validated=false] - Whether this has been validated
   * @returns {Promise<{assumption: Object, assumption_id: string}>}
   */
  async registerAssumption(assumption) {
    return this._request('/api/actions/assumptions', 'POST', assumption);
  }

  /**
   * Get a list of actions with optional filters.
   * @param {Object} [filters]
   * @param {string} [filters.agent_id] - Filter by agent
   * @param {string} [filters.swarm_id] - Filter by swarm
   * @param {string} [filters.status] - Filter by status
   * @param {string} [filters.action_type] - Filter by type
   * @param {number} [filters.risk_min] - Minimum risk score
   * @param {number} [filters.limit=50] - Max results
   * @param {number} [filters.offset=0] - Pagination offset
   * @returns {Promise<{actions: Object[], total: number, stats: Object}>}
   */
  async getActions(filters = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    }
    return this._request(`/api/actions?${params}`, 'GET');
  }

  /**
   * Get a single action with its open loops and assumptions.
   * @param {string} actionId
   * @returns {Promise<{action: Object, open_loops: Object[], assumptions: Object[]}>}
   */
  async getAction(actionId) {
    return this._request(`/api/actions/${actionId}`, 'GET');
  }

  /**
   * Get current risk signals.
   * @returns {Promise<{signals: Object[], counts: {red: number, amber: number, total: number}}>}
   */
  async getSignals() {
    return this._request('/api/actions/signals', 'GET');
  }

  /**
   * Get a single assumption by ID.
   * @param {string} assumptionId
   * @returns {Promise<{assumption: Object}>}
   */
  async getAssumption(assumptionId) {
    return this._request(`/api/actions/assumptions/${assumptionId}`, 'GET');
  }

  /**
   * Validate or invalidate an assumption.
   * @param {string} assumptionId - The assumption_id to update
   * @param {boolean} validated - true to validate, false to invalidate
   * @param {string} [invalidated_reason] - Required when invalidating
   * @returns {Promise<{assumption: Object}>}
   */
  async validateAssumption(assumptionId, validated, invalidated_reason) {
    if (typeof validated !== 'boolean') throw new Error('validated must be a boolean');
    if (validated === false && !invalidated_reason) {
      throw new Error('invalidated_reason is required when invalidating an assumption');
    }
    const body = { validated };
    if (invalidated_reason !== undefined) body.invalidated_reason = invalidated_reason;
    return this._request(`/api/actions/assumptions/${assumptionId}`, 'PATCH', body);
  }

  /**
   * Get drift report for assumptions with risk scoring.
   * @param {Object} [filters]
   * @param {string} [filters.action_id] - Filter by action
   * @param {number} [filters.limit=50] - Max results
   * @returns {Promise<{assumptions: Object[], drift_summary: Object}>}
   */
  async getDriftReport(filters = {}) {
    const params = new URLSearchParams({ drift: 'true' });
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    }
    return this._request(`/api/actions/assumptions?${params}`, 'GET');
  }

  /**
   * Get open loops with optional filters.
   * @param {Object} [filters]
   * @param {string} [filters.status] - Filter by status (open, resolved, cancelled)
   * @param {string} [filters.loop_type] - Filter by loop type
   * @param {string} [filters.priority] - Filter by priority
   * @param {number} [filters.limit=50] - Max results
   * @returns {Promise<{loops: Object[], total: number, stats: Object}>}
   */
  async getOpenLoops(filters = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    }
    return this._request(`/api/actions/loops?${params}`, 'GET');
  }

  /**
   * Get root-cause trace for an action.
   * @param {string} actionId
   * @returns {Promise<{action: Object, trace: Object}>}
   */
  async getActionTrace(actionId) {
    return this._request(`/api/actions/${actionId}/trace`, 'GET');
  }

  /**
   * Report token usage snapshot.
   * @param {Object} usage
   * @param {number} usage.tokens_in - Input tokens consumed
   * @param {number} usage.tokens_out - Output tokens generated
   * @param {number} [usage.context_used] - Context window tokens used
   * @param {number} [usage.context_max] - Context window max capacity
   * @param {string} [usage.model] - Model name (e.g., 'claude-opus-4')
   * @returns {Promise<{snapshot: Object}>}
   */
  async reportTokenUsage(usage) {
    return this._request('/api/tokens', 'POST', {
      ...usage,
      agent_id: this.agentId
    });
  }

  /**
   * Record a decision for the learning database.
   * @param {Object} entry
   * @param {string} entry.decision - What was decided
   * @param {string} [entry.context] - Context around the decision
   * @param {string} [entry.reasoning] - Why this decision was made
   * @param {string} [entry.outcome] - 'success', 'failure', or 'pending'
   * @param {number} [entry.confidence] - Confidence level 0-100
   * @returns {Promise<{decision: Object}>}
   */
  async recordDecision(entry) {
    return this._request('/api/learning', 'POST', {
      ...entry,
      agent_id: this.agentId
    });
  }

  /**
   * Create a goal.
   * @param {Object} goal
   * @param {string} goal.title - Goal title
   * @param {string} [goal.category] - Goal category
   * @param {string} [goal.description] - Detailed description
   * @param {string} [goal.target_date] - Target completion date (ISO string)
   * @param {number} [goal.progress] - Progress 0-100
   * @param {string} [goal.status] - 'active', 'completed', 'paused'
   * @returns {Promise<{goal: Object}>}
   */
  async createGoal(goal) {
    return this._request('/api/goals', 'POST', goal);
  }

  /**
   * Record content creation.
   * @param {Object} content
   * @param {string} content.title - Content title
   * @param {string} [content.platform] - Platform (e.g., 'linkedin', 'twitter')
   * @param {string} [content.status] - 'draft' or 'published'
   * @param {string} [content.url] - Published URL
   * @returns {Promise<{content: Object}>}
   */
  async recordContent(content) {
    return this._request('/api/content', 'POST', content);
  }

  /**
   * Record a relationship interaction.
   * @param {Object} interaction
   * @param {string} interaction.summary - What happened
   * @param {string} [interaction.contact_name] - Contact name (auto-resolves to contact_id)
   * @param {string} [interaction.contact_id] - Direct contact ID
   * @param {string} [interaction.direction] - 'inbound' or 'outbound'
   * @param {string} [interaction.type] - Interaction type (e.g., 'message', 'meeting', 'email')
   * @param {string} [interaction.platform] - Platform used
   * @returns {Promise<{interaction: Object}>}
   */
  async recordInteraction(interaction) {
    return this._request('/api/relationships', 'POST', interaction);
  }

  /**
   * Create a calendar event.
   * @param {Object} event
   * @param {string} event.summary - Event title/summary
   * @param {string} event.start_time - Start time (ISO string)
   * @param {string} [event.end_time] - End time (ISO string)
   * @param {string} [event.location] - Event location
   * @param {string} [event.description] - Event description
   * @returns {Promise<{event: Object}>}
   */
  async createCalendarEvent(event) {
    return this._request('/api/calendar', 'POST', event);
  }

  /**
   * Record an idea/inspiration.
   * @param {Object} idea
   * @param {string} idea.title - Idea title
   * @param {string} [idea.description] - Detailed description
   * @param {string} [idea.category] - Category (e.g., 'feature', 'optimization', 'content')
   * @param {number} [idea.score] - Priority/quality score 0-100 (default 50)
   * @param {string} [idea.status] - 'pending', 'in_progress', 'shipped', 'rejected'
   * @param {string} [idea.source] - Where this idea came from
   * @returns {Promise<{idea: Object}>}
   */
  async recordIdea(idea) {
    return this._request('/api/inspiration', 'POST', idea);
  }

  /**
   * Report memory health snapshot with entities and topics.
   * Call periodically (e.g., daily) to track memory system health.
   * @param {Object} report
   * @param {Object} report.health - Health metrics
   * @param {number} report.health.score - Health score 0-100
   * @param {number} [report.health.total_files] - Number of memory files
   * @param {number} [report.health.total_lines] - Total lines across all files
   * @param {number} [report.health.total_size_kb] - Total size in KB
   * @param {number} [report.health.memory_md_lines] - Lines in main MEMORY.md
   * @param {number} [report.health.days_with_notes] - Days that have notes
   * @param {number} [report.health.duplicates] - Potential duplicate facts
   * @param {number} [report.health.stale_count] - Stale facts count
   * @param {Object[]} [report.entities] - Key entities found in memory
   * @param {string} report.entities[].name - Entity name
   * @param {string} [report.entities[].type] - 'person', 'tool', 'service', 'file', 'other'
   * @param {number} [report.entities[].mentions] - Mention count
   * @param {Object[]} [report.topics] - Topics/themes found in memory
   * @param {string} report.topics[].name - Topic name
   * @param {number} [report.topics[].mentions] - Mention count
   * @returns {Promise<{snapshot: Object, entities_count: number, topics_count: number}>}
   */
  async reportMemoryHealth(report) {
    return this._request('/api/memory', 'POST', report);
  }

  /**
   * Report active connections/integrations for this agent.
   * Call at agent startup to register what services the agent is connected to.
   * @param {Object[]} connections - Array of connection objects
   * @param {string} connections[].provider - Service name (e.g., 'anthropic', 'github')
   * @param {string} [connections[].authType] - Auth method: api_key, subscription, oauth, pre_configured, environment
   * @param {string} [connections[].planName] - Plan name (e.g., 'Pro Max')
   * @param {string} [connections[].status] - Connection status: active, inactive, error
   * @param {Object|string} [connections[].metadata] - Optional metadata (e.g., { cost: "$100/mo" })
   * @returns {Promise<{connections: Object[], created: number}>}
   */
  async reportConnections(connections) {
    return this._request('/api/agents/connections', 'POST', {
      agent_id: this.agentId,
      connections: connections.map(c => ({
        provider: c.provider,
        auth_type: c.authType || c.auth_type || 'api_key',
        plan_name: c.planName || c.plan_name || null,
        status: c.status || 'active',
        metadata: c.metadata || null
      }))
    });
  }

  /**
   * Helper: Create an action, run a function, and auto-update the outcome.
   * @param {Object} actionDef - Action definition (same as createAction)
   * @param {Function} fn - Async function to execute. Receives { action_id } as argument.
   * @returns {Promise<*>} - The return value of fn
   */
  async track(actionDef, fn) {
    const startTime = Date.now();
    const { action_id } = await this.createAction(actionDef);

    try {
      const result = await fn({ action_id });
      await this.updateOutcome(action_id, {
        status: 'completed',
        duration_ms: Date.now() - startTime,
        output_summary: typeof result === 'string' ? result : JSON.stringify(result)
      });
      return result;
    } catch (error) {
      await this.updateOutcome(action_id, {
        status: 'failed',
        duration_ms: Date.now() - startTime,
        error_message: error.message || String(error)
      }).catch(() => {}); // Don't throw if outcome update fails
      throw error;
    }
  }
}

export default OpenClawAgent;
export { OpenClawAgent };
