function lcg(seed) {
  let state = seed >>> 0;
  return () => {
    // Numerical Recipes LCG
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pick(rnd, items) {
  return items[Math.floor(rnd() * items.length)];
}

function minutesAgoIso(mins) {
  return new Date(Date.now() - mins * 60 * 1000).toISOString();
}

export function getDemoSnapshot() {
  const rnd = lcg(0xD15C1A57);

  const statusPool = ['active', 'idle', 'offline', 'degraded'];
  const actionTypes = ['deploy', 'research', 'security', 'message', 'build', 'review', 'monitor', 'fix'];

  const agents = Array.from({ length: 50 }).map((_, i) => {
    const n = i + 1;
    const status = pick(rnd, statusPool);
    const lastSeenMins = status === 'offline' ? 60 + Math.floor(rnd() * 720) : Math.floor(rnd() * 30);
    const openLoops = Math.floor(rnd() * (status === 'offline' ? 2 : 6));
    const risk = Math.floor(rnd() * 100);

    return {
      agent_id: `agent_${String(n).padStart(2, '0')}`,
      agent_name: `Agent ${String(n).padStart(2, '0')}`,
      status,
      last_seen_at: minutesAgoIso(lastSeenMins),
      open_loops: openLoops,
      risk_score: risk,
      verified: rnd() > 0.25,
    };
  });

  const actions = Array.from({ length: 24 }).map((_, i) => {
    const agent = pick(rnd, agents);
    const action_type = pick(rnd, actionTypes);
    const mins = i * 3 + Math.floor(rnd() * 3);
    const status = rnd() > 0.85 ? 'failed' : rnd() > 0.7 ? 'running' : 'completed';
    const cost = Math.round((0.02 + rnd() * 0.8) * 100) / 100;

    return {
      action_id: `demo_act_${String(i + 1).padStart(3, '0')}`,
      agent_id: agent.agent_id,
      agent_name: agent.agent_name,
      action_type,
      status,
      created_at: minutesAgoIso(mins),
      cost_usd: cost,
    };
  });

  const totals = {
    agents_total: agents.length,
    agents_online: agents.filter(a => a.status === 'active' || a.status === 'idle' || a.status === 'degraded').length,
    pending_approvals: 3,
    pending_pairings: 12,
    verified_agents: agents.filter(a => a.verified).length,
    cost_today_usd: actions.reduce((sum, a) => sum + a.cost_usd, 0).toFixed(2),
  };

  return { totals, agents, actions };
}

