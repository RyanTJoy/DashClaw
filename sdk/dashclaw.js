/**
 * DashClaw SDK
 * Full-featured agent toolkit for the OpenClaw Pro platform.
 * Zero-dependency ESM SDK — requires Node 18+ (native fetch).
 *
 * 54 methods across 11 categories:
 * - Action Recording (6)
 * - Loops & Assumptions (7)
 * - Signals (1)
 * - Dashboard Data (8)
 * - Session Handoffs (3)
 * - Context Manager (7)
 * - Automation Snippets (4)
 * - User Preferences (6)
 * - Daily Digest (1)
 * - Security Scanning (2)
 * - Agent Messaging (9)
 * - Security Scanning (2)
 */

class DashClaw {
  /**
   * @param {Object} options
   * @param {string} options.baseUrl - OpenClaw Pro base URL (e.g. "https://your-app.vercel.app")
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

  // ══════════════════════════════════════════════
  // Category 1: Action Recording (6 methods)
  // ══════════════════════════════════════════════

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
   * Get root-cause trace for an action.
   * @param {string} actionId
   * @returns {Promise<{action: Object, trace: Object}>}
   */
  async getActionTrace(actionId) {
    return this._request(`/api/actions/${actionId}/trace`, 'GET');
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

  // ══════════════════════════════════════════════
  // Category 2: Loops & Assumptions (7 methods)
  // ══════════════════════════════════════════════

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

  // ══════════════════════════════════════════════
  // Category 3: Signals (1 method)
  // ══════════════════════════════════════════════

  /**
   * Get current risk signals.
   * @returns {Promise<{signals: Object[], counts: {red: number, amber: number, total: number}}>}
   */
  async getSignals() {
    return this._request('/api/actions/signals', 'GET');
  }

  // ══════════════════════════════════════════════
  // Category 4: Dashboard Data (8 methods)
  // ══════════════════════════════════════════════

  /**
   * Report token usage snapshot (disabled in dashboard, API still functional).
   * @param {Object} usage
   * @param {number} usage.tokens_in - Input tokens consumed
   * @param {number} usage.tokens_out - Output tokens generated
   * @param {number} [usage.context_used] - Context window tokens used
   * @param {number} [usage.context_max] - Context window max capacity
   * @param {string} [usage.model] - Model name
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
    return this._request('/api/goals', 'POST', {
      ...goal,
      agent_id: this.agentId
    });
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
    return this._request('/api/content', 'POST', {
      ...content,
      agent_id: this.agentId
    });
  }

  /**
   * Record a relationship interaction.
   * @param {Object} interaction
   * @param {string} interaction.summary - What happened
   * @param {string} [interaction.contact_name] - Contact name (auto-resolves to contact_id)
   * @param {string} [interaction.contact_id] - Direct contact ID
   * @param {string} [interaction.direction] - 'inbound' or 'outbound'
   * @param {string} [interaction.type] - Interaction type
   * @param {string} [interaction.platform] - Platform used
   * @returns {Promise<{interaction: Object}>}
   */
  async recordInteraction(interaction) {
    return this._request('/api/relationships', 'POST', {
      ...interaction,
      agent_id: this.agentId
    });
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
   * @param {string} [idea.category] - Category
   * @param {number} [idea.score] - Priority/quality score 0-100
   * @param {string} [idea.status] - 'pending', 'in_progress', 'shipped', 'rejected'
   * @param {string} [idea.source] - Where this idea came from
   * @returns {Promise<{idea: Object}>}
   */
  async recordIdea(idea) {
    return this._request('/api/inspiration', 'POST', idea);
  }

  /**
   * Report memory health snapshot with entities and topics.
   * @param {Object} report
   * @param {Object} report.health - Health metrics
   * @param {number} report.health.score - Health score 0-100
   * @param {Object[]} [report.entities] - Key entities found in memory
   * @param {Object[]} [report.topics] - Topics/themes found in memory
   * @returns {Promise<{snapshot: Object, entities_count: number, topics_count: number}>}
   */
  async reportMemoryHealth(report) {
    return this._request('/api/memory', 'POST', report);
  }

  /**
   * Report active connections/integrations for this agent.
   * @param {Object[]} connections - Array of connection objects
   * @param {string} connections[].provider - Service name (e.g., 'anthropic', 'github')
   * @param {string} [connections[].authType] - Auth method
   * @param {string} [connections[].planName] - Plan name
   * @param {string} [connections[].status] - Connection status: active, inactive, error
   * @param {Object|string} [connections[].metadata] - Optional metadata
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

  // ══════════════════════════════════════════════
  // Category 5: Session Handoffs (3 methods)
  // ══════════════════════════════════════════════

  /**
   * Create a session handoff document.
   * @param {Object} handoff
   * @param {string} handoff.summary - Session summary
   * @param {string} [handoff.session_date] - Date string (defaults to today)
   * @param {string[]} [handoff.key_decisions] - Key decisions made
   * @param {string[]} [handoff.open_tasks] - Tasks still open
   * @param {string} [handoff.mood_notes] - Mood/energy observations
   * @param {string[]} [handoff.next_priorities] - What to focus on next
   * @returns {Promise<{handoff: Object, handoff_id: string}>}
   */
  async createHandoff(handoff) {
    return this._request('/api/handoffs', 'POST', {
      agent_id: this.agentId,
      ...handoff
    });
  }

  /**
   * Get handoffs with optional filters.
   * @param {Object} [filters]
   * @param {string} [filters.date] - Filter by session_date
   * @param {number} [filters.limit] - Max results
   * @returns {Promise<{handoffs: Object[], total: number}>}
   */
  async getHandoffs(filters = {}) {
    const params = new URLSearchParams({ agent_id: this.agentId });
    if (filters.date) params.set('date', filters.date);
    if (filters.limit) params.set('limit', String(filters.limit));
    return this._request(`/api/handoffs?${params}`, 'GET');
  }

  /**
   * Get the most recent handoff for this agent.
   * @returns {Promise<{handoff: Object|null}>}
   */
  async getLatestHandoff() {
    return this._request(`/api/handoffs?agent_id=${this.agentId}&latest=true`, 'GET');
  }

  // ══════════════════════════════════════════════
  // Category 6: Context Manager (7 methods)
  // ══════════════════════════════════════════════

  /**
   * Capture a key point from the current session.
   * @param {Object} point
   * @param {string} point.content - The key point content
   * @param {string} [point.category] - One of: decision, task, insight, question, general
   * @param {number} [point.importance] - Importance 1-10 (default 5)
   * @param {string} [point.session_date] - Date string (defaults to today)
   * @returns {Promise<{point: Object, point_id: string}>}
   */
  async captureKeyPoint(point) {
    return this._request('/api/context/points', 'POST', {
      agent_id: this.agentId,
      ...point
    });
  }

  /**
   * Get key points with optional filters.
   * @param {Object} [filters]
   * @param {string} [filters.category] - Filter by category
   * @param {string} [filters.session_date] - Filter by date
   * @param {number} [filters.limit] - Max results
   * @returns {Promise<{points: Object[], total: number}>}
   */
  async getKeyPoints(filters = {}) {
    const params = new URLSearchParams({ agent_id: this.agentId });
    if (filters.category) params.set('category', filters.category);
    if (filters.session_date) params.set('session_date', filters.session_date);
    if (filters.limit) params.set('limit', String(filters.limit));
    return this._request(`/api/context/points?${params}`, 'GET');
  }

  /**
   * Create a context thread for tracking a topic across entries.
   * @param {Object} thread
   * @param {string} thread.name - Thread name (unique per agent per org)
   * @param {string} [thread.summary] - Initial summary
   * @returns {Promise<{thread: Object, thread_id: string}>}
   */
  async createThread(thread) {
    return this._request('/api/context/threads', 'POST', {
      agent_id: this.agentId,
      ...thread
    });
  }

  /**
   * Add an entry to an existing thread.
   * @param {string} threadId - The thread ID
   * @param {string} content - Entry content
   * @param {string} [entryType] - Entry type (default: 'note')
   * @returns {Promise<{entry: Object, entry_id: string}>}
   */
  async addThreadEntry(threadId, content, entryType) {
    return this._request(`/api/context/threads/${threadId}/entries`, 'POST', {
      content,
      entry_type: entryType || 'note'
    });
  }

  /**
   * Close a thread with an optional summary.
   * @param {string} threadId - The thread ID
   * @param {string} [summary] - Final summary
   * @returns {Promise<{thread: Object}>}
   */
  async closeThread(threadId, summary) {
    const body = { status: 'closed' };
    if (summary) body.summary = summary;
    return this._request(`/api/context/threads/${threadId}`, 'PATCH', body);
  }

  /**
   * Get threads with optional filters.
   * @param {Object} [filters]
   * @param {string} [filters.status] - Filter by status (active, closed)
   * @param {number} [filters.limit] - Max results
   * @returns {Promise<{threads: Object[], total: number}>}
   */
  async getThreads(filters = {}) {
    const params = new URLSearchParams({ agent_id: this.agentId });
    if (filters.status) params.set('status', filters.status);
    if (filters.limit) params.set('limit', String(filters.limit));
    return this._request(`/api/context/threads?${params}`, 'GET');
  }

  /**
   * Get a combined context summary: today's key points + active threads.
   * @returns {Promise<{points: Object[], threads: Object[]}>}
   */
  async getContextSummary() {
    const today = new Date().toISOString().split('T')[0];
    const [pointsResult, threadsResult] = await Promise.all([
      this.getKeyPoints({ session_date: today }),
      this.getThreads({ status: 'active' }),
    ]);
    return {
      points: pointsResult.points,
      threads: threadsResult.threads,
    };
  }

  // ══════════════════════════════════════════════
  // Category 7: Automation Snippets (4 methods)
  // ══════════════════════════════════════════════

  /**
   * Save or update a reusable code snippet.
   * @param {Object} snippet
   * @param {string} snippet.name - Snippet name (unique per org, upserts on conflict)
   * @param {string} snippet.code - The snippet code
   * @param {string} [snippet.description] - What this snippet does
   * @param {string} [snippet.language] - Programming language
   * @param {string[]} [snippet.tags] - Tags for categorization
   * @returns {Promise<{snippet: Object, snippet_id: string}>}
   */
  async saveSnippet(snippet) {
    return this._request('/api/snippets', 'POST', {
      agent_id: this.agentId,
      ...snippet
    });
  }

  /**
   * Search and list snippets.
   * @param {Object} [filters]
   * @param {string} [filters.search] - Search name/description
   * @param {string} [filters.tag] - Filter by tag
   * @param {string} [filters.language] - Filter by language
   * @param {number} [filters.limit] - Max results
   * @returns {Promise<{snippets: Object[], total: number}>}
   */
  async getSnippets(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.tag) params.set('tag', filters.tag);
    if (filters.language) params.set('language', filters.language);
    if (filters.limit) params.set('limit', String(filters.limit));
    return this._request(`/api/snippets?${params}`, 'GET');
  }

  /**
   * Mark a snippet as used (increments use_count).
   * @param {string} snippetId - The snippet ID
   * @returns {Promise<{snippet: Object}>}
   */
  async useSnippet(snippetId) {
    return this._request(`/api/snippets/${snippetId}/use`, 'POST');
  }

  /**
   * Delete a snippet.
   * @param {string} snippetId - The snippet ID
   * @returns {Promise<{deleted: boolean, id: string}>}
   */
  async deleteSnippet(snippetId) {
    return this._request(`/api/snippets?id=${snippetId}`, 'DELETE');
  }

  // ══════════════════════════════════════════════
  // Category 8: User Preferences (6 methods)
  // ══════════════════════════════════════════════

  /**
   * Log a user observation (what you noticed about the user).
   * @param {Object} obs
   * @param {string} obs.observation - The observation text
   * @param {string} [obs.category] - Category tag
   * @param {number} [obs.importance] - Importance 1-10
   * @returns {Promise<{observation: Object, observation_id: string}>}
   */
  async logObservation(obs) {
    return this._request('/api/preferences', 'POST', {
      type: 'observation',
      agent_id: this.agentId,
      ...obs
    });
  }

  /**
   * Set a learned user preference.
   * @param {Object} pref
   * @param {string} pref.preference - The preference description
   * @param {string} [pref.category] - Category tag
   * @param {number} [pref.confidence] - Confidence 0-100
   * @returns {Promise<{preference: Object, preference_id: string}>}
   */
  async setPreference(pref) {
    return this._request('/api/preferences', 'POST', {
      type: 'preference',
      agent_id: this.agentId,
      ...pref
    });
  }

  /**
   * Log user mood/energy for a session.
   * @param {Object} entry
   * @param {string} entry.mood - Mood description (e.g., 'focused', 'frustrated')
   * @param {string} [entry.energy] - Energy level (e.g., 'high', 'low')
   * @param {string} [entry.notes] - Additional notes
   * @returns {Promise<{mood: Object, mood_id: string}>}
   */
  async logMood(entry) {
    return this._request('/api/preferences', 'POST', {
      type: 'mood',
      agent_id: this.agentId,
      ...entry
    });
  }

  /**
   * Track an approach and whether it succeeded or failed.
   * @param {Object} entry
   * @param {string} entry.approach - The approach description
   * @param {string} [entry.context] - Context for when to use this approach
   * @param {boolean} [entry.success] - true = worked, false = failed, undefined = just recording
   * @returns {Promise<{approach: Object, approach_id: string}>}
   */
  async trackApproach(entry) {
    return this._request('/api/preferences', 'POST', {
      type: 'approach',
      agent_id: this.agentId,
      ...entry
    });
  }

  /**
   * Get a summary of all user preference data.
   * @returns {Promise<{summary: Object}>}
   */
  async getPreferenceSummary() {
    return this._request(`/api/preferences?type=summary&agent_id=${this.agentId}`, 'GET');
  }

  /**
   * Get tracked approaches with success/fail counts.
   * @param {Object} [filters]
   * @param {number} [filters.limit] - Max results
   * @returns {Promise<{approaches: Object[], total: number}>}
   */
  async getApproaches(filters = {}) {
    const params = new URLSearchParams({ type: 'approaches', agent_id: this.agentId });
    if (filters.limit) params.set('limit', String(filters.limit));
    return this._request(`/api/preferences?${params}`, 'GET');
  }

  // ══════════════════════════════════════════════
  // Category 9: Daily Digest (1 method)
  // ══════════════════════════════════════════════

  /**
   * Get a daily activity digest aggregated from all data sources.
   * @param {string} [date] - Date string YYYY-MM-DD (defaults to today)
   * @returns {Promise<{date: string, digest: Object, summary: Object}>}
   */
  async getDailyDigest(date) {
    const params = new URLSearchParams({ agent_id: this.agentId });
    if (date) params.set('date', date);
    return this._request(`/api/digest?${params}`, 'GET');
  }

  // ══════════════════════════════════════════════
  // Category 10: Security Scanning (2 methods)
  // ══════════════════════════════════════════════

  /**
   * Scan text for sensitive data (API keys, tokens, PII, etc.).
   * Returns findings and redacted text. Does NOT store the original content.
   * @param {string} text - Text to scan
   * @param {string} [destination] - Where this text is headed (for context)
   * @returns {Promise<{clean: boolean, findings_count: number, findings: Object[], redacted_text: string}>}
   */
  async scanContent(text, destination) {
    return this._request('/api/security/scan', 'POST', {
      text,
      destination,
      agent_id: this.agentId,
      store: false,
    });
  }

  /**
   * Scan text and store finding metadata (never the content itself).
   * Use this for audit trails of security scans.
   * @param {string} text - Text to scan
   * @param {string} [destination] - Where this text is headed
   * @returns {Promise<{clean: boolean, findings_count: number, findings: Object[], redacted_text: string}>}
   */
  async reportSecurityFinding(text, destination) {
    return this._request('/api/security/scan', 'POST', {
      text,
      destination,
      agent_id: this.agentId,
      store: true,
    });
  }

  // ══════════════════════════════════════════════
  // Category 11: Agent Messaging (9 methods)
  // ══════════════════════════════════════════════

  /**
   * Send a message to another agent or broadcast to all.
   * @param {Object} params
   * @param {string} [params.to] - Target agent ID (omit for broadcast)
   * @param {string} [params.type='info'] - Message type: action|info|lesson|question|status
   * @param {string} [params.subject] - Subject line (max 200 chars)
   * @param {string} params.body - Message body (max 2000 chars)
   * @param {string} [params.threadId] - Thread ID to attach message to
   * @param {boolean} [params.urgent=false] - Mark as urgent
   * @param {string} [params.docRef] - Reference to a shared doc ID
   * @returns {Promise<{message: Object, message_id: string}>}
   */
  async sendMessage({ to, type, subject, body, threadId, urgent, docRef }) {
    return this._request('/api/messages', 'POST', {
      from_agent_id: this.agentId,
      to_agent_id: to || null,
      message_type: type || 'info',
      subject,
      body,
      thread_id: threadId,
      urgent,
      doc_ref: docRef,
    });
  }

  /**
   * Get inbox messages for this agent.
   * @param {Object} [params]
   * @param {string} [params.type] - Filter by message type
   * @param {boolean} [params.unread] - Only unread messages
   * @param {string} [params.threadId] - Filter by thread
   * @param {number} [params.limit=50] - Max messages to return
   * @returns {Promise<{messages: Object[], total: number, unread_count: number}>}
   */
  async getInbox({ type, unread, threadId, limit } = {}) {
    const params = new URLSearchParams({
      agent_id: this.agentId,
      direction: 'inbox',
    });
    if (type) params.set('type', type);
    if (unread) params.set('unread', 'true');
    if (threadId) params.set('thread_id', threadId);
    if (limit) params.set('limit', String(limit));
    return this._request(`/api/messages?${params}`, 'GET');
  }

  /**
   * Mark messages as read.
   * @param {string[]} messageIds - Array of message IDs to mark read
   * @returns {Promise<{updated: number}>}
   */
  async markRead(messageIds) {
    return this._request('/api/messages', 'PATCH', {
      message_ids: messageIds,
      action: 'read',
      agent_id: this.agentId,
    });
  }

  /**
   * Archive messages.
   * @param {string[]} messageIds - Array of message IDs to archive
   * @returns {Promise<{updated: number}>}
   */
  async archiveMessages(messageIds) {
    return this._request('/api/messages', 'PATCH', {
      message_ids: messageIds,
      action: 'archive',
      agent_id: this.agentId,
    });
  }

  /**
   * Broadcast a message to all agents in the organization.
   * @param {Object} params
   * @param {string} [params.type='info'] - Message type
   * @param {string} [params.subject] - Subject line
   * @param {string} params.body - Message body
   * @param {string} [params.threadId] - Thread ID
   * @returns {Promise<{message: Object, message_id: string}>}
   */
  async broadcast({ type, subject, body, threadId }) {
    return this.sendMessage({ to: null, type, subject, body, threadId });
  }

  /**
   * Create a new message thread for multi-turn conversations.
   * @param {Object} params
   * @param {string} params.name - Thread name
   * @param {string[]} [params.participants] - Agent IDs (null = open to all)
   * @returns {Promise<{thread: Object, thread_id: string}>}
   */
  async createMessageThread({ name, participants }) {
    return this._request('/api/messages/threads', 'POST', {
      name,
      participants,
      created_by: this.agentId,
    });
  }

  /**
   * List message threads.
   * @param {Object} [params]
   * @param {string} [params.status] - Filter by status: open|resolved|archived
   * @param {number} [params.limit=20] - Max threads to return
   * @returns {Promise<{threads: Object[], total: number}>}
   */
  async getMessageThreads({ status, limit } = {}) {
    const params = new URLSearchParams({ agent_id: this.agentId });
    if (status) params.set('status', status);
    if (limit) params.set('limit', String(limit));
    return this._request(`/api/messages/threads?${params}`, 'GET');
  }

  /**
   * Resolve (close) a message thread.
   * @param {string} threadId - Thread ID to resolve
   * @param {string} [summary] - Resolution summary
   * @returns {Promise<{thread: Object}>}
   */
  async resolveMessageThread(threadId, summary) {
    return this._request('/api/messages/threads', 'PATCH', {
      thread_id: threadId,
      status: 'resolved',
      summary,
    });
  }

  /**
   * Create or update a shared workspace document.
   * Upserts by (org_id, name) — updates increment the version.
   * @param {Object} params
   * @param {string} params.name - Document name (unique per org)
   * @param {string} params.content - Document content
   * @returns {Promise<{doc: Object, doc_id: string}>}
   */
  async saveSharedDoc({ name, content }) {
    return this._request('/api/messages/docs', 'POST', {
      name,
      content,
      agent_id: this.agentId,
    });
  }
}

// Backward compatibility alias
const OpenClawAgent = DashClaw;

export default DashClaw;
export { DashClaw, OpenClawAgent };
