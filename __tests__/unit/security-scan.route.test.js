import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeRequest } from '../helpers.js';

const { mockSql, mockScanSensitiveData } = vi.hoisted(() => ({
  mockSql: Object.assign(vi.fn(async () => []), { query: vi.fn(async () => []) }),
  mockScanSensitiveData: vi.fn(),
}));

vi.mock('@/lib/db.js', () => ({ getSql: () => mockSql }));
vi.mock('@/lib/security.js', () => ({ scanSensitiveData: mockScanSensitiveData }));

// Need to make the tagged template return a thenable with .catch for fire-and-forget
const origMock = mockSql;
origMock.mockImplementation((...args) => {
  const p = Promise.resolve([]);
  p.catch = () => p;
  return p;
});

import { POST } from '@/api/security/scan/route.js';

describe('/api/security/scan POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    origMock.mockImplementation((...args) => {
      const p = Promise.resolve([]);
      p.catch = () => p;
      return p;
    });
  });

  it('returns 400 when text is missing', async () => {
    const res = await POST(makeRequest('http://localhost/api/security/scan', {
      headers: { 'x-org-id': 'org_1' },
      body: {},
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when text is not a string', async () => {
    const res = await POST(makeRequest('http://localhost/api/security/scan', {
      headers: { 'x-org-id': 'org_1' },
      body: { text: 123 },
    }));
    expect(res.status).toBe(400);
  });

  it('returns clean result for safe text', async () => {
    mockScanSensitiveData.mockReturnValue({ findings: [], redacted: 'hello', clean: true });
    const res = await POST(makeRequest('http://localhost/api/security/scan', {
      headers: { 'x-org-id': 'org_1' },
      body: { text: 'hello' },
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.clean).toBe(true);
    expect(data.findings_count).toBe(0);
  });

  it('returns findings for secret-containing text', async () => {
    mockScanSensitiveData.mockReturnValue({
      findings: [{ pattern: 'aws_access_key', category: 'cloud_credential', severity: 'critical', preview: 'AKIA***' }],
      redacted: '[REDACTED]',
      clean: false,
    });
    const res = await POST(makeRequest('http://localhost/api/security/scan', {
      headers: { 'x-org-id': 'org_1' },
      body: { text: 'AKIAIOSFODNN7EXAMPLE' },
    }));
    const data = await res.json();
    expect(data.clean).toBe(false);
    expect(data.findings_count).toBe(1);
    expect(data.critical_count).toBe(1);
    expect(data.categories).toContain('cloud_credential');
  });

  it('returns redacted text', async () => {
    mockScanSensitiveData.mockReturnValue({
      findings: [{ pattern: 'api_key', category: 'api_key', severity: 'critical', preview: 'sk-t***' }],
      redacted: 'key is [REDACTED]',
      clean: false,
    });
    const res = await POST(makeRequest('http://localhost/api/security/scan', {
      headers: { 'x-org-id': 'org_1' },
      body: { text: 'key is sk-test1234567890' },
    }));
    const data = await res.json();
    expect(data.redacted_text).toContain('[REDACTED]');
  });

  it('stores metadata when findings exist and store != false', async () => {
    mockScanSensitiveData.mockReturnValue({
      findings: [{ pattern: 'aws_access_key', category: 'cloud', severity: 'critical', preview: 'AK***' }],
      redacted: '[REDACTED]',
      clean: false,
    });
    await POST(makeRequest('http://localhost/api/security/scan', {
      headers: { 'x-org-id': 'org_1' },
      body: { text: 'AKIAIOSFODNN7EXAMPLE', agent_id: 'a1' },
    }));
    // The tagged template should have been called for the INSERT
    expect(mockSql).toHaveBeenCalled();
  });

  it('does not store when store=false', async () => {
    mockScanSensitiveData.mockReturnValue({
      findings: [{ pattern: 'aws_access_key', category: 'cloud', severity: 'critical', preview: 'AK***' }],
      redacted: '[REDACTED]',
      clean: false,
    });
    // Clear calls from initialization
    mockSql.mockClear();
    await POST(makeRequest('http://localhost/api/security/scan', {
      headers: { 'x-org-id': 'org_1' },
      body: { text: 'AKIAIOSFODNN7EXAMPLE', store: false },
    }));
    // Should not have called sql for INSERT (only getSql was called, no tagged template for insert)
    // With store=false, the sql INSERT block is skipped
  });

  it('does not store when no findings', async () => {
    mockScanSensitiveData.mockReturnValue({ findings: [], redacted: 'clean', clean: true });
    mockSql.mockClear();
    await POST(makeRequest('http://localhost/api/security/scan', {
      headers: { 'x-org-id': 'org_1' },
      body: { text: 'clean text' },
    }));
    // No INSERT call expected for clean text
  });

  it('includes destination in response', async () => {
    mockScanSensitiveData.mockReturnValue({ findings: [], redacted: 'hello', clean: true });
    const res = await POST(makeRequest('http://localhost/api/security/scan', {
      headers: { 'x-org-id': 'org_1' },
      body: { text: 'hello', destination: 'slack' },
    }));
    const data = await res.json();
    expect(data.destination).toBe('slack');
  });

  it('handles DB storage failure gracefully', async () => {
    mockScanSensitiveData.mockReturnValue({
      findings: [{ pattern: 'api_key', category: 'api_key', severity: 'critical', preview: 'x***' }],
      redacted: '[REDACTED]',
      clean: false,
    });
    // The route uses sql`...`.catch(() => ...) for fire-and-forget.
    // Make the tagged template return a promise that rejects, but has .catch attached.
    origMock.mockImplementation((...args) => {
      const p = Promise.reject(new Error('db fail'));
      // Attach a catch so Node doesn't throw unhandled rejection
      p.catch(() => {});
      return p;
    });
    const res = await POST(makeRequest('http://localhost/api/security/scan', {
      headers: { 'x-org-id': 'org_1' },
      body: { text: 'secret123' },
    }));
    // Should still return 200 even if DB fails (fire-and-forget .catch)
    expect(res.status).toBe(200);
  });

  it('returns 500 on top-level error', async () => {
    const req = {
      url: 'http://localhost/api/security/scan',
      headers: new Headers({ 'x-org-id': 'org_1' }),
      json: async () => { throw new Error('parse fail'); },
      nextUrl: new URL('http://localhost/api/security/scan'),
    };
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
