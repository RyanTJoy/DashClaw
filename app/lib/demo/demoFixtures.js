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
  const statuses = ['completed', 'running', 'failed', 'pending', 'cancelled'];
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
    const status = pick(rnd, statuses);
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
    events,
    ideas,
    tokenHistory,
    tokensCurrent,
    tokensToday,
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
