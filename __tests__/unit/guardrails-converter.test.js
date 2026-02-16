import { describe, it, expect } from 'vitest';
import { convertPolicy, convertPolicies } from '@/lib/guardrails/converter.js';

describe('convertPolicy', () => {
  it('converts require_approval policy', () => {
    const result = convertPolicy({
      id: 'gp_1',
      name: 'Require Approval for Deploy',
      policy_type: 'require_approval',
      rules: JSON.stringify({ action_types: ['deploy', 'migrate'] }),
    });
    expect(result.id).toBe('gp_1');
    expect(result.description).toBe('Require Approval for Deploy');
    expect(result.rule.require).toBe('approval');
    expect(result.applies_to.tools).toEqual(['deploy', 'migrate']);
  });

  it('converts block_action_type policy', () => {
    const result = convertPolicy({
      id: 'gp_2',
      name: 'Block Destructive',
      policy_type: 'block_action_type',
      rules: JSON.stringify({ action_types: ['delete'] }),
    });
    expect(result.rule.block).toBe(true);
    expect(result.applies_to.tools).toEqual(['delete']);
  });

  it('converts risk_threshold policy', () => {
    const result = convertPolicy({
      name: 'High Risk Block',
      policy_type: 'risk_threshold',
      rules: JSON.stringify({ threshold: 90, action: 'block' }),
    });
    expect(result.id).toBe('high_risk_block');
    expect(result.rule.block).toBe(true);
    expect(result.rule._dashclaw_type).toBe('risk_threshold');
    expect(result.rule._threshold).toBe(90);
    expect(result.applies_to.tools).toEqual(['*']);
  });

  it('converts rate_limit policy', () => {
    const result = convertPolicy({
      id: 'gp_3',
      name: 'Rate Limit',
      policy_type: 'rate_limit',
      rules: JSON.stringify({ max_actions: 10, window_minutes: 30 }),
    });
    expect(result.rule._dashclaw_type).toBe('rate_limit');
    expect(result.rule._max_actions).toBe(10);
    expect(result.rule._window_minutes).toBe(30);
  });

  it('generates placeholder tests when no tests provided', () => {
    const result = convertPolicy({
      id: 'gp_4',
      name: 'Block X',
      policy_type: 'block_action_type',
      rules: JSON.stringify({ action_types: ['destructive'] }),
    });
    expect(result.tests).toHaveLength(1);
    expect(result.tests[0].name).toBe('blocks_action_type');
  });

  it('preserves explicit tests from rules', () => {
    const tests = [{ name: 'custom_test', input: { tool: 'x' }, expect: { allowed: false } }];
    const result = convertPolicy({
      id: 'gp_5',
      name: 'Custom',
      policy_type: 'block_action_type',
      rules: JSON.stringify({ action_types: ['x'], tests }),
    });
    expect(result.tests).toEqual(tests);
  });

  it('handles string rules (parses JSON)', () => {
    const result = convertPolicy({
      id: 'gp_6',
      name: 'Parsed',
      policy_type: 'require_approval',
      rules: '{"action_types":["deploy"]}',
    });
    expect(result.rule.require).toBe('approval');
  });

  it('converts webhook_check policy', () => {
    const result = convertPolicy({
      id: 'gp_7',
      name: 'Webhook',
      policy_type: 'webhook_check',
      rules: JSON.stringify({ url: 'https://example.com', timeout_ms: 3000 }),
    });
    expect(result.rule._dashclaw_type).toBe('webhook_check');
    expect(result.rule._url).toBe('https://example.com');
  });
});

describe('convertPolicies', () => {
  it('filters inactive policies', () => {
    const result = convertPolicies([
      { id: 'gp_1', name: 'Active', policy_type: 'block_action_type', rules: '{}', active: 1 },
      { id: 'gp_2', name: 'Inactive', policy_type: 'block_action_type', rules: '{}', active: 0 },
    ]);
    expect(result.policies).toHaveLength(1);
    expect(result.policies[0].id).toBe('gp_1');
  });

  it('returns document structure with version and project', () => {
    const result = convertPolicies([], 'my-project');
    expect(result.version).toBe(1);
    expect(result.project).toBe('my-project');
    expect(result.policies).toEqual([]);
  });
});
