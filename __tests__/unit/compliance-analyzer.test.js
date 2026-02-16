import { describe, it, expect } from 'vitest';
import { analyzeGaps } from '@/lib/compliance/analyzer.js';

function makeMap(controls, coveragePct = null) {
  const gaps = controls.filter(c => c.status === 'gap').length;
  const partial = controls.filter(c => c.status === 'partial').length;
  const covered = controls.filter(c => c.status === 'covered').length;
  return {
    framework: 'test-framework',
    controls,
    summary: {
      total_controls: controls.length,
      covered,
      partial,
      gaps,
      coverage_percentage: coveragePct ?? Math.round(((covered + partial * 0.5) / controls.length) * 100),
    },
  };
}

function makeControl(id, status, relevance = 'high', recommendations = ['Fix it']) {
  return {
    control_id: id,
    title: `Control ${id}`,
    category: 'Test',
    status,
    agent_relevance: relevance,
    gap_recommendations: status !== 'covered' ? recommendations : [],
  };
}

describe('analyzeGaps', () => {
  it('returns LOW risk for >= 80% coverage', () => {
    const map = makeMap([
      makeControl('C1', 'covered'),
      makeControl('C2', 'covered'),
      makeControl('C3', 'covered'),
      makeControl('C4', 'covered'),
      makeControl('C5', 'gap', 'low'),
    ], 80);
    const result = analyzeGaps(map);
    expect(result.risk_assessment.overall_risk).toBe('LOW');
  });

  it('returns MEDIUM risk for 60-79% coverage', () => {
    const map = makeMap([
      makeControl('C1', 'covered'),
      makeControl('C2', 'covered'),
      makeControl('C3', 'covered'),
      makeControl('C4', 'gap'),
      makeControl('C5', 'gap'),
    ], 60);
    const result = analyzeGaps(map);
    expect(result.risk_assessment.overall_risk).toBe('MEDIUM');
  });

  it('returns HIGH risk for 40-59% coverage', () => {
    const map = makeMap([
      makeControl('C1', 'covered'),
      makeControl('C2', 'covered'),
      makeControl('C3', 'gap'),
      makeControl('C4', 'gap'),
      makeControl('C5', 'gap'),
    ], 40);
    const result = analyzeGaps(map);
    expect(result.risk_assessment.overall_risk).toBe('HIGH');
  });

  it('returns CRITICAL risk for < 40% coverage', () => {
    const map = makeMap([
      makeControl('C1', 'covered'),
      makeControl('C2', 'gap'),
      makeControl('C3', 'gap'),
      makeControl('C4', 'gap'),
      makeControl('C5', 'gap'),
    ], 20);
    const result = analyzeGaps(map);
    expect(result.risk_assessment.overall_risk).toBe('CRITICAL');
  });

  it('prioritizes gaps by agent_relevance (critical first)', () => {
    const map = makeMap([
      makeControl('C1', 'gap', 'low'),
      makeControl('C2', 'gap', 'critical'),
      makeControl('C3', 'gap', 'high'),
    ], 0);
    const result = analyzeGaps(map);
    const relevances = result.remediation_plan.map(r => r.agent_relevance);
    expect(relevances).toEqual(['critical', 'high', 'low']);
  });

  it('assigns priority numbers starting at 1', () => {
    const map = makeMap([makeControl('C1', 'gap'), makeControl('C2', 'gap')], 0);
    const result = analyzeGaps(map);
    expect(result.remediation_plan[0].priority).toBe(1);
    expect(result.remediation_plan[1].priority).toBe(2);
  });

  it('estimates effort based on recommendation count', () => {
    const map = makeMap([
      makeControl('C1', 'gap', 'high', ['a']),
      makeControl('C2', 'gap', 'high', ['a', 'b']),
      makeControl('C3', 'gap', 'high', ['a', 'b', 'c']),
      makeControl('C4', 'gap', 'high', ['a', 'b', 'c', 'd']),
    ], 0);
    const result = analyzeGaps(map);
    expect(result.remediation_plan[0].estimated_effort).toBe('1-2 hours');
    expect(result.remediation_plan[1].estimated_effort).toBe('2-4 hours');
    expect(result.remediation_plan[2].estimated_effort).toBe('4-8 hours');
    expect(result.remediation_plan[3].estimated_effort).toBe('8-16 hours');
  });

  it('identifies quick wins (effort <= 2 hours)', () => {
    const map = makeMap([
      makeControl('C1', 'gap', 'high', ['a']),
      makeControl('C2', 'gap', 'high', ['a', 'b', 'c', 'd']),
    ], 0);
    const result = analyzeGaps(map);
    expect(result.quick_wins).toHaveLength(1);
    expect(result.quick_wins[0].control_id).toBe('C1');
  });

  it('generates immediate actions for critical gaps', () => {
    const map = makeMap([
      makeControl('C1', 'gap', 'critical', ['Encrypt data at rest']),
    ], 0);
    const result = analyzeGaps(map);
    expect(result.risk_assessment.immediate_actions.length).toBeGreaterThan(0);
    expect(result.risk_assessment.immediate_actions[0]).toContain('C1');
  });

  it('handles zero coverage scenario', () => {
    const map = makeMap([makeControl('C1', 'gap')], 0);
    const result = analyzeGaps(map);
    expect(result.summary.coverage_percentage).toBe(0);
    expect(result.risk_assessment.overall_risk).toBe('CRITICAL');
    expect(result.remediation_plan).toHaveLength(1);
  });
});
