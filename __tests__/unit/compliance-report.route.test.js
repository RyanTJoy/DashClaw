import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeRequest } from '../helpers.js';

const { mockSql, mockGetActivePolicies, mockConvertPolicies, mockMapPolicies, mockLoadFramework, mockListFrameworks, mockGenMd, mockGenJson, mockCreateSnapshot, mockAnalyzeGaps } = vi.hoisted(() => ({
  mockSql: Object.assign(vi.fn(async () => []), { query: vi.fn(async () => []) }),
  mockGetActivePolicies: vi.fn(),
  mockConvertPolicies: vi.fn(),
  mockMapPolicies: vi.fn(),
  mockLoadFramework: vi.fn(),
  mockListFrameworks: vi.fn(),
  mockGenMd: vi.fn(),
  mockGenJson: vi.fn(),
  mockCreateSnapshot: vi.fn(),
  mockAnalyzeGaps: vi.fn(),
}));

vi.mock('@/lib/db.js', () => ({ getSql: () => mockSql }));
vi.mock('@/lib/repositories/guardrails.repository.js', () => ({ getActivePolicies: mockGetActivePolicies }));
vi.mock('@/lib/guardrails/converter.js', () => ({ convertPolicies: mockConvertPolicies }));
vi.mock('@/lib/compliance/mapper.js', () => ({ mapPolicies: mockMapPolicies, loadFramework: mockLoadFramework, listFrameworks: mockListFrameworks }));
vi.mock('@/lib/compliance/reporter.js', () => ({ generateMarkdownReport: mockGenMd, generateJsonReport: mockGenJson }));
vi.mock('@/lib/repositories/compliance.repository.js', () => ({ createSnapshot: mockCreateSnapshot }));
vi.mock('@/lib/compliance/analyzer.js', () => ({ analyzeGaps: mockAnalyzeGaps }));

import { GET } from '@/api/compliance/report/route.js';

function setupMocks() {
  mockLoadFramework.mockReturnValue({ framework: 'SOC 2', controls: [] });
  mockGetActivePolicies.mockResolvedValue([]);
  mockConvertPolicies.mockReturnValue({ version: 1, project: 'test', policies: [] });
  mockMapPolicies.mockReturnValue({ summary: { total_controls: 5, covered: 3, partial: 1, gaps: 1, coverage_percentage: 70 }, controls: [] });
  mockAnalyzeGaps.mockReturnValue({ risk_assessment: { overall_risk: 'MEDIUM' } });
  mockCreateSnapshot.mockResolvedValue({});
}

describe('/api/compliance/report GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgres://unit-test';
  });

  it('returns 400 when framework param missing', async () => {
    mockListFrameworks.mockReturnValue(['soc2']);
    const res = await GET(makeRequest('http://localhost/api/compliance/report', { headers: { 'x-org-id': 'org_1' } }));
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown framework', async () => {
    mockLoadFramework.mockImplementation(() => { throw new Error('not found'); });
    mockListFrameworks.mockReturnValue([]);
    const res = await GET(makeRequest('http://localhost/api/compliance/report?framework=nope', { headers: { 'x-org-id': 'org_1' } }));
    expect(res.status).toBe(404);
  });

  it('returns markdown report by default', async () => {
    setupMocks();
    mockGenMd.mockReturnValue('# Markdown Report');
    const res = await GET(makeRequest('http://localhost/api/compliance/report?framework=soc2', { headers: { 'x-org-id': 'org_1' } }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.format).toBe('md');
    expect(data.report).toBe('# Markdown Report');
  });

  it('returns JSON report when format=json', async () => {
    setupMocks();
    mockGenJson.mockReturnValue('{"test": true}');
    const res = await GET(makeRequest('http://localhost/api/compliance/report?framework=soc2&format=json', { headers: { 'x-org-id': 'org_1' } }));
    const data = await res.json();
    expect(data.format).toBe('json');
    expect(data.report).toBe('{"test": true}');
  });

  it('saves snapshot after generating report', async () => {
    setupMocks();
    mockGenMd.mockReturnValue('report');
    await GET(makeRequest('http://localhost/api/compliance/report?framework=soc2', { headers: { 'x-org-id': 'org_1' } }));
    expect(mockCreateSnapshot).toHaveBeenCalledWith(
      mockSql,
      'org_1',
      expect.objectContaining({
        framework: 'soc2',
        coverage_percentage: 70,
        risk_level: 'MEDIUM',
      })
    );
  });

  it('snapshot ID starts with cs_', async () => {
    setupMocks();
    mockGenMd.mockReturnValue('report');
    await GET(makeRequest('http://localhost/api/compliance/report?framework=soc2', { headers: { 'x-org-id': 'org_1' } }));
    const snapshotArg = mockCreateSnapshot.mock.calls[0][2];
    expect(snapshotArg.id).toMatch(/^cs_/);
  });

  it('stores full_report only for JSON format', async () => {
    setupMocks();
    mockGenJson.mockReturnValue('{"data":1}');
    await GET(makeRequest('http://localhost/api/compliance/report?framework=soc2&format=json', { headers: { 'x-org-id': 'org_1' } }));
    const snapshotArg = mockCreateSnapshot.mock.calls[0][2];
    expect(snapshotArg.full_report).toBe('{"data":1}');
  });

  it('stores null full_report for markdown format', async () => {
    setupMocks();
    mockGenMd.mockReturnValue('markdown');
    await GET(makeRequest('http://localhost/api/compliance/report?framework=soc2', { headers: { 'x-org-id': 'org_1' } }));
    const snapshotArg = mockCreateSnapshot.mock.calls[0][2];
    expect(snapshotArg.full_report).toBeNull();
  });

  it('includes generated_at in response', async () => {
    setupMocks();
    mockGenMd.mockReturnValue('report');
    const res = await GET(makeRequest('http://localhost/api/compliance/report?framework=soc2', { headers: { 'x-org-id': 'org_1' } }));
    const data = await res.json();
    expect(data.generated_at).toBeDefined();
  });

  it('returns 500 on internal error', async () => {
    mockLoadFramework.mockReturnValue({ framework: 'X', controls: [] });
    mockGetActivePolicies.mockRejectedValue(new Error('db fail'));
    const res = await GET(makeRequest('http://localhost/api/compliance/report?framework=soc2', { headers: { 'x-org-id': 'org_1' } }));
    expect(res.status).toBe(500);
  });
});
