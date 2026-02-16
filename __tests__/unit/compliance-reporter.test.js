import { describe, it, expect } from 'vitest';
import { generateMarkdownReport, generateJsonReport } from '@/lib/compliance/reporter.js';

function makeComplianceMap(overrides = {}) {
  return {
    framework: 'SOC 2',
    project: 'test-project',
    generated_at: '2026-01-01T00:00:00.000Z',
    summary: {
      total_controls: 3,
      covered: 2,
      partial: 1,
      gaps: 0,
      coverage_percentage: 83,
    },
    controls: [
      {
        control_id: 'CC6.1',
        title: 'Access Control',
        category: 'Logical Access',
        description: 'Restrict access',
        agent_relevance: 'critical',
        status: 'covered',
        matched_policies: [{ policy_id: 'p1', policy_description: 'Block exec', mapping_coverage: 'full', rationale: 'Blocks execution' }],
        gap_recommendations: [],
      },
      {
        control_id: 'CC7.1',
        title: 'System Monitoring',
        category: 'Operations',
        description: 'Monitor systems',
        agent_relevance: 'high',
        status: 'partial',
        matched_policies: [{ policy_id: 'p2', policy_description: 'Rate limit', mapping_coverage: 'partial', rationale: 'Partial coverage' }],
        gap_recommendations: ['Add logging policy'],
      },
      {
        control_id: 'CC8.1',
        title: 'Change Management',
        category: 'Operations',
        description: 'Track changes',
        agent_relevance: 'medium',
        status: 'covered',
        matched_policies: [],
        gap_recommendations: [],
      },
    ],
    ...overrides,
  };
}

describe('generateMarkdownReport', () => {
  it('includes framework name in title', () => {
    const md = generateMarkdownReport(makeComplianceMap());
    expect(md).toContain('# SOC 2 Compliance Report');
  });

  it('includes summary table with coverage metrics', () => {
    const md = generateMarkdownReport(makeComplianceMap());
    expect(md).toContain('| Total Controls | 3 |');
    expect(md).toContain('| Covered | 2 |');
    expect(md).toContain('**83%**');
  });

  it('includes coverage bar', () => {
    const md = generateMarkdownReport(makeComplianceMap());
    // 83% → 17 filled, 3 empty
    expect(md).toContain('###');
    expect(md).toContain('83%');
  });

  it('groups controls by category', () => {
    const md = generateMarkdownReport(makeComplianceMap());
    expect(md).toContain('### Logical Access');
    expect(md).toContain('### Operations');
  });

  it('includes remediation plan for gaps and partials', () => {
    const md = generateMarkdownReport(makeComplianceMap());
    expect(md).toContain('Remediation Plan');
    expect(md).toContain('Add logging policy');
  });

  it('includes attestation section', () => {
    const md = generateMarkdownReport(makeComplianceMap());
    expect(md).toContain('Attestation');
    expect(md).toContain('DashClaw Compliance Engine');
  });

  it('shows risk level based on coverage', () => {
    const md = generateMarkdownReport(makeComplianceMap());
    expect(md).toContain('Risk Level:** LOW');
  });
});

describe('generateJsonReport', () => {
  it('returns valid JSON string', () => {
    const json = generateJsonReport(makeComplianceMap());
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('includes all compliance map fields', () => {
    const map = makeComplianceMap();
    const json = generateJsonReport(map);
    const parsed = JSON.parse(json);
    expect(parsed.framework).toBe('SOC 2');
    expect(parsed.summary.coverage_percentage).toBe(83);
    expect(parsed.controls).toHaveLength(3);
  });
});
