/**
 * Hand-rolled validation for ActionRecord and related entities.
 * No external dependencies - matches existing project style.
 */

const ACTION_TYPES = [
  'build', 'deploy', 'post', 'apply', 'security', 'message', 'api',
  'calendar', 'research', 'review', 'fix', 'refactor', 'test', 'config',
  'monitor', 'alert', 'cleanup', 'sync', 'migrate', 'other'
];

const ACTION_STATUSES = ['running', 'completed', 'failed', 'cancelled', 'pending'];
const LOOP_TYPES = ['followup', 'question', 'dependency', 'approval', 'review', 'handoff', 'other'];
const LOOP_STATUSES = ['open', 'resolved', 'cancelled'];
const LOOP_PRIORITIES = ['low', 'medium', 'high', 'critical'];

const ACTION_RECORD_SCHEMA = {
  // Identity
  action_id:            { type: 'string', maxLength: 128 },
  agent_id:             { type: 'string', required: true, maxLength: 128 },
  agent_name:           { type: 'string', maxLength: 256 },
  swarm_id:             { type: 'string', maxLength: 128 },
  parent_action_id:     { type: 'string', maxLength: 128 },
  // Intent
  action_type:          { type: 'string', required: true, enum: ACTION_TYPES },
  declared_goal:        { type: 'string', required: true, maxLength: 2000 },
  reasoning:            { type: 'string', maxLength: 4000 },
  authorization_scope:  { type: 'string', maxLength: 1000 },
  // Context
  trigger:              { type: 'string', maxLength: 1000 },
  systems_touched:      { type: 'array', maxItems: 50 },
  input_summary:        { type: 'string', maxLength: 4000 },
  // Action
  status:               { type: 'string', enum: ACTION_STATUSES },
  reversible:           { type: 'boolean' },
  risk_score:           { type: 'integer', min: 0, max: 100 },
  confidence:           { type: 'integer', min: 0, max: 100 },
  // Outcome (typically set via PATCH)
  output_summary:       { type: 'string', maxLength: 4000 },
  side_effects:         { type: 'array', maxItems: 50 },
  artifacts_created:    { type: 'array', maxItems: 100 },
  error_message:        { type: 'string', maxLength: 4000 },
  // Meta
  timestamp_start:      { type: 'string', maxLength: 64 },
  timestamp_end:        { type: 'string', maxLength: 64 },
  duration_ms:          { type: 'integer', min: 0 },
  cost_estimate:        { type: 'number', min: 0 },
};

const OUTCOME_FIELDS = [
  'status', 'output_summary', 'side_effects', 'artifacts_created',
  'error_message', 'timestamp_end', 'duration_ms', 'cost_estimate'
];

const OPEN_LOOP_SCHEMA = {
  loop_id:      { type: 'string', maxLength: 128 },
  action_id:    { type: 'string', required: true, maxLength: 128 },
  loop_type:    { type: 'string', required: true, enum: LOOP_TYPES },
  description:  { type: 'string', required: true, maxLength: 2000 },
  status:       { type: 'string', enum: LOOP_STATUSES },
  priority:     { type: 'string', enum: LOOP_PRIORITIES },
  owner:        { type: 'string', maxLength: 256 },
  resolution:   { type: 'string', maxLength: 2000 },
};

const ASSUMPTION_SCHEMA = {
  assumption_id:       { type: 'string', maxLength: 128 },
  action_id:           { type: 'string', required: true, maxLength: 128 },
  assumption:          { type: 'string', required: true, maxLength: 2000 },
  basis:               { type: 'string', maxLength: 2000 },
  validated:           { type: 'boolean' },
  invalidated:         { type: 'boolean' },
  invalidated_reason:  { type: 'string', maxLength: 2000 },
};

function validateField(key, value, rule) {
  if (value === undefined || value === null) {
    if (rule.required) return `${key} is required`;
    return null;
  }

  switch (rule.type) {
    case 'string':
      if (typeof value !== 'string') return `${key} must be a string`;
      if (value.length === 0 && rule.required) return `${key} cannot be empty`;
      if (rule.maxLength && value.length > rule.maxLength) return `${key} exceeds max length of ${rule.maxLength}`;
      if (rule.enum && !rule.enum.includes(value)) return `${key} must be one of: ${rule.enum.join(', ')}`;
      break;
    case 'integer':
      if (typeof value !== 'number' || !Number.isInteger(value)) return `${key} must be an integer`;
      if (rule.min !== undefined && value < rule.min) return `${key} must be >= ${rule.min}`;
      if (rule.max !== undefined && value > rule.max) return `${key} must be <= ${rule.max}`;
      break;
    case 'number':
      if (typeof value !== 'number') return `${key} must be a number`;
      if (rule.min !== undefined && value < rule.min) return `${key} must be >= ${rule.min}`;
      if (rule.max !== undefined && value > rule.max) return `${key} must be <= ${rule.max}`;
      break;
    case 'boolean':
      if (typeof value !== 'boolean') return `${key} must be a boolean`;
      break;
    case 'array':
      if (!Array.isArray(value)) return `${key} must be an array`;
      if (rule.maxItems && value.length > rule.maxItems) return `${key} exceeds max items of ${rule.maxItems}`;
      break;
  }
  return null;
}

function validate(body, schema) {
  const errors = [];
  const data = {};

  for (const [key, rule] of Object.entries(schema)) {
    const value = body[key];
    const error = validateField(key, value, rule);
    if (error) {
      errors.push(error);
    } else if (value !== undefined && value !== null) {
      data[key] = value;
    }
  }

  return {
    valid: errors.length === 0,
    data,
    errors
  };
}

export function validateActionRecord(body) {
  return validate(body, ACTION_RECORD_SCHEMA);
}

export function validateActionOutcome(body) {
  const outcomeSchema = {};
  for (const key of OUTCOME_FIELDS) {
    if (ACTION_RECORD_SCHEMA[key]) {
      outcomeSchema[key] = { ...ACTION_RECORD_SCHEMA[key], required: false };
    }
  }
  const result = validate(body, outcomeSchema);

  // Filter to only outcome fields
  const filtered = {};
  for (const key of OUTCOME_FIELDS) {
    if (result.data[key] !== undefined) filtered[key] = result.data[key];
  }
  result.data = filtered;

  // Must have at least one field
  if (result.valid && Object.keys(filtered).length === 0) {
    result.valid = false;
    result.errors.push('At least one outcome field is required: ' + OUTCOME_FIELDS.join(', '));
  }

  return result;
}

export function validateOpenLoop(body) {
  return validate(body, OPEN_LOOP_SCHEMA);
}

export function validateAssumption(body) {
  return validate(body, ASSUMPTION_SCHEMA);
}

export { ACTION_TYPES, ACTION_STATUSES, LOOP_TYPES, LOOP_STATUSES, LOOP_PRIORITIES, OUTCOME_FIELDS };
