import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeRequest } from '../helpers.js';

const {
  mockSql,
  mockListAgentsForOrg,
  mockAttachAgentConnections,
} = vi.hoisted(() => ({
  mockSql: Object.assign(vi.fn(async () => []), { query: vi.fn(async () => []) }),
  mockListAgentsForOrg: vi.fn(),
  mockAttachAgentConnections: vi.fn(),
}));

vi.mock('@/lib/db.js', () => ({ getSql: () => mockSql }));
vi.mock('@/lib/repositories/agents.repository.js', () => ({
  listAgentsForOrg: mockListAgentsForOrg,
  attachAgentConnections: mockAttachAgentConnections,
  upsertAgentPresence: vi.fn(async () => undefined),
  ensureAgentPresenceTable: vi.fn(async () => undefined),
}));

import { GET } from '@/api/agents/route.js';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DATABASE_URL = 'postgres://unit-test';
  mockSql.mockImplementation(async () => []);
  mockListAgentsForOrg.mockResolvedValue([]);
  mockAttachAgentConnections.mockResolvedValue(undefined);
});

describe('/api/agents GET', () => {
  it('returns agents for the org', async () => {
    const agents = [
      { agent_id: 'agent_1', agent_name: 'Builder', status: 'online' },
      { agent_id: 'agent_2', agent_name: 'Reviewer', status: 'idle' },
    ];
    mockListAgentsForOrg.mockResolvedValue(agents);

    const res = await GET(makeRequest('http://localhost/api/agents', {
      headers: { 'x-org-id': 'org_1' },
    }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.agents).toHaveLength(2);
    expect(data.agents[0].agent_id).toBe('agent_1');
    expect(data.lastUpdated).toBeDefined();
  });

  it('does not call attachAgentConnections by default', async () => {
    mockListAgentsForOrg.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/agents', {
      headers: { 'x-org-id': 'org_1' },
    }));

    expect(mockAttachAgentConnections).not.toHaveBeenCalled();
  });

  it('calls attachAgentConnections when include_connections=true', async () => {
    const agents = [{ agent_id: 'agent_1' }];
    mockListAgentsForOrg.mockResolvedValue(agents);

    await GET(makeRequest('http://localhost/api/agents?include_connections=true', {
      headers: { 'x-org-id': 'org_1' },
    }));

    expect(mockAttachAgentConnections).toHaveBeenCalledWith(mockSql, 'org_1', agents);
  });

  it('passes org_id to listAgentsForOrg', async () => {
    await GET(makeRequest('http://localhost/api/agents', {
      headers: { 'x-org-id': 'org_42' },
    }));

    expect(mockListAgentsForOrg).toHaveBeenCalledWith(mockSql, 'org_42');
  });

  it('returns empty agents array on repository error', async () => {
    mockListAgentsForOrg.mockRejectedValue(new Error('db fail'));

    const res = await GET(makeRequest('http://localhost/api/agents', {
      headers: { 'x-org-id': 'org_1' },
    }));

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.agents).toEqual([]);
  });

  it('returns debug metadata when debug=true', async () => {
    mockListAgentsForOrg.mockResolvedValue([]);
    const res = await GET(makeRequest('http://localhost/api/agents?debug=true', {
      headers: { 'x-org-id': 'org_debug' },
    }));

    const data = await res.json();
    expect(data.meta).toBeDefined();
    expect(data.meta.org_id).toBe('org_debug');
    expect(data.meta.server_time).toBeDefined();
  });
});
