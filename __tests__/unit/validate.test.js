import { describe, it, expect } from 'vitest';
import { validateActionRecord } from '@/lib/validate';

describe('validateActionRecord', () => {
  it('should validate a correct action record', () => {
    const validRecord = {
      agent_id: 'agent-123',
      action_type: 'build',
      declared_goal: 'Build the project',
    };
    const result = validateActionRecord(validRecord);
    expect(result.valid).toBe(true);
    expect(result.data.agent_id).toBe('agent-123');
  });

  it('should fail if required fields are missing', () => {
    const invalidRecord = {
      agent_id: 'agent-123',
      // action_type is missing
    };
    const result = validateActionRecord(invalidRecord);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('action_type is required');
  });

  it('should fail if action_type is not in enum', () => {
    const invalidRecord = {
      agent_id: 'agent-123',
      action_type: 'invalid-type',
      declared_goal: 'Goal',
    };
    const result = validateActionRecord(invalidRecord);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('must be one of');
  });
});
