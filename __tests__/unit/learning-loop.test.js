import { describe, it, expect } from 'vitest';
import { buildRecommendationsFromEpisodes, scoreActionEpisode } from '@/lib/learning-loop';

describe('scoreActionEpisode', () => {
  it('scores successful low-risk reversible actions higher than failed high-risk actions', () => {
    const success = scoreActionEpisode({
      status: 'completed',
      risk_score: 20,
      reversible: 1,
      duration_ms: 45_000,
      cost_estimate: 0.02,
      confidence: 82,
      invalidated_assumptions: 0,
      open_loops: 0,
    });

    const failure = scoreActionEpisode({
      status: 'failed',
      risk_score: 92,
      reversible: 0,
      duration_ms: 2_500_000,
      cost_estimate: 8.4,
      confidence: 95,
      invalidated_assumptions: 2,
      open_loops: 3,
    });

    expect(success.score).toBeGreaterThan(failure.score);
    expect(success.outcome_label).toBe('success');
    expect(failure.outcome_label).toBe('failure');
  });
});

describe('buildRecommendationsFromEpisodes', () => {
  it('builds recommendations when sample size meets threshold', () => {
    const episodes = [
      { agent_id: 'agent_a', action_type: 'deploy', outcome_label: 'success', score: 82, risk_score: 40, reversible: 1, confidence: 80, duration_ms: 60_000, cost_estimate: 0.5 },
      { agent_id: 'agent_a', action_type: 'deploy', outcome_label: 'success', score: 84, risk_score: 35, reversible: 1, confidence: 78, duration_ms: 75_000, cost_estimate: 0.7 },
      { agent_id: 'agent_a', action_type: 'deploy', outcome_label: 'success', score: 88, risk_score: 30, reversible: 1, confidence: 86, duration_ms: 50_000, cost_estimate: 0.4 },
      { agent_id: 'agent_a', action_type: 'deploy', outcome_label: 'failure', score: 38, risk_score: 85, reversible: 0, confidence: 92, duration_ms: 500_000, cost_estimate: 2.3 },
      { agent_id: 'agent_a', action_type: 'deploy', outcome_label: 'success', score: 79, risk_score: 45, reversible: 1, confidence: 75, duration_ms: 92_000, cost_estimate: 0.6 },
    ];

    const recommendations = buildRecommendationsFromEpisodes(episodes, { minSamples: 5 });
    expect(recommendations.length).toBe(1);
    expect(recommendations[0].agent_id).toBe('agent_a');
    expect(recommendations[0].action_type).toBe('deploy');
    expect(recommendations[0].sample_size).toBe(5);
    expect(recommendations[0].hints.prefer_reversible).toBe(true);
    expect(recommendations[0].hints.preferred_risk_cap).toBeTypeOf('number');
  });
});

