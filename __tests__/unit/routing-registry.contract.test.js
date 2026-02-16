import { describe, it, expect } from 'vitest';
import { registerAgent, getAgent, listAgents, updateAgentStatus, unregisterAgent, updateMetrics, getAllMetrics, getAgentMetrics } from '@/lib/routing/registry.js';
import { createSqlMock } from '../helpers.js';

describe('registerAgent', () => {
  it('inserts agent with upsert and returns row', async () => {
    const agent = { id: 'a1', name: 'Bot', capabilities: ['code'], maxConcurrent: 5 };
    const sql = createSqlMock({
      taggedResponses: [[{ id: 'a1', name: 'Bot', status: 'available' }]],
    });
    const result = await registerAgent(sql, 'org_1', agent);
    expect(result.id).toBe('a1');
    expect(sql.taggedCalls[0].text).toContain('INSERT INTO routing_agents');
    expect(sql.taggedCalls[0].text).toContain('ON CONFLICT');
  });

  it('generates ID when not provided', async () => {
    const agent = { name: 'Bot', capabilities: [] };
    const sql = createSqlMock({
      taggedResponses: [[{ id: 'ra_generated', name: 'Bot' }]],
    });
    await registerAgent(sql, 'org_1', agent);
    expect(sql.taggedCalls[0].values[0]).toMatch(/^ra_/);
  });
});

describe('getAgent', () => {
  it('returns agent row', async () => {
    const sql = createSqlMock({ taggedResponses: [[{ id: 'a1', name: 'Bot' }]] });
    const result = await getAgent(sql, 'org_1', 'a1');
    expect(result.id).toBe('a1');
  });

  it('returns null when not found', async () => {
    const sql = createSqlMock({ taggedResponses: [[]] });
    const result = await getAgent(sql, 'org_1', 'missing');
    expect(result).toBeNull();
  });
});

describe('listAgents', () => {
  it('returns all agents for org', async () => {
    const sql = createSqlMock({ taggedResponses: [[{ id: 'a1' }, { id: 'a2' }]] });
    const result = await listAgents(sql, 'org_1');
    expect(result).toHaveLength(2);
  });

  it('filters by status when provided', async () => {
    const sql = createSqlMock({ taggedResponses: [[{ id: 'a1' }]] });
    await listAgents(sql, 'org_1', 'available');
    expect(sql.taggedCalls[0].text).toContain('status');
  });
});

describe('updateAgentStatus', () => {
  it('updates and returns agent', async () => {
    const sql = createSqlMock({ taggedResponses: [[{ id: 'a1', status: 'busy' }]] });
    const result = await updateAgentStatus(sql, 'org_1', 'a1', 'busy');
    expect(result.status).toBe('busy');
  });

  it('returns null when agent not found', async () => {
    const sql = createSqlMock({ taggedResponses: [[]] });
    const result = await updateAgentStatus(sql, 'org_1', 'missing', 'busy');
    expect(result).toBeNull();
  });
});

describe('unregisterAgent', () => {
  it('deletes and returns agent', async () => {
    const sql = createSqlMock({
      taggedResponses: [
        [{ id: 'a1', name: 'Bot' }], // getAgent
        [], // DELETE
      ],
    });
    const result = await unregisterAgent(sql, 'org_1', 'a1');
    expect(result.id).toBe('a1');
  });

  it('returns null when agent not found', async () => {
    const sql = createSqlMock({ taggedResponses: [[]] });
    const result = await unregisterAgent(sql, 'org_1', 'missing');
    expect(result).toBeNull();
  });
});

describe('updateMetrics', () => {
  it('upserts metrics for skill', async () => {
    const sql = createSqlMock({ taggedResponses: [[]] });
    await updateMetrics(sql, 'org_1', 'a1', 'code', true, 1500);
    expect(sql.taggedCalls[0].text).toContain('INSERT INTO routing_agent_metrics');
    expect(sql.taggedCalls[0].text).toContain('ON CONFLICT');
  });
});

describe('getAllMetrics', () => {
  it('returns all metrics for org', async () => {
    const sql = createSqlMock({ taggedResponses: [[{ agent_id: 'a1', skill: 'code' }]] });
    const result = await getAllMetrics(sql, 'org_1');
    expect(result).toHaveLength(1);
  });
});

describe('getAgentMetrics', () => {
  it('returns metrics for specific agent', async () => {
    const sql = createSqlMock({ taggedResponses: [[{ agent_id: 'a1', skill: 'code' }]] });
    const result = await getAgentMetrics(sql, 'org_1', 'a1');
    expect(result).toHaveLength(1);
  });
});
