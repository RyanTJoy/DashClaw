import { describe, it, expect } from 'vitest';
import { findBestMatch, rankAgents } from '@/lib/routing/matcher.js';

function makeAgent(overrides = {}) {
  return {
    id: 'a1',
    name: 'Agent 1',
    capabilities: ['code', 'deploy'],
    status: 'available',
    current_load: 0,
    max_concurrent: 3,
    ...overrides,
  };
}

describe('findBestMatch', () => {
  it('returns null for no candidates', () => {
    expect(findBestMatch({ required_skills: ['code'] }, [], [])).toBeNull();
  });

  it('returns null when all agents at max capacity', () => {
    const agent = makeAgent({ current_load: 3, max_concurrent: 3 });
    expect(findBestMatch({ required_skills: ['code'] }, [agent], [])).toBeNull();
  });

  it('returns null when no skill match', () => {
    const agent = makeAgent({ capabilities: ['testing'] });
    const result = findBestMatch({ required_skills: ['code'] }, [agent], []);
    expect(result).toBeNull();
  });

  it('routes to least-loaded agent when no skills required', () => {
    const agents = [
      makeAgent({ id: 'a1', current_load: 2 }),
      makeAgent({ id: 'a2', current_load: 0 }),
    ];
    const result = findBestMatch({ required_skills: [] }, agents, []);
    expect(result.agent.id).toBe('a2');
    expect(result.reasons).toContain('No skill requirements, routed to least-loaded agent');
  });

  it('returns agent with best capability match', () => {
    const agents = [
      makeAgent({ id: 'a1', capabilities: ['code'] }),
      makeAgent({ id: 'a2', capabilities: ['code', 'deploy'] }),
    ];
    const result = findBestMatch({ required_skills: ['code', 'deploy'] }, agents, []);
    expect(result.agent.id).toBe('a2');
  });

  it('gives neutral score (12.5) for no history', () => {
    const agent = makeAgent();
    const result = findBestMatch({ required_skills: ['code'] }, [agent], []);
    expect(result.reasons.some(r => r.includes('neutral'))).toBe(true);
  });

  it('factors in performance history', () => {
    const agents = [
      makeAgent({ id: 'a1', capabilities: ['code'] }),
      makeAgent({ id: 'a2', capabilities: ['code'] }),
    ];
    const metrics = [
      { agent_id: 'a2', skill: 'code', tasks_completed: 9, tasks_failed: 1 },
    ];
    const result = findBestMatch({ required_skills: ['code'] }, agents, metrics);
    expect(result.agent.id).toBe('a2');
  });

  it('applies urgency boost for idle agent on critical task', () => {
    const agents = [
      makeAgent({ id: 'a1', current_load: 0, capabilities: ['code'] }),
      makeAgent({ id: 'a2', current_load: 1, capabilities: ['code'] }),
    ];
    const result = findBestMatch({ required_skills: ['code'], urgency: 'critical' }, agents, []);
    expect(result.agent.id).toBe('a1');
    expect(result.reasons.some(r => r.includes('Urgency boost'))).toBe(true);
  });

  it('handles string JSON capabilities', () => {
    const agent = makeAgent({ capabilities: JSON.stringify(['code', 'deploy']) });
    const result = findBestMatch({ required_skills: ['code'] }, [agent], []);
    expect(result).not.toBeNull();
  });

  it('handles string JSON required_skills', () => {
    const agent = makeAgent();
    const result = findBestMatch({ required_skills: '["code"]' }, [agent], []);
    expect(result).not.toBeNull();
  });

  it('filters offline agents', () => {
    const agent = makeAgent({ status: 'offline' });
    expect(findBestMatch({ required_skills: ['code'] }, [agent], [])).toBeNull();
  });

  it('uses skill priority for scoring', () => {
    const agents = [
      makeAgent({ id: 'a1', capabilities: [{ skill: 'code', priority: 10 }] }),
      makeAgent({ id: 'a2', capabilities: [{ skill: 'code', priority: 1 }] }),
    ];
    const result = findBestMatch({ required_skills: ['code'] }, agents, []);
    expect(result.agent.id).toBe('a1');
  });
});

describe('rankAgents', () => {
  it('ranks all candidates by score descending', () => {
    const agents = [
      makeAgent({ id: 'a1', capabilities: ['code'] }),
      makeAgent({ id: 'a2', capabilities: ['code', 'deploy'] }),
    ];
    const ranked = rankAgents({ required_skills: ['code', 'deploy'] }, agents, []);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].agent.id).toBe('a2');
  });

  it('excludes agents with zero score', () => {
    const agents = [
      makeAgent({ id: 'a1', capabilities: ['testing'] }),
    ];
    const ranked = rankAgents({ required_skills: ['code'] }, agents, []);
    expect(ranked).toHaveLength(0);
  });
});
