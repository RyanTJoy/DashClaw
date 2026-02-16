import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeRequest } from '../helpers.js';

const { mockSql, mockRoutePending, mockCheckTimeouts, mockTimingSafeCompare } = vi.hoisted(() => ({
  mockSql: Object.assign(vi.fn(async () => []), { query: vi.fn(async () => []) }),
  mockRoutePending: vi.fn(),
  mockCheckTimeouts: vi.fn(),
  mockTimingSafeCompare: vi.fn(),
}));

vi.mock('@/lib/db.js', () => ({ getSql: () => mockSql }));
vi.mock('@/lib/repositories/routing.repository.js', () => ({
  routePending: mockRoutePending,
  checkTimeouts: mockCheckTimeouts,
}));
vi.mock('@/lib/timing-safe.js', () => ({ timingSafeCompare: mockTimingSafeCompare }));

import { POST } from '@/api/cron/routing-maintenance/route.js';

describe('/api/cron/routing-maintenance POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgres://unit-test';
    process.env.CRON_SECRET = 'test-secret';
  });

  it('returns 503 when CRON_SECRET not configured', async () => {
    delete process.env.CRON_SECRET;
    const res = await POST(makeRequest('http://localhost/api/cron/routing-maintenance', {
      headers: { 'x-org-id': 'org_1', authorization: 'Bearer test' },
      body: {},
    }));
    expect(res.status).toBe(503);
  });

  it('returns 401 with invalid token', async () => {
    mockTimingSafeCompare.mockReturnValue(false);
    const res = await POST(makeRequest('http://localhost/api/cron/routing-maintenance', {
      headers: { 'x-org-id': 'org_1', authorization: 'Bearer wrong' },
      body: {},
    }));
    expect(res.status).toBe(401);
  });

  it('returns 401 when authorization header is missing', async () => {
    mockTimingSafeCompare.mockReturnValue(false);
    const res = await POST(makeRequest('http://localhost/api/cron/routing-maintenance', {
      headers: { 'x-org-id': 'org_1' },
      body: {},
    }));
    expect(res.status).toBe(401);
  });

  it('routes pending tasks and checks timeouts', async () => {
    mockTimingSafeCompare.mockReturnValue(true);
    mockRoutePending.mockResolvedValue([{ task: { id: 'rt_1' } }]);
    mockCheckTimeouts.mockResolvedValue([{ task: { id: 'rt_2' } }]);

    const res = await POST(makeRequest('http://localhost/api/cron/routing-maintenance', {
      headers: { 'x-org-id': 'org_1', authorization: 'Bearer test-secret' },
      body: {},
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.routed).toBe(1);
    expect(data.timed_out).toBe(1);
  });

  it('includes processed_at timestamp', async () => {
    mockTimingSafeCompare.mockReturnValue(true);
    mockRoutePending.mockResolvedValue([]);
    mockCheckTimeouts.mockResolvedValue([]);

    const res = await POST(makeRequest('http://localhost/api/cron/routing-maintenance', {
      headers: { 'x-org-id': 'org_1', authorization: 'Bearer test-secret' },
      body: {},
    }));
    const data = await res.json();
    expect(data.processed_at).toBeDefined();
  });

  it('returns 500 on internal error', async () => {
    mockTimingSafeCompare.mockReturnValue(true);
    mockRoutePending.mockRejectedValue(new Error('routing fail'));

    const res = await POST(makeRequest('http://localhost/api/cron/routing-maintenance', {
      headers: { 'x-org-id': 'org_1', authorization: 'Bearer test-secret' },
      body: {},
    }));
    expect(res.status).toBe(500);
  });
});
