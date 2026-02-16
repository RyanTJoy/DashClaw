import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeRequest } from '../helpers.js';

const { mockSql, mockGetGuardEvidence, mockGetActionEvidence } = vi.hoisted(() => ({
  mockSql: Object.assign(vi.fn(async () => []), { query: vi.fn(async () => []) }),
  mockGetGuardEvidence: vi.fn(),
  mockGetActionEvidence: vi.fn(),
}));

vi.mock('@/lib/db.js', () => ({ getSql: () => mockSql }));
vi.mock('@/lib/repositories/compliance.repository.js', () => ({
  getGuardDecisionEvidence: mockGetGuardEvidence,
  getActionRecordEvidence: mockGetActionEvidence,
}));

import { GET } from '@/api/compliance/evidence/route.js';

describe('/api/compliance/evidence GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgres://unit-test';
  });

  it('returns evidence with default 30d window', async () => {
    mockGetGuardEvidence.mockResolvedValue([{ decision: 'block', count: '5' }]);
    mockGetActionEvidence.mockResolvedValue([{ action_type: 'deploy', count: '10' }]);

    const res = await GET(makeRequest('http://localhost/api/compliance/evidence', { headers: { 'x-org-id': 'org_1' } }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.window).toBe('30d');
    expect(data.window_days).toBe(30);
    expect(data.evidence.guard_decisions_blocked).toBe(5);
  });

  it('respects custom window param', async () => {
    mockGetGuardEvidence.mockResolvedValue([]);
    mockGetActionEvidence.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/compliance/evidence?window=7d', { headers: { 'x-org-id': 'org_1' } }));
    expect(mockGetGuardEvidence).toHaveBeenCalledWith(mockSql, 'org_1', 7);
  });

  it('aggregates guard decision totals', async () => {
    mockGetGuardEvidence.mockResolvedValue([
      { decision: 'block', count: '3' },
      { decision: 'warn', count: '2' },
      { decision: 'allow', count: '10' },
    ]);
    mockGetActionEvidence.mockResolvedValue([]);

    const res = await GET(makeRequest('http://localhost/api/compliance/evidence', { headers: { 'x-org-id': 'org_1' } }));
    const data = await res.json();
    expect(data.evidence.guard_decisions_total).toBe(15);
    expect(data.evidence.guard_decisions_blocked).toBe(3);
    expect(data.evidence.approval_requests).toBe(2);
  });

  it('includes action record breakdown', async () => {
    mockGetGuardEvidence.mockResolvedValue([]);
    mockGetActionEvidence.mockResolvedValue([{ action_type: 'deploy', count: '5' }, { action_type: 'build', count: '3' }]);

    const res = await GET(makeRequest('http://localhost/api/compliance/evidence', { headers: { 'x-org-id': 'org_1' } }));
    const data = await res.json();
    expect(data.evidence.action_records_total).toBe(8);
    expect(data.evidence.action_breakdown).toHaveLength(2);
  });

  it('includes generated_at timestamp', async () => {
    mockGetGuardEvidence.mockResolvedValue([]);
    mockGetActionEvidence.mockResolvedValue([]);
    const res = await GET(makeRequest('http://localhost/api/compliance/evidence', { headers: { 'x-org-id': 'org_1' } }));
    const data = await res.json();
    expect(data.generated_at).toBeDefined();
  });

  it('returns 500 on error', async () => {
    mockGetGuardEvidence.mockRejectedValue(new Error('db fail'));
    const res = await GET(makeRequest('http://localhost/api/compliance/evidence', { headers: { 'x-org-id': 'org_1' } }));
    expect(res.status).toBe(500);
  });

  it('counts require_approval as approval request', async () => {
    mockGetGuardEvidence.mockResolvedValue([{ decision: 'require_approval', count: '4' }]);
    mockGetActionEvidence.mockResolvedValue([]);
    const res = await GET(makeRequest('http://localhost/api/compliance/evidence', { headers: { 'x-org-id': 'org_1' } }));
    const data = await res.json();
    expect(data.evidence.approval_requests).toBe(4);
  });
});
