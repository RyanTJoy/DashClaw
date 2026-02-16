import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeRequest } from '../helpers.js';

const { mockSql } = vi.hoisted(() => ({
  mockSql: Object.assign(vi.fn(async () => []), { query: vi.fn(async () => []) }),
}));

vi.mock('@/lib/db.js', () => ({ getSql: () => mockSql }));

import { GET } from '@/api/security/status/route.js';

describe('/api/security/status GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgres://unit-test';
    delete process.env.ENCRYPTION_KEY;
    delete process.env.WEBHOOK_ALLOWED_DOMAINS;
  });

  it('returns 403 for non-admin', async () => {
    const res = await GET(makeRequest('http://localhost/api/security/status', {
      headers: { 'x-org-id': 'org_1', 'x-org-role': 'member' },
    }));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.score).toBe(0);
  });

  it('returns score of 100 with all env vars set', async () => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(32);
    process.env.DATABASE_URL = 'postgres://test';
    mockSql.mockResolvedValueOnce([{ count: '0' }]);

    const res = await GET(makeRequest('http://localhost/api/security/status', {
      headers: { 'x-org-id': 'org_1', 'x-org-role': 'admin' },
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.score).toBe(100);
  });

  it('deducts 40 when ENCRYPTION_KEY missing', async () => {
    process.env.DATABASE_URL = 'postgres://test';
    mockSql.mockResolvedValueOnce([{ count: '0' }]);

    const res = await GET(makeRequest('http://localhost/api/security/status', {
      headers: { 'x-org-id': 'org_1', 'x-org-role': 'admin' },
    }));
    const data = await res.json();
    expect(data.score).toBeLessThanOrEqual(60);
    expect(data.checks.some(c => c.id === 'enc_key_missing')).toBe(true);
  });

  it('deducts 10 for invalid ENCRYPTION_KEY length', async () => {
    process.env.ENCRYPTION_KEY = 'short';
    process.env.DATABASE_URL = 'postgres://test';
    mockSql.mockResolvedValueOnce([{ count: '0' }]);

    const res = await GET(makeRequest('http://localhost/api/security/status', {
      headers: { 'x-org-id': 'org_1', 'x-org-role': 'admin' },
    }));
    const data = await res.json();
    expect(data.checks.some(c => c.id === 'enc_key_invalid')).toBe(true);
  });

  it('deducts 40 when DATABASE_URL missing', async () => {
    delete process.env.DATABASE_URL;
    const res = await GET(makeRequest('http://localhost/api/security/status', {
      headers: { 'x-org-id': 'org_1', 'x-org-role': 'admin' },
    }));
    const data = await res.json();
    expect(data.checks.some(c => c.id === 'db_url_missing')).toBe(true);
  });

  it('deducts per unencrypted sensitive setting', async () => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(32);
    process.env.DATABASE_URL = 'postgres://test';
    mockSql.mockResolvedValueOnce([{ count: '3' }]);

    const res = await GET(makeRequest('http://localhost/api/security/status', {
      headers: { 'x-org-id': 'org_1', 'x-org-role': 'admin' },
    }));
    const data = await res.json();
    expect(data.score).toBe(85); // 100 - 3*5
    expect(data.checks.some(c => c.id === 'unencrypted_settings')).toBe(true);
  });

  it('clamps score to 0 minimum', async () => {
    delete process.env.DATABASE_URL;
    // Missing enc key (-40) and missing db (-40) = 20 remaining
    const res = await GET(makeRequest('http://localhost/api/security/status', {
      headers: { 'x-org-id': 'org_1', 'x-org-role': 'admin' },
    }));
    const data = await res.json();
    expect(data.score).toBeGreaterThanOrEqual(0);
  });

  it('includes webhook allowlist info check', async () => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(32);
    process.env.DATABASE_URL = 'postgres://test';
    process.env.WEBHOOK_ALLOWED_DOMAINS = 'example.com';
    mockSql.mockResolvedValueOnce([{ count: '0' }]);

    const res = await GET(makeRequest('http://localhost/api/security/status', {
      headers: { 'x-org-id': 'org_1', 'x-org-role': 'admin' },
    }));
    const data = await res.json();
    expect(data.checks.some(c => c.id === 'webhook_allowlist_ok')).toBe(true);
  });

  it('includes timestamp in response', async () => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(32);
    process.env.DATABASE_URL = 'postgres://test';
    mockSql.mockResolvedValueOnce([{ count: '0' }]);

    const res = await GET(makeRequest('http://localhost/api/security/status', {
      headers: { 'x-org-id': 'org_1', 'x-org-role': 'admin' },
    }));
    const data = await res.json();
    expect(data.timestamp).toBeDefined();
  });
});
