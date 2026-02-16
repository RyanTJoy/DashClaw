import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExistsSync, mockReadFileSync, mockReaddirSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockReaddirSync: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: { existsSync: mockExistsSync, readFileSync: mockReadFileSync, readdirSync: mockReaddirSync },
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  readdirSync: mockReaddirSync,
}));

import { loadFramework, listFrameworks, mapPolicies } from '@/lib/compliance/mapper.js';

const SAMPLE_FRAMEWORK = {
  framework: 'test-fw',
  version: '1.0',
  controls: [
    {
      id: 'C1',
      title: 'Block Execution',
      category: 'Access',
      description: 'Block exec',
      agent_relevance: 'critical',
      policy_mappings: [
        { policy_pattern: 'block', tool_patterns: ['exec.*'], coverage: 'full', rationale: 'Blocks exec' },
      ],
      gap_recommendations: ['Add block policy'],
    },
    {
      id: 'C2',
      title: 'Require Approval',
      category: 'Access',
      description: 'Need approval',
      agent_relevance: 'high',
      policy_mappings: [
        { policy_pattern: 'require_approval', tool_patterns: ['deploy'], coverage: 'partial', rationale: 'Needs approval' },
      ],
      gap_recommendations: ['Add approval policy'],
    },
    {
      id: 'C3',
      title: 'Any Policy',
      category: 'Monitoring',
      description: 'Any active policy',
      agent_relevance: 'medium',
      policy_mappings: [
        { policy_pattern: 'any_active_policy', tool_patterns: [], coverage: 'full', rationale: 'Any policy counts' },
      ],
      gap_recommendations: ['Add a policy'],
    },
  ],
};

describe('listFrameworks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns framework IDs from directory', () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(['soc2.json', 'gdpr.json', 'readme.txt']);
    const result = listFrameworks();
    expect(result).toEqual(['soc2', 'gdpr']);
  });

  it('returns empty array when directory does not exist', () => {
    mockExistsSync.mockReturnValue(false);
    expect(listFrameworks()).toEqual([]);
  });
});

describe('loadFramework', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads and parses framework JSON', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(SAMPLE_FRAMEWORK));
    const fw = loadFramework('test-fw');
    expect(fw.framework).toBe('test-fw');
    expect(fw.controls).toHaveLength(3);
  });

  it('throws for unknown framework', () => {
    mockExistsSync.mockImplementation((p) => !p.includes('unknown'));
    mockReaddirSync.mockReturnValue(['soc2.json']);
    expect(() => loadFramework('unknown')).toThrow('Framework not found');
  });
});

