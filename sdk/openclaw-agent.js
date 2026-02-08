/**
 * OpenClaw Agent SDK
 * Zero-dependency SDK for recording agent actions to the OpenClaw OPS Suite.
 * Requires Node 18+ (native fetch).
 */

class OpenClawAgent {
  /**
   * @param {Object} options
   * @param {string} options.baseUrl - OPS Suite base URL (e.g. "https://your-app.vercel.app")
   * @param {string} options.apiKey - Dashboard API key for authentication
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
