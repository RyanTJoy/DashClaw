import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeRequest } from '../helpers.js';

const { mockSql, mockGetActivePolicies, mockConvertPolicies, mockGenMd, mockGenJson } = vi.hoisted(() => ({
  mockSql: Object.assign(vi.fn(async () => []), { query: vi.fn(async () => []) }),
  mockGetActivePolicies: vi.fn(),
  mockConvertPolicies: vi.fn(),
  mockGenMd: vi.fn(),
  mockGenJson: vi.fn(),
}));

vi.mock('@/lib/db.js', () => ({ getSql: () => mockSql }));
vi.mock('@/lib/repositories/guardrails.repository.js', () => ({ getActivePolicies: mockGetActivePolicies }));
vi.mock('@/lib/guardrails/converter.js', () => ({ convertPolicies: mockConvertPolicies }));
vi.mock('@/lib/guardrails/report.js', () => ({ generateMarkdownReport: mockGenMd, generateJsonReport: mockGenJson }));

import { GET } from '@/api/policies/proof/route.js';

describe('/api/policies/proof GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgres://unit-test';
  });

  it('returns markdown report by default', async () => {
    mockGetActivePolicies.mockResolvedValue([]);
    mockConvertPolicies.mockReturnValue({ version: 1, project: 'test', policies: [] });
    mockGenMd.mockReturnValue('# Proof Report');

    const res = await GET(makeRequest('http://localhost/api/policies/proof', { headers: { 'x-org-id': 'org_1' } }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.format).toBe('md');
    expect(data.report).toBe('# Proof Report');
  });

  it('returns JSON report when format=json', async () => {
    mockGetActivePolicies.mockResolvedValue([]);
    mockConvertPolicies.mockReturnValue({ version: 1, project: 'test', policies: [] });
    mockGenJson.mockReturnValue('{"proof": true}');

    const res = await GET(makeRequest('http://localhost/api/policies/proof?format=json', { headers: { 'x-org-id': 'org_1' } }));
    const data = await res.json();
    expect(data.format).toBe('json');
    expect(data.report).toBe('{"proof": true}');
  });

  it('includes generated_at', async () => {
    mockGetActivePolicies.mockResolvedValue([]);
    mockConvertPolicies.mockReturnValue({ version: 1, project: 'test', policies: [] });
    mockGenMd.mockReturnValue('report');

    const res = await GET(makeRequest('http://localhost/api/policies/proof', { headers: { 'x-org-id': 'org_1' } }));
    const data = await res.json();
    expect(data.generated_at).toBeDefined();
  });

  it('converts policies before report generation', async () => {
    const policies = [{ id: 'gp_1', active: 1 }];
    mockGetActivePolicies.mockResolvedValue(policies);
    mockConvertPolicies.mockReturnValue({ version: 1, project: 'org-org_1', policies: [] });
    mockGenMd.mockReturnValue('report');

    await GET(makeRequest('http://localhost/api/policies/proof', { headers: { 'x-org-id': 'org_1' } }));
    expect(mockConvertPolicies).toHaveBeenCalledWith(policies, 'org-org_1');
  });

  it('returns 500 on error', async () => {
    mockGetActivePolicies.mockRejectedValue(new Error('db fail'));
    const res = await GET(makeRequest('http://localhost/api/policies/proof', { headers: { 'x-org-id': 'org_1' } }));
    expect(res.status).toBe(500);
  });
});
