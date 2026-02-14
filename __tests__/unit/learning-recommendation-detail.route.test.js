import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockSql,
  neonMock,
  updateLearningRecommendationActiveMock,
} = vi.hoisted(() => ({
  mockSql: {},
  neonMock: vi.fn(() => ({})),
  updateLearningRecommendationActiveMock: vi.fn(),
}));

neonMock.mockImplementation(() => mockSql);

vi.mock('@neondatabase/serverless', () => ({
  neon: neonMock,
}));

vi.mock('@/lib/repositories/learningLoop.repository.js', () => ({
  updateLearningRecommendationActive: updateLearningRecommendationActiveMock,
}));

import { PATCH } from '@/api/learning/recommendations/[recommendationId]/route.js';

function makeRequest(url, { headers = {}, body } = {}) {
  return {
    url,
    headers: new Headers(headers),
    json: async () => body,
  };
}

describe('/api/learning/recommendations/[recommendationId] route', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://unit-test';
    vi.clearAllMocks();
  });

  it('PATCH blocks non-admin/non-service callers', async () => {
    const res = await PATCH(
      makeRequest('http://localhost/api/learning/recommendations/r1', {
        headers: { 'x-org-id': 'org_1', 'x-org-role': 'member' },
        body: { active: false },
      }),
      { params: Promise.resolve({ recommendationId: 'r1' }) }
    );

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Admin or service role required');
  });

  it('PATCH validates active boolean', async () => {
    const res = await PATCH(
      makeRequest('http://localhost/api/learning/recommendations/r1', {
        headers: { 'x-org-id': 'org_1', 'x-org-role': 'admin' },
        body: { active: 'nope' },
      }),
      { params: Promise.resolve({ recommendationId: 'r1' }) }
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('active must be a boolean');
  });

  it('PATCH updates recommendation active state', async () => {
    updateLearningRecommendationActiveMock.mockResolvedValue({ id: 'r1', active: false });

    const res = await PATCH(
      makeRequest('http://localhost/api/learning/recommendations/r1', {
        headers: { 'x-org-id': 'org_1', 'x-org-role': 'service' },
        body: { active: false },
      }),
      { params: Promise.resolve({ recommendationId: 'r1' }) }
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.recommendation.active).toBe(false);
    expect(updateLearningRecommendationActiveMock).toHaveBeenCalledWith(mockSql, 'org_1', 'r1', false);
  });
});
