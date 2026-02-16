import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeRequest } from '../helpers.js';

const { mockSql, mockGetActivePolicies, mockConvertPolicies, mockMapPolicies, mockLoadFramework, mockListFrameworks, mockAnalyzeGaps } = vi.hoisted(() => ({
  mockSql: Object.assign(vi.fn(async () => []), { query: vi.fn(async () => []) }),
  mockGetActivePolicies: vi.fn(),
  mockConvertPolicies: vi.fn(),
  mockMapPolicies: vi.fn(),
  mockLoadFramework: vi.fn(),
  mockListFrameworks: vi.fn(),
  mockAnalyzeGaps: vi.fn(),
}));

vi.mock('@/lib/db.js', () => ({ getSql: () => mockSql }));
vi.mock('@/lib/repositories/guardrails.repository.js', () => ({ getActivePolicies: mockGetActivePolicies }));
vi.mock('@/lib/guardrails/converter.js', () => ({ convertPolicies: mockConvertPolicies }));
vi.mock('@/lib/compliance/mapper.js', () => ({ mapPolicies: mockMapPolicies, loadFramework: mockLoadFramework, listFrameworks: mockListFrameworks }));
vi.mock('@/lib/compliance/analyzer.js', () => ({ analyzeGaps: mockAnalyzeGaps }));

import { GET } from '@/api/compliance/gaps/route.js';

describe('/api/compliance/gaps GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgres://unit-test';
  });

  it('returns 400 when framework param is missing', async () => {
    mockListFrameworks.mockReturnValue(['soc2']);
    const res = await GET(makeRequest('http://localhost/api/compliance/gaps', { headers: { 'x-org-id': 'org_1' } }));
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown framework', async () => {
    mockLoadFramework.mockImplementation(() => { throw new Error('Framework not found'); });
    mockListFrameworks.mockReturnValue([]);
    const res = await GET(makeRequest('http://localhost/api/compliance/gaps?framework=nope', { headers: { 'x-org-id': 'org_1' } }));
    expect(res.status).toBe(404);
  });

  it('returns gap analysis for valid framework', async () => {
    const fakeGap = { framework: 'SOC 2', remediation_plan: [], risk_assessment: { overall_risk: 'LOW' } };
    mockLoadFramework.mockReturnValue({ framework: 'SOC 2', controls: [] });
    mockGetActivePolicies.mockResolvedValue([]);
    mockConvertPolicies.mockReturnValue({ version: 1, project: 'test', policies: [] });
    mockMapPolicies.mockReturnValue({ controls: [], summary: {} });
    mockAnalyzeGaps.mockReturnValue(fakeGap);

    const res = await GET(makeRequest('http://localhost/api/compliance/gaps?framework=soc2', { headers: { 'x-org-id': 'org_1' } }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.risk_assessment.overall_risk).toBe('LOW');
  });

  it('calls analyzeGaps with compliance map', async () => {
    const fakeMap = { controls: [], summary: {} };
    mockLoadFramework.mockReturnValue({ framework: 'X', controls: [] });
    mockGetActivePolicies.mockResolvedValue([]);
    mockConvertPolicies.mockReturnValue({ version: 1, project: 'test', policies: [] });
    mockMapPolicies.mockReturnValue(fakeMap);
    mockAnalyzeGaps.mockReturnValue({});

    await GET(makeRequest('http://localhost/api/compliance/gaps?framework=soc2', { headers: { 'x-org-id': 'org_1' } }));
    expect(mockAnalyzeGaps).toHaveBeenCalledWith(fakeMap);
  });

  it('returns 500 on internal error', async () => {
    mockLoadFramework.mockReturnValue({ framework: 'X', controls: [] });
    mockGetActivePolicies.mockRejectedValue(new Error('db fail'));
    const res = await GET(makeRequest('http://localhost/api/compliance/gaps?framework=soc2', { headers: { 'x-org-id': 'org_1' } }));
    expect(res.status).toBe(500);
  });

  it('passes org_id to getActivePolicies', async () => {
    mockLoadFramework.mockReturnValue({ framework: 'X', controls: [] });
    mockGetActivePolicies.mockResolvedValue([]);
    mockConvertPolicies.mockReturnValue({ version: 1, project: 'test', policies: [] });
    mockMapPolicies.mockReturnValue({ controls: [], summary: {} });
    mockAnalyzeGaps.mockReturnValue({});

    await GET(makeRequest('http://localhost/api/compliance/gaps?framework=soc2', { headers: { 'x-org-id': 'org_77' } }));
    expect(mockGetActivePolicies).toHaveBeenCalledWith(mockSql, 'org_77');
  });

  it('includes available frameworks in error response', async () => {
    mockListFrameworks.mockReturnValue(['soc2', 'iso27001']);
    const res = await GET(makeRequest('http://localhost/api/compliance/gaps', { headers: { 'x-org-id': 'org_1' } }));
    const data = await res.json();
    expect(data.available).toEqual(['soc2', 'iso27001']);
  });
});
