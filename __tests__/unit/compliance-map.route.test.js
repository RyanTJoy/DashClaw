import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeRequest } from '../helpers.js';

const { mockSql, mockGetActivePolicies, mockConvertPolicies, mockMapPolicies, mockLoadFramework, mockListFrameworks } = vi.hoisted(() => ({
  mockSql: Object.assign(vi.fn(async () => []), { query: vi.fn(async () => []) }),
  mockGetActivePolicies: vi.fn(),
  mockConvertPolicies: vi.fn(),
  mockMapPolicies: vi.fn(),
  mockLoadFramework: vi.fn(),
  mockListFrameworks: vi.fn(),
}));

vi.mock('@/lib/db.js', () => ({ getSql: () => mockSql }));
vi.mock('@/lib/repositories/guardrails.repository.js', () => ({ getActivePolicies: mockGetActivePolicies }));
vi.mock('@/lib/guardrails/converter.js', () => ({ convertPolicies: mockConvertPolicies }));
vi.mock('@/lib/compliance/mapper.js', () => ({ mapPolicies: mockMapPolicies, loadFramework: mockLoadFramework, listFrameworks: mockListFrameworks }));

import { GET } from '@/api/compliance/map/route.js';

describe('/api/compliance/map GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgres://unit-test';
  });

  it('returns 400 when framework param is missing', async () => {
    mockListFrameworks.mockReturnValue(['soc2']);
    const res = await GET(makeRequest('http://localhost/api/compliance/map', { headers: { 'x-org-id': 'org_1' } }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('framework');
  });

  it('returns 404 for unknown framework', async () => {
    mockLoadFramework.mockImplementation(() => { throw new Error('Framework not found: unknown'); });
    mockListFrameworks.mockReturnValue(['soc2']);
    const res = await GET(makeRequest('http://localhost/api/compliance/map?framework=unknown', { headers: { 'x-org-id': 'org_1' } }));
    expect(res.status).toBe(404);
  });

  it('returns compliance map for valid framework', async () => {
    const fakeMap = { framework: 'SOC 2', summary: { coverage_percentage: 75 }, controls: [] };
    mockLoadFramework.mockReturnValue({ framework: 'SOC 2', controls: [] });
    mockGetActivePolicies.mockResolvedValue([]);
    mockConvertPolicies.mockReturnValue({ version: 1, project: 'test', policies: [] });
    mockMapPolicies.mockReturnValue(fakeMap);

    const res = await GET(makeRequest('http://localhost/api/compliance/map?framework=soc2', { headers: { 'x-org-id': 'org_1' } }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.framework).toBe('SOC 2');
  });

  it('calls getActivePolicies with correct org', async () => {
    mockLoadFramework.mockReturnValue({ framework: 'SOC 2', controls: [] });
    mockGetActivePolicies.mockResolvedValue([]);
    mockConvertPolicies.mockReturnValue({ version: 1, project: 'test', policies: [] });
    mockMapPolicies.mockReturnValue({});

    await GET(makeRequest('http://localhost/api/compliance/map?framework=soc2', { headers: { 'x-org-id': 'org_99' } }));
    expect(mockGetActivePolicies).toHaveBeenCalledWith(mockSql, 'org_99');
  });

  it('returns available frameworks in 400 error', async () => {
    mockListFrameworks.mockReturnValue(['soc2', 'gdpr']);
    const res = await GET(makeRequest('http://localhost/api/compliance/map', { headers: { 'x-org-id': 'org_1' } }));
    const data = await res.json();
    expect(data.available).toEqual(['soc2', 'gdpr']);
  });

  it('returns 500 on internal error', async () => {
    mockLoadFramework.mockReturnValue({ framework: 'X', controls: [] });
    mockGetActivePolicies.mockRejectedValue(new Error('db down'));
    const res = await GET(makeRequest('http://localhost/api/compliance/map?framework=soc2', { headers: { 'x-org-id': 'org_1' } }));
    expect(res.status).toBe(500);
  });

  it('converts policies before mapping', async () => {
    const policies = [{ id: 'gp_1', name: 'P1', policy_type: 'block_action_type', rules: '{}', active: 1 }];
    mockLoadFramework.mockReturnValue({ framework: 'X', controls: [] });
    mockGetActivePolicies.mockResolvedValue(policies);
    mockConvertPolicies.mockReturnValue({ version: 1, project: 'org-org_1', policies: [] });
    mockMapPolicies.mockReturnValue({});

    await GET(makeRequest('http://localhost/api/compliance/map?framework=soc2', { headers: { 'x-org-id': 'org_1' } }));
    expect(mockConvertPolicies).toHaveBeenCalledWith(policies, 'org-org_1');
  });
});
