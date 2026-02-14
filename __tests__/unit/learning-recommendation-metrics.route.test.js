import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockSql,
  listLearningRecommendationsMock,
  listLearningEpisodesMock,
  getLearningRecommendationMetricsMock,
} = vi.hoisted(() => ({
  mockSql: Object.assign(vi.fn(async () => []), { query: vi.fn(async () => []) }),
  listLearningRecommendationsMock: vi.fn(),
  listLearningEpisodesMock: vi.fn(),
  getLearningRecommendationMetricsMock: vi.fn(),
}));

vi.mock('@/lib/db.js', () => ({
  getSql: () => mockSql,
}));

vi.mock('@/lib/repositories/learningLoop.repository.js', () => ({
  listLearningRecommendations: listLearningRecommendationsMock,
  listLearningEpisodes: listLearningEpisodesMock,
}));

vi.mock('@/lib/learningLoop.service.js', () => ({
  getLearningRecommendationMetrics: getLearningRecommendationMetricsMock,
}));

import { GET } from '@/api/learning/recommendations/metrics/route.js';

function makeRequest(url, { headers = {} } = {}) {
  return {
    url,
    headers: new Headers(headers),
  };
}

describe('/api/learning/recommendations/metrics route', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://unit-test';
    vi.clearAllMocks();
  });

  it('GET returns metrics payload', async () => {
    listLearningRecommendationsMock.mockResolvedValue([{ id: 'r1', action_type: 'deploy' }]);
    listLearningEpisodesMock.mockResolvedValue([{ id: 'lep_1', action_type: 'deploy' }]);
    getLearningRecommendationMetricsMock.mockResolvedValue({
      metrics: [{ recommendation_id: 'r1' }],
      summary: { total_recommendations: 1 },
    });

    const res = await GET(
      makeRequest('http://localhost/api/learning/recommendations/metrics?agent_id=agent_1&action_type=deploy&lookback_days=14&limit=5', {
        headers: { 'x-org-id': 'org_1' },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.metrics).toHaveLength(1);
    expect(data.lookback_days).toBe(14);
    expect(listLearningRecommendationsMock).toHaveBeenCalledWith(
      mockSql,
      'org_1',
      expect.objectContaining({
        agentId: 'agent_1',
        actionType: 'deploy',
        limit: 5,
      })
    );
  });

  it('GET ignores include_inactive for non-admin roles', async () => {
    listLearningRecommendationsMock.mockResolvedValue([]);
    listLearningEpisodesMock.mockResolvedValue([]);
    getLearningRecommendationMetricsMock.mockResolvedValue({ metrics: [], summary: {} });

    await GET(
      makeRequest('http://localhost/api/learning/recommendations/metrics?include_inactive=true', {
        headers: { 'x-org-id': 'org_1', 'x-org-role': 'member' },
      })
    );

    expect(listLearningRecommendationsMock).toHaveBeenCalledWith(
      mockSql,
      'org_1',
      expect.objectContaining({ includeInactive: false })
    );
  });
});
