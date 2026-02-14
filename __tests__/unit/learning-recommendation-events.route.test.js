import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockSql,
  createLearningRecommendationEventsMock,
} = vi.hoisted(() => ({
  mockSql: Object.assign(vi.fn(async () => []), { query: vi.fn(async () => []) }),
  createLearningRecommendationEventsMock: vi.fn(),
}));

vi.mock('@/lib/db.js', () => ({
  getSql: () => mockSql,
}));

vi.mock('@/lib/repositories/learningLoop.repository.js', () => ({
  createLearningRecommendationEvents: createLearningRecommendationEventsMock,
}));

import { POST } from '@/api/learning/recommendations/events/route.js';

function makeRequest(url, { headers = {}, body } = {}) {
  return {
    url,
    headers: new Headers(headers),
    json: async () => body,
  };
}

describe('/api/learning/recommendations/events route', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://unit-test';
    vi.clearAllMocks();
  });

  it('POST accepts a single valid event', async () => {
    createLearningRecommendationEventsMock.mockResolvedValue([{ id: 'evt_1', event_type: 'applied' }]);

    const res = await POST(
      makeRequest('http://localhost/api/learning/recommendations/events', {
        headers: { 'x-org-id': 'org_1' },
        body: {
          recommendation_id: 'r1',
          agent_id: 'agent_1',
          event_type: 'applied',
          details: { reason: 'autoadapt' },
        },
      })
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.created_count).toBe(1);
    expect(createLearningRecommendationEventsMock).toHaveBeenCalledWith(
      mockSql,
      'org_1',
      expect.arrayContaining([expect.objectContaining({ event_type: 'applied' })])
    );
  });

  it('POST rejects invalid event type', async () => {
    const res = await POST(
      makeRequest('http://localhost/api/learning/recommendations/events', {
        headers: { 'x-org-id': 'org_1' },
        body: { event_type: 'nope' },
      })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Validation failed');
    expect(data.details[0]).toContain('event_type');
  });

  it('POST rejects oversize batches', async () => {
    const events = Array.from({ length: 101 }, (_, i) => ({ event_type: 'fetched', recommendation_id: `r${i}` }));
    const res = await POST(
      makeRequest('http://localhost/api/learning/recommendations/events', {
        headers: { 'x-org-id': 'org_1' },
        body: { events },
      })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('maximum batch size');
  });
});
