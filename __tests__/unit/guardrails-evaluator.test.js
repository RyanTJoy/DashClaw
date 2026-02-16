import { describe, it, expect } from 'vitest';
import { evaluatePolicy, evaluatePolicies } from '@/lib/guardrails/evaluator.js';

describe('evaluatePolicy', () => {
  it('allows when policy does not apply to the tool', () => {
    const result = evaluatePolicy(
      { id: 'p1', applies_to: { tools: ['deploy'] }, rule: { block: true } },
      { tool: 'read' }
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('policy does not apply');
  });

  it('blocks matching tool with block rule', () => {
    const result = evaluatePolicy(
      { id: 'p1', applies_to: { tools: ['deploy'] }, rule: { block: true } },
      { tool: 'deploy' }
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('blocked by policy');
  });

  it('allows allowlisted tool even with block rule', () => {
    const result = evaluatePolicy(
      { id: 'p1', applies_to: { tools: ['*'] }, rule: { block: true, allowlist: ['safe_tool'] } },
      { tool: 'safe_tool' }
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('allowlisted');
  });

  it('blocks non-allowlisted tool', () => {
    const result = evaluatePolicy(
      { id: 'p1', applies_to: { tools: ['*'] }, rule: { block: true, allowlist: ['safe_tool'] } },
      { tool: 'danger_tool' }
    );
    expect(result.allowed).toBe(false);
  });

  it('requires approval and blocks without it', () => {
    const result = evaluatePolicy(
      { id: 'p1', applies_to: { tools: ['deploy'] }, rule: { require: 'approval' } },
      { tool: 'deploy', approval: false }
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('approval required');
  });

  it('allows with explicit approval', () => {
    const result = evaluatePolicy(
      { id: 'p1', applies_to: { tools: ['deploy'] }, rule: { require: 'approval' } },
      { tool: 'deploy', approval: true }
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('approved');
  });

  it('allows with context.approved', () => {
    const result = evaluatePolicy(
      { id: 'p1', applies_to: { tools: ['deploy'] }, rule: { require: 'approval' } },
      { tool: 'deploy', context: { approved: true } }
    );
    expect(result.allowed).toBe(true);
  });

  it('supports wildcard tool matching', () => {
    const result = evaluatePolicy(
      { id: 'p1', applies_to: { tools: ['exec.*'] }, rule: { block: true } },
      { tool: 'exec.run' }
    );
    expect(result.allowed).toBe(false);
  });

  it('allows when wildcard does not match', () => {
    const result = evaluatePolicy(
      { id: 'p1', applies_to: { tools: ['exec.*'] }, rule: { block: true } },
      { tool: 'read.file' }
    );
    expect(result.allowed).toBe(true);
  });
});

describe('evaluatePolicies', () => {
  it('returns first blocking result', () => {
    const policies = [
      { id: 'p1', applies_to: { tools: ['deploy'] }, rule: { block: true } },
      { id: 'p2', applies_to: { tools: ['deploy'] }, rule: { require: 'approval' } },
    ];
    const result = evaluatePolicies(policies, { tool: 'deploy' });
    expect(result.allowed).toBe(false);
    expect(result.policy_id).toBe('p1');
  });

  it('returns allowed when all policies pass', () => {
    const policies = [
      { id: 'p1', applies_to: { tools: ['delete'] }, rule: { block: true } },
    ];
    const result = evaluatePolicies(policies, { tool: 'read' });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('all policies passed');
  });

  it('handles empty policy list', () => {
    const result = evaluatePolicies([], { tool: 'anything' });
    expect(result.allowed).toBe(true);
  });
});