describe('mapPolicies', () => {
  it('marks control as covered with full-coverage block policy match', () => {
    const policyDoc = {
      project: 'test',
      policies: [
        { id: 'p1', description: 'Block exec', rule: { block: true }, applies_to: { tools: ['exec.run'] } },
      ],
    };
    const result = mapPolicies(policyDoc, SAMPLE_FRAMEWORK);
    const c1 = result.controls.find(c => c.control_id === 'C1');
    expect(c1.status).toBe('covered');
    expect(c1.matched_policies).toHaveLength(1);
  });

  it('marks control as partial with partial-coverage match', () => {
    const policyDoc = {
      project: 'test',
      policies: [
        { id: 'p2', description: 'Approval', rule: { require: 'approval' }, applies_to: { tools: ['deploy'] } },
      ],
    };
    const result = mapPolicies(policyDoc, SAMPLE_FRAMEWORK);
    const c2 = result.controls.find(c => c.control_id === 'C2');
    expect(c2.status).toBe('partial');
  });

  it('marks control as gap when no policies match', () => {
    const policyDoc = { project: 'test', policies: [] };
    const result = mapPolicies(policyDoc, SAMPLE_FRAMEWORK);
    const c1 = result.controls.find(c => c.control_id === 'C1');
    expect(c1.status).toBe('gap');
    expect(c1.gap_recommendations.length).toBeGreaterThan(0);
  });

  it('any_active_policy matches any policy', () => {
    const policyDoc = {
      project: 'test',
      policies: [
        { id: 'p1', description: 'Anything', rule: { block: true }, applies_to: { tools: ['*'] } },
      ],
    };
    const result = mapPolicies(policyDoc, SAMPLE_FRAMEWORK);
    const c3 = result.controls.find(c => c.control_id === 'C3');
    expect(c3.status).toBe('covered');
  });

  it('calculates coverage percentage correctly', () => {
    // 1 covered + 1 partial + 1 gap = (1 + 0.5) / 3 * 100 = 50%
    const policyDoc = {
      project: 'test',
      policies: [
        { id: 'p1', description: 'Block', rule: { block: true }, applies_to: { tools: ['exec.run'] } },
        { id: 'p2', description: 'Approval', rule: { require: 'approval' }, applies_to: { tools: ['deploy'] } },
      ],
    };
    const result = mapPolicies(policyDoc, SAMPLE_FRAMEWORK);
    // C1=covered (via block+exec.*), C2=partial (via require_approval+deploy), C3=covered (any_active_policy)
    expect(result.summary.coverage_percentage).toBeGreaterThan(0);
    expect(result.summary.total_controls).toBe(3);
  });

  it('handles wildcard tool pattern matching', () => {
    const policyDoc = {
      project: 'test',
      policies: [
        { id: 'p1', description: 'Block all exec', rule: { block: true }, applies_to: { tools: ['exec.*'] } },
      ],
    };
    const fw = {
      ...SAMPLE_FRAMEWORK,
      controls: [{
        id: 'C1', title: 'T', category: 'C', description: 'D', agent_relevance: 'high',
        policy_mappings: [{ policy_pattern: 'block', tool_patterns: ['exec.run'], coverage: 'full', rationale: 'R' }],
        gap_recommendations: [],
      }],
    };
    const result = mapPolicies(policyDoc, fw);
    expect(result.controls[0].status).toBe('covered');
  });

  it('zero policies → zero coverage', () => {
    const policyDoc = { project: 'test', policies: [] };
    const fw = {
      ...SAMPLE_FRAMEWORK,
      controls: [SAMPLE_FRAMEWORK.controls[0]],
    };
    const result = mapPolicies(policyDoc, fw);
    expect(result.summary.coverage_percentage).toBe(0);
    expect(result.summary.gaps).toBe(1);
  });

  it('full coverage when all controls are covered', () => {
    const policyDoc = {
      project: 'test',
      policies: [
        { id: 'p1', description: 'Block', rule: { block: true }, applies_to: { tools: ['exec.run'] } },
        { id: 'p2', description: 'Approval', rule: { require: 'approval' }, applies_to: { tools: ['deploy'] } },
      ],
    };
    const fw = {
      framework: 'fw',
      version: '1.0',
      controls: [{
        id: 'C1', title: 'T', category: 'C', description: 'D', agent_relevance: 'high',
        policy_mappings: [
          { policy_pattern: 'block', tool_patterns: ['exec.*'], coverage: 'full', rationale: 'R' },
        ],
        gap_recommendations: [],
      }],
    };
    const result = mapPolicies(policyDoc, fw);
    expect(result.summary.coverage_percentage).toBe(100);
    expect(result.summary.covered).toBe(1);
  });

  it('supports allowlist policy pattern', () => {
    const policyDoc = {
      project: 'test',
      policies: [
        { id: 'p1', description: 'Allowlist', rule: { allowlist: ['safe_tool'] }, applies_to: { tools: ['*'] } },
      ],
    };
    const fw = {
      framework: 'fw',
      version: '1.0',
      controls: [{
        id: 'C1', title: 'T', category: 'C', description: 'D', agent_relevance: 'high',
        policy_mappings: [{ policy_pattern: 'allowlist', tool_patterns: ['*'], coverage: 'full', rationale: 'R' }],
        gap_recommendations: [],
      }],
    };
    const result = mapPolicies(policyDoc, fw);
    expect(result.controls[0].status).toBe('covered');
  });

  it('includes framework metadata in result', () => {
    const policyDoc = { project: 'myproj', policies: [] };
    const result = mapPolicies(policyDoc, SAMPLE_FRAMEWORK);
    expect(result.framework).toBe('test-fw');
    expect(result.framework_version).toBe('1.0');
    expect(result.project).toBe('myproj');
    expect(result.generated_at).toBeDefined();
  });
});
