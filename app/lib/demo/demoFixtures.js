let _cached = null;
const BASE_NOW = Date.now();

function lcg(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pick(rnd, items) {
  return items[Math.floor(rnd() * items.length)];
}

function int(rnd, min, max) {
  return min + Math.floor(rnd() * (max - min + 1));
}

function isoFromNow(msAgo) {
  return new Date(BASE_NOW - msAgo).toISOString();
}

function isoInFuture(msAhead) {
  return new Date(BASE_NOW + msAhead).toISOString();
}

function stableId(prefix, n) {
  return `${prefix}_${String(n).padStart(3, '0')}`;
}

function buildFixtures() {
  const rnd = lcg(0xD15C1A57);

  const actionTypes = ['deploy', 'research', 'security', 'message', 'build', 'review', 'monitor', 'fix', 'sync', 'test'];
  const statuses = ['completed', 'running', 'failed', 'pending', 'pending_approval', 'cancelled'];
  const systems = ['api', 'payments', 'auth', 'infra', 'docs', 'frontend', 'data', 'security', 'ops'];

  const agents = Array.from({ length: 50 }).map((_, i) => {
    const n = i + 1;
    return {
      agent_id: `agent_${String(n).padStart(2, '0')}`,
      agent_name: `Agent ${String(n).padStart(2, '0')}`,
    };
  });

  const actions = Array.from({ length: 220 }).map((_, i) => {
    const agent = pick(rnd, agents);
    const action_type = pick(rnd, actionTypes);
    // Ensure a non-trivial approval queue in the demo.
    const status = i < 8 ? 'pending_approval' : pick(rnd, statuses);
    const system = pick(rnd, systems);
    const risk = int(rnd, 0, 100);
    const cost = Math.round((0.005 + rnd() * 0.35) * 10000) / 10000;

    const minutesAgo = i * 6 + int(rnd, 0, 4);
    const tsStart = isoFromNow(minutesAgo * 60 * 1000);
    const durationMs = int(rnd, 2_000, 240_000);
    const tsEnd = status === 'running' || status === 'pending' ? null : isoFromNow((minutesAgo - Math.floor(durationMs / 60000)) * 60 * 1000);

    const tokensIn = int(rnd, 120, 2500);
    const tokensOut = int(rnd, 60, 1800);

    return {
      org_id: 'org_demo',
      action_id: stableId('act_demo', i + 1),
      agent_id: agent.agent_id,
      agent_name: agent.agent_name,
      swarm_id: null,
      parent_action_id: null,
      action_type,
      declared_goal: `${action_type.toUpperCase()}: ${system} ${pick(rnd, ['stability', 'latency', 'release', 'audit', 'rollout', 'alerting', 'handoff', 'migration'])}`,
      reasoning: pick(rnd, [
        'Routine maintenance window.',
        'Triggered by anomaly detection signal.',
        'Requested by operator for reliability.',
        'Rolling out a safe incremental change.',
        'Investigating elevated error rate.',
      ]),
      authorization_scope: risk >= 70 ? null : pick(rnd, ['read-only', 'staging', 'limited-prod', 'dry-run']),
      trigger: pick(rnd, ['schedule', 'signal', 'operator', 'handoff']),
      systems_touched: JSON.stringify([system]),
      input_summary: null,
      status,
      reversible: risk >= 85 ? 0 : 1,
      risk_score: risk,
      confidence: int(rnd, 40, 95),
      recommendation_id: rnd() > 0.7 ? stableId('lrec', int(rnd, 1, 12)) : null,
      recommendation_applied: rnd() > 0.65 ? 1 : 0,
      recommendation_override_reason: null,
      output_summary: status === 'completed' ? pick(rnd, ['OK', 'Deployed', 'Patched', 'Verified', 'Completed']) : null,
      side_effects: JSON.stringify(rnd() > 0.8 ? ['cache_invalidation', 'restart_service'] : []),
      artifacts_created: JSON.stringify(rnd() > 0.85 ? ['report.md', 'trace.json'] : []),
      error_message: status === 'failed' ? pick(rnd, ['Timeout', 'Permission denied', 'Dependency failure']) : null,
      timestamp_start: tsStart,
      timestamp_end: tsEnd,
      duration_ms: status === 'running' || status === 'pending' ? null : durationMs,
      cost_estimate: cost,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      signature: null,
      verified: rnd() > 0.25,
    };
  });

  const loops = Array.from({ length: 10 }).map((_, i) => {
    const action = pick(rnd, actions);
    const loopType = pick(rnd, ['followup', 'question', 'dependency', 'approval', 'review', 'handoff']);
    const priority = pick(rnd, ['low', 'medium', 'high', 'critical']);
    return {
      org_id: 'org_demo',
      loop_id: stableId('loop_demo', i + 1),
      action_id: action.action_id,
      loop_type: loopType,
      description: `${loopType}: ${pick(rnd, ['confirm results', 'get approval', 'validate assumption', 'coordinate rollout', 'review logs'])}`,
      status: 'open',
      priority,
      owner: null,
      created_at: isoFromNow(int(rnd, 10, 800) * 60 * 1000),
      resolved_at: null,
      resolution: null,

      agent_id: action.agent_id,
      agent_name: action.agent_name,
      declared_goal: action.declared_goal,
      action_type: action.action_type,
    };
  });

  const assumptions = Array.from({ length: 14 }).map((_, i) => {
    const action = pick(rnd, actions);
    const createdDaysAgo = int(rnd, 1, 45);
    const invalidated = rnd() > 0.78 ? 1 : 0;
    return {
      org_id: 'org_demo',
      assumption_id: stableId('asm_demo', i + 1),
      action_id: action.action_id,
      assumption: pick(rnd, [
        'This endpoint is not used by mobile clients.',
        'We can rotate this key without downtime.',
        'Retries are safe and idempotent.',
        'This agent has least-privilege scope.',
        'The data contract is backward compatible.',
      ]),
      basis: pick(rnd, ['logs', 'historical behavior', 'runbook', 'operator guidance']),
      validated: invalidated ? 0 : (rnd() > 0.6 ? 1 : 0),
      invalidated,
      invalidated_reason: invalidated ? 'Observed mismatch in production telemetry.' : null,
      created_at: isoFromNow(createdDaysAgo * 24 * 60 * 60 * 1000),
      invalidated_at: invalidated ? isoFromNow(int(rnd, 1, 6) * 24 * 60 * 60 * 1000) : null,

      agent_id: action.agent_id,
      agent_name: action.agent_name,
      declared_goal: action.declared_goal,
    };
  });

  const decisions = Array.from({ length: 18 }).map((_, i) => {
    const agent = pick(rnd, agents);
    const outcome = pick(rnd, ['success', 'failure', 'pending', 'mixed']);
    const minutesAgo = 30 + i * 17;
    return {
      id: stableId('dec_demo', i + 1),
      org_id: 'org_demo',
      agent_id: agent.agent_id,
      decision: pick(rnd, [
        'Switch to canonical JSON signing to prevent drift.',
        'Require pairing approvals for verified agents.',
        'Throttle risky actions behind HITL.',
        'Prefer read-only scopes for integrations by default.',
        'Enable replay window for SSE.',
      ]),
      context: pick(rnd, [
        'Observed inconsistent signatures across SDKs.',
        'New user onboarding needs to be painless.',
        'Auditability is a must for production agents.',
        '',
      ]),
      reasoning: null,
      outcome,
      confidence: int(rnd, 45, 95),
      timestamp: isoFromNow(minutesAgo * 60 * 1000),
      tags: pick(rnd, ['security,signing', 'onboarding,ux', 'reliability,sse', 'governance,hitl', '']),
    };
  });

  const lessons = Array.from({ length: 10 }).map((_, i) => ({
    id: stableId('les_demo', i + 1),
    org_id: 'org_demo',
    lesson: pick(rnd, [
      'Sign canonical JSON, not raw JSON.stringify output.',
      'Pairing beats manual key upload for beginners.',
      'Block writes in demo mode to avoid leaking secrets.',
      'Make server env vs agent env painfully explicit.',
      'Bulk approvals are essential for 50+ agents.',
    ]),
    confidence: int(rnd, 65, 96),
    times_validated: int(rnd, 0, 12),
    source_decisions: null,
    timestamp: isoFromNow((12 + i * 29) * 60 * 1000),
  }));

  const goals = Array.from({ length: 6 }).map((_, i) => ({
    id: stableId('goal_demo', i + 1),
    org_id: 'org_demo',
    title: pick(rnd, [
      'Bring 50 agents online safely',
      'Reduce invalid signatures to zero',
      'Ship demo mode without a database',
      'Add local admin login for self-host',
      'Add pairing inbox + approve all',
      'Improve guard policy explainability',
    ]),
    progress: int(rnd, 10, 95),
    status: 'active',
    cost_estimate: Math.round((rnd() * 35) * 100) / 100,
    created_at: isoFromNow(int(rnd, 1, 14) * 24 * 60 * 60 * 1000),
    agent_id: null,
    milestones: [],
    total_cost: Math.round((rnd() * 35) * 100) / 100,
  }));

  const contacts = Array.from({ length: 10 }).map((_, i) => {
    const daysAhead = int(rnd, -2, 10);
    const due = new Date(BASE_NOW + daysAhead * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return {
      id: stableId('ct_demo', i + 1),
      name: pick(rnd, ['Alex', 'Morgan', 'Sam', 'Riley', 'Jordan', 'Taylor', 'Casey', 'Jamie']) + ` ${pick(rnd, ['K.', 'S.', 'L.', 'R.'])}`,
      platform: pick(rnd, ['email', 'slack', 'discord', 'github']),
      temperature: pick(rnd, ['HOT', 'WARM', 'COLD']),
      context: pick(rnd, ['Pilot customer', 'Security review', 'Integration help', 'Feedback loop']),
      lastContact: isoFromNow(int(rnd, 1, 20) * 24 * 60 * 60 * 1000),
      interactions: int(rnd, 0, 12),
      followUpDate: rnd() > 0.3 ? due : null,
    };
  });

  const events = Array.from({ length: 6 }).map((_, i) => {
    const hoursAhead = 2 + i * 18;
    const start = isoInFuture(hoursAhead * 60 * 60 * 1000);
    const end = isoInFuture((hoursAhead * 60 + 45) * 60 * 1000);
    return {
      id: stableId('evt_demo', i + 1),
      summary: pick(rnd, ['Release window', 'Security review', 'Ops sync', 'Incident drill', 'Pairing approvals batch']),
      start_time: start,
      end_time: end,
      location: pick(rnd, ['Zoom', 'HQ', 'Discord', '']),
      description: null,
    };
  });

  const ideas = Array.from({ length: 10 }).map((_, i) => {
    const fun = int(rnd, 4, 10);
    const learn = int(rnd, 4, 10);
    const income = int(rnd, 4, 10);
    return {
      id: stableId('idea_demo', i + 1),
      title: pick(rnd, ['Agent pairing QR', 'Guardrail templates', 'Fleet heatmap', 'One-click self-host', 'Audit export']),
      description: pick(rnd, ['Make onboarding instant.', 'Reduce support burden.', 'Make risks visible.', 'Make it fun to explore.']),
      fun_factor: fun,
      learning_potential: learn,
      income_potential: income,
      score: fun + learn + income,
      status: pick(rnd, ['pending', 'shipped']),
      category: pick(rnd, ['product', 'security', 'ux', 'ops']),
      source: 'demo',
      captured_at: isoFromNow(int(rnd, 1, 30) * 24 * 60 * 60 * 1000),
    };
  });

  const interactions = Array.from({ length: 10 }).map((_, i) => {
    const agent = pick(rnd, agents);
    const minutesAgo = 90 + i * 53;
    return {
      id: stableId('ix_demo', i + 1),
      org_id: 'org_demo',
      agent_id: agent.agent_id,
      contact_name: pick(rnd, ['Alex', 'Morgan', 'Sam', 'Riley', 'Jordan', 'Taylor']),
      summary: pick(rnd, [
        'Followed up on onboarding blockers.',
        'Scheduled a pilot walkthrough.',
        'Clarified base URL vs demo.',
        'Reviewed pairing flow and approval inbox.',
      ]),
      direction: pick(rnd, ['outbound', 'inbound']),
      created_at: isoFromNow(minutesAgo * 60 * 1000),
    };
  });

  const tokenHistory = Array.from({ length: 7 }).map((_, i) => {
    const dayAgo = 6 - i;
    const date = new Date(BASE_NOW - dayAgo * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const tokensIn = int(rnd, 20_000, 120_000);
    const tokensOut = int(rnd, 15_000, 90_000);
    const totalTokens = tokensIn + tokensOut;
    return {
      date,
      tokensIn,
      tokensOut,
      totalTokens,
      peakContextPct: int(rnd, 25, 92),
      snapshots: int(rnd, 10, 120),
      estimatedCost: Math.round((0.2 + rnd() * 6) * 100) / 100,
    };
  });

  const tokensCurrent = {
    tokensIn: int(rnd, 200, 3500),
    tokensOut: int(rnd, 150, 2400),
    contextUsed: int(rnd, 20_000, 170_000),
    contextMax: 200_000,
    contextPct: 0,
    hourlyPctLeft: int(rnd, 15, 90),
    weeklyPctLeft: int(rnd, 10, 80),
    hourlyUsed: 0,
    weeklyUsed: 0,
    compactions: int(rnd, 0, 8),
    model: pick(rnd, ['gpt-4o-mini', 'gpt-4o', 'claude-3.5-sonnet', 'o3-mini']),
    session: 'demo',
    agentId: null,
    updatedAt: isoFromNow(int(rnd, 1, 8) * 60 * 1000),
  };
  tokensCurrent.contextPct = Math.round((tokensCurrent.contextUsed / tokensCurrent.contextMax) * 100);
  tokensCurrent.hourlyUsed = 100 - tokensCurrent.hourlyPctLeft;
  tokensCurrent.weeklyUsed = 100 - tokensCurrent.weeklyPctLeft;

  const tokensToday = {
    date: new Date(BASE_NOW).toISOString().slice(0, 10),
    tokensIn: int(rnd, 10_000, 80_000),
    tokensOut: int(rnd, 10_000, 65_000),
    totalTokens: 0,
    peakContextPct: int(rnd, 30, 95),
    snapshots: int(rnd, 25, 180),
    estimatedCost: Math.round((0.2 + rnd() * 4.5) * 100) / 100,
  };
  tokensToday.totalTokens = tokensToday.tokensIn + tokensToday.tokensOut;

  const content = Array.from({ length: 14 }).map((_, i) => {
    const agent = pick(rnd, agents);
    const platform = pick(rnd, ['Docs', 'LinkedIn', 'Twitter', 'Blog', 'Internal']);
    const status = pick(rnd, ['draft', 'published']);
    return {
      id: stableId('cnt_demo', i + 1),
      org_id: 'org_demo',
      agent_id: agent.agent_id,
      title: pick(rnd, [
        'Swarm map: what it means',
        'Why verified agents matter',
        'How approvals stop bad deploys',
        'Demo mode architecture overview',
        'Runbooks: guardrails that stick',
      ]) + ` (#${i + 1})`,
      platform,
      status,
      url: rnd() > 0.6 ? `https://example.com/post/${i + 1}` : null,
      body: null,
      created_at: isoFromNow(int(rnd, 2, 240) * 60 * 1000),
    };
  });

  const policies = [
    {
      id: stableId('gp_demo', 1).replace('gp_demo_', 'gp_'),
      name: 'Block ultra high risk',
      policy_type: 'risk_threshold',
      rules: JSON.stringify({ threshold: 90, action: 'block' }),
      active: 1,
    },
    {
      id: stableId('gp_demo', 2).replace('gp_demo_', 'gp_'),
      name: 'Require approval for deploy/security',
      policy_type: 'require_approval',
      rules: JSON.stringify({ action_types: ['deploy', 'security'], action: 'require_approval' }),
      active: 1,
    },
    {
      id: stableId('gp_demo', 3).replace('gp_demo_', 'gp_'),
      name: 'Rate limit noisy agents',
      policy_type: 'rate_limit',
      rules: JSON.stringify({ max_actions: 30, window_minutes: 60, action: 'warn' }),
      active: 1,
    },
    {
      id: stableId('gp_demo', 4).replace('gp_demo_', 'gp_'),
      name: 'Block delete actions (example)',
      policy_type: 'block_action_type',
      rules: JSON.stringify({ action_types: ['cleanup'], action: 'block' }),
      active: 0,
    },
  ].map((p, i) => ({
    ...p,
    org_id: 'org_demo',
    created_by: 'demo_user',
    created_at: isoFromNow((240 + i * 60) * 60 * 1000),
    updated_at: isoFromNow((20 + i * 15) * 60 * 1000),
  }));

  const guardDecisions = Array.from({ length: 24 }).map((_, i) => {
    const agent = pick(rnd, agents);
    const action_type = pick(rnd, actionTypes);
    const risk = int(rnd, 5, 99);
    const decision = risk >= 90 ? 'block' : risk >= 80 ? 'require_approval' : risk >= 60 ? 'warn' : 'allow';
    return {
      id: stableId('gd_demo', i + 1),
      org_id: 'org_demo',
      agent_id: agent.agent_id,
      action_type,
      risk_score: risk,
      decision,
      reason: pick(rnd, [
        'Matched risk threshold policy.',
        'Action type requires approval.',
        'Rate limit warning.',
        'No policy matched; default allow.',
      ]),
      created_at: isoFromNow((5 + i * 17) * 60 * 1000),
    };
  });

  const messageThreads = Array.from({ length: 6 }).map((_, i) => {
    const createdBy = pick(rnd, agents).agent_id;
    const participants = [createdBy, pick(rnd, agents).agent_id, pick(rnd, agents).agent_id]
      .filter((v, idx, arr) => arr.indexOf(v) === idx);
    const status = rnd() > 0.25 ? 'open' : 'resolved';
    const createdAt = isoFromNow((60 + i * 180) * 60 * 1000);
    const updatedAt = isoFromNow((10 + i * 60) * 60 * 1000);
    const resolvedAt = status === 'resolved' ? isoFromNow((5 + i * 40) * 60 * 1000) : null;
    return {
      id: stableId('mt_demo', i + 1),
      org_id: 'org_demo',
      name: pick(rnd, ['Release coordination', 'Incident follow-up', 'Policy tuning', 'Pairing rollout', 'Ops sync']) + ` #${i + 1}`,
      participants: JSON.stringify(participants),
      status,
      created_by: createdBy,
      summary: rnd() > 0.5 ? pick(rnd, ['Decided next rollout steps.', 'Identified missing guard coverage.', 'Captured action items.']) : null,
      created_at: createdAt,
      updated_at: updatedAt,
      resolved_at: resolvedAt,
      message_count: int(rnd, 2, 18),
      last_message_at: isoFromNow(int(rnd, 3, 55) * 60 * 1000),
    };
  });

  const sharedDocs = Array.from({ length: 5 }).map((_, i) => {
    const createdBy = pick(rnd, agents).agent_id;
    const lastEditedBy = rnd() > 0.3 ? pick(rnd, agents).agent_id : createdBy;
    const createdAt = isoFromNow((600 + i * 240) * 60 * 1000);
    const updatedAt = isoFromNow((30 + i * 90) * 60 * 1000);
    return {
      id: stableId('sd_demo', i + 1),
      org_id: 'org_demo',
      name: pick(rnd, ['Runbook: Deploys', 'Guard Policy Templates', 'Swarm Notes', 'Onboarding Checklist', 'Incident Timeline']),
      content: [
        '# Shared Doc',
        '',
        'This is demo data. In a real workspace, agents can write here via the SDK.',
        '',
        '- Decisions',
        '- Open questions',
        '- Links to actions',
      ].join('\n'),
      created_by: createdBy,
      last_edited_by: lastEditedBy,
      version: int(rnd, 1, 7),
      created_at: createdAt,
      updated_at: updatedAt,
    };
  });

  const messages = Array.from({ length: 28 }).map((_, i) => {
    const isSent = i % 4 === 0;
    const from = isSent ? 'dashboard' : pick(rnd, agents).agent_id;
    const to = isSent ? pick(rnd, agents).agent_id : 'dashboard';
    const broadcast = !isSent && rnd() > 0.75;
    const thread = rnd() > 0.6 ? pick(rnd, messageThreads).id : null;
    const createdAt = isoFromNow((3 + i * 23) * 60 * 1000);
    const unread = !isSent && rnd() > 0.45;
    return {
      id: stableId('msg_demo', i + 1),
      org_id: 'org_demo',
      thread_id: thread,
      from_agent_id: from,
      to_agent_id: broadcast ? null : to,
      message_type: pick(rnd, ['info', 'action', 'question', 'status', 'lesson']),
      subject: rnd() > 0.4 ? pick(rnd, ['Heads up', 'Need approval', 'FYI', 'Question', 'Update']) : null,
      body: pick(rnd, [
        'Seeing elevated error rate on /api/actions. Investigating.',
        'Queued a deploy but requires approval.',
        'Swarm map suggests a new dependency edge.',
        'Should we tighten risk threshold for prod deploys?',
        'Captured a lesson learned from the last rollout.',
      ]),
      urgent: rnd() > 0.85,
      status: unread ? 'sent' : (rnd() > 0.7 ? 'archived' : 'read'),
      read_at: unread ? null : isoFromNow(int(rnd, 1, 120) * 60 * 1000),
      doc_ref: null,
      created_at: createdAt,
    };
  });

  const contextPoints = Array.from({ length: 14 }).map((_, i) => {
    const agent = rnd() > 0.5 ? pick(rnd, agents).agent_id : null;
    const importance = int(rnd, 2, 10);
    const createdAt = isoFromNow((30 + i * 41) * 60 * 1000);
    return {
      id: stableId('cp_demo', i + 1),
      org_id: 'org_demo',
      agent_id: agent,
      content: pick(rnd, [
        'Prefer one-click pairing to avoid PEM confusion.',
        'Demo mode must be read-only and must not accept secrets.',
        'Treat base URL vs API key as separate mental models.',
        'Bulk approvals are required for fleet onboarding.',
      ]),
      category: pick(rnd, ['insight', 'decision', 'task', 'question', 'general']),
      importance,
      session_date: createdAt.slice(0, 10),
      created_at: createdAt,
    };
  });

  const contextThreads = Array.from({ length: 4 }).map((_, i) => {
    const agent = rnd() > 0.5 ? pick(rnd, agents).agent_id : null;
    const createdAt = isoFromNow((400 + i * 120) * 60 * 1000);
    const updatedAt = isoFromNow((40 + i * 30) * 60 * 1000);
    return {
      id: stableId('cth_demo', i + 1),
      org_id: 'org_demo',
      agent_id: agent,
      name: pick(rnd, ['Onboarding', 'Guardrails', 'Swarm', 'Incidents']) + ` Thread ${i + 1}`,
      summary: pick(rnd, [
        'Tracking decisions and follow-ups.',
        'Notes on reliability and controls.',
        'Open questions and next steps.',
      ]),
      status: rnd() > 0.25 ? 'active' : 'closed',
      created_at: createdAt,
      updated_at: updatedAt,
    };
  });

  const contextEntries = [];
  for (let i = 0; i < contextThreads.length; i++) {
    const t = contextThreads[i];
    const n = 3 + (i % 3);
    for (let j = 0; j < n; j++) {
      contextEntries.push({
        id: stableId('ce_demo', contextEntries.length + 1),
        org_id: 'org_demo',
        thread_id: t.id,
        content: pick(rnd, [
          'Decision: ship demo as real UI with fixture APIs.',
          'Open loop: add SDK helper pairIfNeeded().',
          'Assumption: users will self-host; keep costs user-owned.',
          'Lesson: block writes in demo mode to prevent secret ingestion.',
        ]),
        created_at: isoFromNow((300 + j * 25 + i * 70) * 60 * 1000),
      });
    }
  }

  const handoffs = Array.from({ length: 10 }).map((_, i) => {
    const agent = pick(rnd, agents).agent_id;
    const createdAt = isoFromNow((80 + i * 90) * 60 * 1000);
    return {
      id: stableId('ho_demo', i + 1),
      org_id: 'org_demo',
      agent_id: agent,
      session_date: createdAt.slice(0, 10),
      summary: pick(rnd, [
        'Shipped guard policy updates; monitoring for regressions.',
        'Investigated invalid signatures; pairing flow recommended.',
        'Reduced action noise; adjusted rate limits.',
      ]),
      key_decisions: JSON.stringify(['Enable approve-all for pairings', 'Add read-only demo mode']),
      open_tasks: JSON.stringify(['Verify webhook delivery failures', 'Backfill learning recommendations']),
      mood_notes: pick(rnd, ['focused', 'cautious', 'optimistic', 'tired']),
      next_priorities: JSON.stringify(['Stabilize demo', 'Improve onboarding UX']),
      created_at: createdAt,
    };
  });

  const snippets = Array.from({ length: 10 }).map((_, i) => {
    const createdAt = isoFromNow((900 + i * 140) * 60 * 1000);
    const tags = [pick(rnd, ['onboarding', 'security', 'guard', 'sse', 'pairing']), pick(rnd, ['sdk', 'ui', 'ops', 'docs'])];
    return {
      id: stableId('sn_demo', i + 1),
      org_id: 'org_demo',
      agent_id: rnd() > 0.6 ? pick(rnd, agents).agent_id : null,
      name: pick(rnd, ['pairIfNeeded', 'createAction', 'guard', 'webhookVerify', 'sseSubscribe']) + `_${i + 1}`,
      description: pick(rnd, ['Common pattern', 'Safe default', 'Ops snippet', 'Template']) ,
      code: [
        '// Demo snippet',
        'export function example() {',
        '  return "hello";',
        '}',
      ].join('\n'),
      language: pick(rnd, ['javascript', 'typescript', 'python']),
      tags: JSON.stringify(tags),
      use_count: int(rnd, 0, 42),
      created_at: createdAt,
    };
  });

  const preferences = {
    observations_count: 12,
    preferences: [
      { id: stableId('up_demo', 1), preference: 'Prefer clear, copy/paste instructions', category: 'docs', confidence: 90, created_at: isoFromNow(6 * 60 * 60 * 1000) },
      { id: stableId('up_demo', 2), preference: 'Default to read-only demo safety', category: 'security', confidence: 85, created_at: isoFromNow(12 * 60 * 60 * 1000) },
    ],
    recent_moods: [
      { id: stableId('um_demo', 1), mood: 'focused', energy: 7, notes: null, created_at: isoFromNow(2 * 60 * 60 * 1000) },
      { id: stableId('um_demo', 2), mood: 'stressed', energy: 5, notes: 'Onboarding friction detected', created_at: isoFromNow(26 * 60 * 60 * 1000) },
    ],
    top_approaches: [
      { id: stableId('ua_demo', 1), approach: 'Ship the simplest safe thing', context: 'demo mode', success_count: 8, fail_count: 1, created_at: isoFromNow(10 * 24 * 60 * 60 * 1000), updated_at: isoFromNow(2 * 24 * 60 * 60 * 1000) },
      { id: stableId('ua_demo', 2), approach: 'One-click over docs', context: 'pairing', success_count: 6, fail_count: 0, created_at: isoFromNow(18 * 24 * 60 * 60 * 1000), updated_at: isoFromNow(1 * 24 * 60 * 60 * 1000) },
    ],
  };

  const workflows = Array.from({ length: 6 }).map((_, i) => {
    const enabled = rnd() > 0.25 ? 1 : 0;
    const runCount = int(rnd, 0, 55);
    const lastRun = runCount ? isoFromNow(int(rnd, 10, 800) * 60 * 1000) : null;
    const steps = Array.from({ length: int(rnd, 3, 9) }).map((__, j) => pick(rnd, ['scan', 'guard', 'approve', 'deploy', 'verify', 'notify', 'rollback']) + `_${j + 1}`);
    return {
      id: stableId('wf_demo', i + 1),
      org_id: 'org_demo',
      agent_id: rnd() > 0.6 ? pick(rnd, agents).agent_id : null,
      name: pick(rnd, ['Release', 'Security Audit', 'Daily Digest', 'Webhook Test', 'Fleet Sync']) + ` ${i + 1}`,
      description: pick(rnd, ['Automated chain', 'Ops workflow', 'Safety-first run', 'Maintenance']) ,
      enabled,
      steps: JSON.stringify(steps),
      run_count: runCount,
      last_run: lastRun,
    };
  });

  const executions = Array.from({ length: 14 }).map((_, i) => {
    const wf = pick(rnd, workflows);
    const total = int(rnd, 3, 9);
    const completed = int(rnd, 0, total);
    const status = completed === total ? (rnd() > 0.15 ? 'success' : 'failed') : 'running';
    return {
      id: stableId('ex_demo', i + 1),
      org_id: 'org_demo',
      agent_id: wf.agent_id,
      workflow_id: wf.id,
      workflow_name: wf.name,
      status,
      steps_completed: completed,
      total_steps: total,
      started_at: isoFromNow((10 + i * 37) * 60 * 1000),
      error: status === 'failed' ? 'Step 3 failed: permission denied (demo)' : null,
    };
  });

  const schedules = Array.from({ length: 6 }).map((_, i) => {
    const wf = workflows[i % workflows.length];
    return {
      id: stableId('sj_demo', i + 1),
      org_id: 'org_demo',
      workflow_name: wf.name,
      schedule: pick(rnd, ['0 * * * *', '*/15 * * * *', '0 9 * * 1-5', '0 0 * * 0']),
      description: pick(rnd, ['Runs periodically', 'Ops cadence', 'Weekly maintenance', 'Alert sweep']),
      enabled: rnd() > 0.2 ? 1 : 0,
      next_run: isoInFuture((30 + i * 45) * 60 * 1000),
      run_count: int(rnd, 0, 120),
    };
  });

  const webhooks = Array.from({ length: 3 }).map((_, i) => {
    const createdAt = isoFromNow((1200 + i * 220) * 60 * 1000);
    const events = rnd() > 0.5 ? ['all'] : [pick(rnd, ['high_impact_low_oversight', 'repeated_failures', 'stale_loop'])];
    return {
      id: `wh_demo_${String(i + 1).padStart(3, '0')}`,
      org_id: 'org_demo',
      url: `https://hooks.example.com/dashclaw/${i + 1}`,
      secret: `************************${String(int(rnd, 1000, 9999))}`,
      events: JSON.stringify(events),
      active: rnd() > 0.2 ? 1 : 0,
      failure_count: int(rnd, 0, 4),
      last_triggered_at: isoFromNow(int(rnd, 5, 900) * 60 * 1000),
      created_at: createdAt,
      created_by: 'demo_user',
    };
  });

  const webhookDeliveries = {};
  for (const wh of webhooks) {
    webhookDeliveries[wh.id] = Array.from({ length: int(rnd, 3, 10) }).map((_, i) => ({
      id: stableId('wd_demo', int(rnd, 1, 9999)) + `_${wh.id}`,
      org_id: 'org_demo',
      webhook_id: wh.id,
      event_type: pick(rnd, ['test', 'high_impact_low_oversight', 'repeated_failures', 'stale_loop']),
      status: rnd() > 0.2 ? 'success' : 'failed',
      response_status: pick(rnd, [200, 200, 204, 500, 502]),
      attempted_at: isoFromNow((8 + i * 45) * 60 * 1000),
      duration_ms: int(rnd, 40, 900),
    }));
  }

  const activityLogs = Array.from({ length: 90 }).map((_, i) => {
    const actorType = pick(rnd, ['user', 'system', 'api_key', 'cron']);
    const actorId = actorType === 'user' ? 'demo_user' : actorType === 'api_key' ? 'ak_demo_001' : actorType;
    const action = pick(rnd, [
      'key.created', 'invite.created', 'invite.revoked', 'role.changed',
      'webhook.created', 'webhook.deleted', 'webhook.tested',
      'signal.detected', 'alert.email_sent',
      'action.allowed', 'action.denied',
    ]);
    const createdAt = isoFromNow((2 + i * 13) * 60 * 1000);
    const details = JSON.stringify({ demo: true, note: pick(rnd, ['seeded', 'simulated', 'fixture']) });
    return {
      id: stableId('al_demo', i + 1),
      org_id: 'org_demo',
      actor_id: actorId,
      actor_type: actorType,
      actor_name: actorType === 'user' ? 'Demo Viewer' : null,
      actor_image: null,
      action,
      resource_type: pick(rnd, ['webhook', 'invite', 'action', 'policy', 'key']),
      resource_id: pick(rnd, [stableId('act_demo', int(rnd, 1, 220)), webhooks[0].id, policies[0].id]),
      details,
      ip_address: '203.0.113.10',
      created_at: createdAt,
    };
  });

  const teamOrg = {
    id: 'org_demo',
    name: 'Demo Workspace',
    plan: 'open_source',
    created_at: isoFromNow(60 * 24 * 60 * 60 * 1000),
  };

  const teamMembers = [
    { id: 'demo_user', email: 'demo@dashclaw.io', name: 'Demo Viewer', image: null, role: 'admin' },
    { id: 'usr_demo_002', email: 'ops@example.com', name: 'Ops Lead', image: null, role: 'admin' },
    { id: 'usr_demo_003', email: 'security@example.com', name: 'Security', image: null, role: 'member' },
    { id: 'usr_demo_004', email: 'eng@example.com', name: 'Engineer', image: null, role: 'member' },
  ].map((m, i) => ({
    ...m,
    org_id: 'org_demo',
    created_at: isoFromNow((80 + i * 300) * 60 * 1000),
    last_login_at: isoFromNow(int(rnd, 2, 4000) * 60 * 1000),
    is_self: m.id === 'demo_user',
  }));

  const teamInvites = Array.from({ length: 2 }).map((_, i) => ({
    id: `inv_demo_${String(i + 1).padStart(3, '0')}`,
    email: i === 0 ? 'new.user@example.com' : null,
    role: i === 0 ? 'member' : 'admin',
    status: 'pending',
    expires_at: isoInFuture((12 + i * 36) * 60 * 60 * 1000),
    created_at: isoFromNow((180 + i * 90) * 60 * 1000),
  }));

  const usage = {
    plan: 'open_source',
    limits: {
      actions_per_month: Infinity,
      agents: Infinity,
      members: Infinity,
      api_keys: Infinity,
    },
    usage: {
      actions_per_month: actions.length,
      agents: agents.length,
      members: 4,
      api_keys: 3,
    },
    subscription: {
      status: 'n/a',
      current_period_end: null,
      trial_ends_at: null,
      has_stripe: false,
    },
    stripe_configured: false,
  };

  const settings = [
    { key: 'OPENAI_API_KEY', hasValue: true },
    { key: 'ANTHROPIC_API_KEY', hasValue: true },
    { key: 'GITHUB_TOKEN', hasValue: false },
    { key: 'SLACK_BOT_TOKEN', hasValue: false },
    { key: 'DISCORD_BOT_TOKEN', hasValue: true },
    { key: 'RESEND_API_KEY', hasValue: false },
    { key: 'LINEAR_API_KEY', hasValue: false },
    { key: 'CLOUDFLARE_API_TOKEN', hasValue: false },
  ].map((s, i) => ({
    id: i + 1,
    org_id: 'org_demo',
    agent_id: null,
    key: s.key,
    value: s.hasValue ? '****' : null,
    category: 'integration',
    encrypted: true,
    updated_at: isoFromNow(int(rnd, 5, 500) * 60 * 1000),
    is_inherited: false,
    hasValue: s.hasValue,
  }));

  const connections = [
    { agent_id: 'agent_01', provider: 'github', status: 'active', auth_type: 'oauth' },
    { agent_id: 'agent_02', provider: 'slack', status: 'inactive', auth_type: 'api_key' },
    { agent_id: 'agent_03', provider: 'neon', status: 'active', auth_type: 'environment' },
    { agent_id: 'agent_04', provider: 'notion', status: 'active', auth_type: 'api_key' },
  ].map((c, i) => ({
    id: stableId('conn_demo', i + 1),
    org_id: 'org_demo',
    agent_id: c.agent_id,
    provider: c.provider,
    auth_type: c.auth_type,
    plan_name: null,
    status: c.status,
    metadata: null,
    reported_at: isoFromNow(int(rnd, 30, 900) * 60 * 1000),
    updated_at: isoFromNow(int(rnd, 5, 120) * 60 * 1000),
  }));

  const pairings = Array.from({ length: 12 }).map((_, i) => {
    const agent = agents[i % agents.length];
    return {
      id: `pair_demo_${String(i + 1).padStart(3, '0')}`,
      agent_id: agent.agent_id,
      agent_name: agent.agent_name,
      algorithm: 'RSASSA-PKCS1-v1_5',
      status: 'pending',
      created_at: isoFromNow((5 + i * 7) * 60 * 1000),
      updated_at: isoFromNow((5 + i * 7) * 60 * 1000),
      expires_at: isoInFuture((15 + i) * 60 * 1000),
    };
  });

  const memory = {
    health: {
      score: int(rnd, 68, 96),
      totalFiles: int(rnd, 12, 80),
      totalLines: int(rnd, 12_000, 160_000),
      totalSizeKb: int(rnd, 500, 24_000),
      memoryMdLines: int(rnd, 400, 8_000),
      oldestDaily: '2026-01-06',
      newestDaily: '2026-02-14',
      daysWithNotes: int(rnd, 18, 44),
      avgLinesPerDay: int(rnd, 50, 900),
      duplicates: int(rnd, 0, 12),
      staleCount: int(rnd, 0, 5),
      updatedAt: isoFromNow(int(rnd, 2, 50) * 60 * 1000),
    },
    entities: [
      { name: 'DashClaw', type: 'service', mentions: 42 },
      { name: 'Cinder', type: 'person', mentions: 18 },
      { name: 'Vercel', type: 'service', mentions: 15 },
      { name: 'Neon', type: 'service', mentions: 12 },
      { name: 'pairIfNeeded()', type: 'tool', mentions: 9 },
      { name: 'middleware.js', type: 'file', mentions: 7 },
    ],
    topics: [
      { name: 'pairing', mentions: 21 },
      { name: 'signatures', mentions: 18 },
      { name: 'onboarding', mentions: 16 },
      { name: 'guardrails', mentions: 11 },
    ],
    entityBreakdown: [
      { type: 'service', count: 2, totalMentions: 57 },
      { type: 'person', count: 1, totalMentions: 18 },
      { type: 'tool', count: 1, totalMentions: 9 },
      { type: 'file', count: 1, totalMentions: 7 },
    ],
  };

  const signals = [
    {
      severity: 'red',
      type: 'high_impact_low_oversight',
      label: 'High Impact, Low Oversight',
      detail: 'A high-risk action executed without a matching authorization scope.',
      agent_id: 'agent_07',
      action_id: actions.find(a => a.risk_score >= 85)?.action_id || actions[0].action_id,
    },
    {
      severity: 'amber',
      type: 'repeated_failures',
      label: 'Repeated Failures',
      detail: 'Same action type failed multiple times in the last hour.',
      agent_id: 'agent_12',
      action_id: actions.find(a => a.status === 'failed')?.action_id || actions[3].action_id,
    },
    {
      severity: 'amber',
      type: 'stale_loop',
      label: 'Stale Loop',
      detail: 'An open loop has exceeded its expected timeline.',
      agent_id: loops[0].agent_id,
      loop_id: loops[0].loop_id,
      action_id: loops[0].action_id,
    },
  ];

  const recommendations = Array.from({ length: 12 }).map((_, i) => ({
    id: stableId('lrec', i + 1),
    org_id: 'org_demo',
    agent_id: pick(rnd, agents).agent_id,
    action_type: pick(rnd, actionTypes),
    confidence: int(rnd, 55, 96),
    sample_size: int(rnd, 5, 80),
    active: rnd() > 0.25,
    created_at: isoFromNow(int(rnd, 1, 30) * 24 * 60 * 60 * 1000),
    updated_at: isoFromNow(int(rnd, 1, 4) * 24 * 60 * 60 * 1000),
  }));

  const metrics = recommendations.map((rec) => ({
    recommendation_id: rec.id,
    org_id: 'org_demo',
    agent_id: rec.agent_id,
    action_type: rec.action_type,
    active: rec.active,
    telemetry: {
      fetched: int(rnd, 10, 180),
      applied: int(rnd, 0, 120),
      overridden: int(rnd, 0, 30),
      adoption_rate: rnd() * 0.9,
    },
    deltas: {
      success_lift: (rnd() - 0.3) * 0.5,
    },
  }));

  const metricsSummary = {
    active_recommendations: recommendations.filter(r => r.active).length,
    avg_adoption_rate: metrics.reduce((s, m) => s + (m.telemetry?.adoption_rate || 0), 0) / Math.max(1, metrics.length),
    avg_success_lift: metrics.reduce((s, m) => s + (m.deltas?.success_lift || 0), 0) / Math.max(1, metrics.length),
  };

  const securityStatus = {
    score: 93,
    checks: [
      { id: 'demo_read_only', status: 'ok', label: 'Demo Read-Only', detail: 'All write APIs are disabled in demo mode.' },
      { id: 'secret_ingest_blocked', status: 'ok', label: 'Secret Ingestion Blocked', detail: 'Demo does not store real keys or credentials.' },
      { id: 'signature_optional', status: 'info', label: 'Verified Agents Optional', detail: 'Signatures are optional unless enforcement is enabled.' },
      { id: 'cors', status: 'ok', label: 'CORS', detail: 'Restricted to the demo origin.' },
    ],
    timestamp: new Date(BASE_NOW).toISOString(),
  };

  return {
    agents,
    actions,
    loops,
    assumptions,
    decisions,
    lessons,
    goals,
    contacts,
    interactions,
    events,
    ideas,
    tokenHistory,
    tokensCurrent,
    tokensToday,
    content,
    policies,
    guardDecisions,
    messages,
    messageThreads,
    sharedDocs,
    contextPoints,
    contextThreads,
    contextEntries,
    handoffs,
    snippets,
    preferences,
    workflows,
    executions,
    schedules,
    webhooks,
    webhookDeliveries,
    activityLogs,
    teamOrg,
    teamMembers,
    teamInvites,
    usage,
    settings,
    connections,
    pairings,
    memory,
    signals,
    recommendations,
    metrics,
    metricsSummary,
    securityStatus,
  };
}

export function getDemoFixtures() {
  if (_cached) return _cached;
  _cached = buildFixtures();
  return _cached;
}
