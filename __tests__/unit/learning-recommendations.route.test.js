import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockSql,
  listLearningRecommendationsMock,
  listLearningEpisodesMock,
  rebuildLearningRecommendationsMock,
  scoreAndStoreActionEpisodeMock,
  getLearningRecommendationMetricsMock,
  recordLearningRecommendationEventsMock,
} = vi.hoisted(() => ({
  mockSql: Object.assign(vi.fn(async () => []), { query: vi.fn(async () => []) }),
  listLearningRecommendationsMock: vi.fn(),
  listLearningEpisodesMock: vi.fn(),
  rebuildLearningRecommendationsMock: vi.fn(),
  scoreAndStoreActionEpisodeMock: vi.fn(),
  getLearningRecommendationMetricsMock: vi.fn(),
  recordLearningRecommendationEventsMock: vi.fn(),
}));

vi.mock('@/lib/db.js', () => ({
  getSql: () => mockSql,
}));

vi.mock('@/lib/repositories/learningLoop.repository.js', () => ({
  listLearningRecommendations: listLearningRecommendationsMock,
  listLearningEpisodes: listLearningEpisodesMock,
}));

vi.mock('@/lib/learningLoop.service.js', () => ({
  rebuildLearningRecommendations: rebuildLearningRecommendationsMock,
  scoreAndStoreActionEpisode: scoreAndStoreActionEpisodeMock,
  getLearningRecommendationMetrics: getLearningRecommendationMetricsMock,
  recordLearningRecommendationEvents: recordLearningRecommendationEventsMock,
}));

import { GET, POST } from '@/api/learning/recommendations/route.js';

function makeRequest(url, { headers = {}, body } = {}) {
  return {
    url,
    headers: new Headers(headers),
    json: async () => body,
  };
}

describe('/api/learning/recommendations route', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://unit-test';
    vi.clearAllMocks();
  });

  it('GET returns recommendations payload', async () => {
    listLearningRecommendationsMock.mockResolvedValue([
      { id: 'r1', agent_id: 'agent_1', action_type: 'deploy', confidence: 80 },
    ]);

    const res = await GET(
      makeRequest('http://localhost/api/learning/recommendations?agent_id=agent_1&limit=10', {
        headers: { 'x-org-id': 'org_1' },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(1);
    expect(data.recommendations[0].action_type).toBe('deploy');
    expect(listLearningRecommendationsMock).toHaveBeenCalledWith(
      mockSql,
      'org_1',
      expect.objectContaining({
        agentId: 'agent_1',
        limit: 10,
        includeInactive: false,
      })
    );
  });

  it('GET includes telemetry metrics and records fetched events when requested', async () => {
    listLearningRecommendationsMock.mockResolvedValue([
      { id: 'r1', agent_id: 'agent_1', action_type: 'deploy', confidence: 83 },
    ]);
    listLearningEpisodesMock.mockResolvedValue([{ id: 'lep_1', action_type: 'deploy' }]);
    getLearningRecommendationMetricsMock.mockResolvedValue({
      metrics: [{ recommendation_id: 'r1', telemetry: { adoption_rate: 0.5 } }],
      summary: { total_recommendations: 1 },
    });
    recordLearningRecommendationEventsMock.mockResolvedValue([{ id: 'evt_1' }]);

    const res = await GET(
      makeRequest(
        'http://localhost/api/learning/recommendations?agent_id=agent_1&include_metrics=true&track_events=true&lookback_days=14',
        { headers: { 'x-org-id': 'org_1' } }
      )
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.metrics.summary.total_recommendations).toBe(1);
    expect(data.lookback_days).toBe(14);
    expect(recordLearningRecommendationEventsMock).toHaveBeenCalledWith(
      mockSql,
      'org_1',
      expect.arrayContaining([
        expect.objectContaining({ recommendation_id: 'r1', event_type: 'fetched', agent_id: 'agent_1' }),
      ])
    );
    expect(getLearningRecommendationMetricsMock).toHaveBeenCalledWith(
      mockSql,
      'org_1',
      expect.objectContaining({ lookbackDays: 14 })
    );
  });

  it('GET returns 500 on repository error', async () => {
    listLearningRecommendationsMock.mockRejectedValue(new Error('db down'));

    const res = await GET(
      makeRequest('http://localhost/api/learning/recommendations', {
        headers: { 'x-org-id': 'org_1' },
      })
    );

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain('learning recommendations');
  });

  it('POST blocks non-admin/non-service callers', async () => {
    const res = await POST(
      makeRequest('http://localhost/api/learning/recommendations', {
        headers: { 'x-org-id': 'org_1', 'x-org-role': 'member' },
        body: {},
      })
    );

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Admin or service role required');
  });

  it('POST validates numeric fields', async () => {
    const res = await POST(
      makeRequest('http://localhost/api/learning/recommendations', {
        headers: { 'x-org-id': 'org_1', 'x-org-role': 'admin' },
        body: { lookback_days: 'abc' },
      })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Validation failed');
    expect(data.details[0]).toContain('lookback_days');
  });

  it('POST returns rebuilt recommendations and optional scored episode', async () => {
    scoreAndStoreActionEpisodeMock.mockResolvedValue({ id: 'lep_1', action_id: 'act_1' });
    rebuildLearningRecommendationsMock.mockResolvedValue({
      episodes_scanned: 4,
      recommendations: [
        { id: 'rec_1', action_type: 'deploy', confidence: 82 },
      ],
    });

    const res = await POST(
      makeRequest('http://localhost/api/learning/recommendations', {
        headers: { 'x-org-id': 'org_1', 'x-org-role': 'service' },
        body: {
          action_id: 'act_1',
          agent_id: 'agent_1',
          action_type: 'deploy',
          lookback_days: 45,
          episode_limit: 700,
          min_samples: 6,
        },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.episodes_scanned).toBe(4);
    expect(data.total).toBe(1);
    expect(data.scored_episode.action_id).toBe('act_1');

    expect(scoreAndStoreActionEpisodeMock).toHaveBeenCalledWith(mockSql, 'org_1', 'act_1');
    expect(rebuildLearningRecommendationsMock).toHaveBeenCalledWith(
      mockSql,
      'org_1',
      {
        agentId: 'agent_1',
        actionType: 'deploy',
        lookbackDays: 45,
        episodeLimit: 700,
        minSamples: 6,
      }
    );
  });

  it('POST returns 500 on service failure', async () => {
    rebuildLearningRecommendationsMock.mockRejectedValue(new Error('service failed'));

    const res = await POST(
      makeRequest('http://localhost/api/learning/recommendations', {
        headers: { 'x-org-id': 'org_1', 'x-org-role': 'admin' },
        body: {},
      })
    );

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain('rebuilding learning recommendations');
  });
});
