import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockListAgents, mockGetAllMetrics, mockUpdateMetrics } = vi.hoisted(() => ({
  mockListAgents: vi.fn(),
  mockGetAllMetrics: vi.fn(),
  mockUpdateMetrics: vi.fn(),
}));

vi.mock('@/lib/routing/registry.js', () => ({
  listAgents: mockListAgents,
  getAllMetrics: mockGetAllMetrics,
  updateMetrics: mockUpdateMetrics,
}));

// Mock findBestMatch and rankAgents from matcher — let them use real implementations
// Actually we need the real matcher for integration, so don't mock it.
// But we do need to mock registry calls that router.js imports from registry.

import { submitTask, routeTask, completeTask, listTasks, deleteTask, getTask } from '@/lib/routing/router.js';
import { createSqlMock } from '../helpers.js';

function makeTaskRow(overrides = {}) {
  return {
    id: 'rt_test123',
    org_id: 'org_1',
    title: 'Test task',
    description: 'A test',
    required_skills: '["code"]',
    urgency: 'normal',
    timeout_seconds: 3600,
    max_retries: 2,
    retry_count: 0,
    callback_url: null,
    status: 'pending',
    assigned_to: null,
    result: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeAgent(overrides = {}) {
  return {
    id: 'a1',
    name: 'Agent 1',
    capabilities: JSON.stringify(['code']),
    status: 'available',
    current_load: 0,
    max_concurrent: 3,
    endpoint: null,
    ...overrides,
  };
}

describe('submitTask', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates task and auto-routes, returns task with rt_ prefix', async () => {
    const task = makeTaskRow();
    const agent = makeAgent();
    mockListAgents.mockResolvedValue([agent]);
    mockGetAllMetrics.mockResolvedValue([]);

    const sql = createSqlMock({
      taggedResponses: [
        [], // INSERT
        [task], // SELECT for routeTask
        [], // UPDATE assigned
        [], // UPDATE agent load
        [], // INSERT routing decision
        [{ ...task, status: 'assigned', assigned_to: 'a1' }], // SELECT updated
      ],
    });

    const result = await submitTask(sql, 'org_1', { title: 'Test', requiredSkills: ['code'] });
    expect(result.task).toBeDefined();
    expect(sql.taggedCalls[0].text).toContain('INSERT INTO routing_tasks');
    expect(sql.taggedCalls[0].values[0]).toMatch(/^rt_/);
  });
});

describe('routeTask', () => {
  beforeEach(() => vi.clearAllMocks());

  it('assigns best match agent', async () => {
    const task = makeTaskRow();
    const agent = makeAgent();
    mockListAgents.mockResolvedValue([agent]);
    mockGetAllMetrics.mockResolvedValue([]);

    const sql = createSqlMock({
      taggedResponses: [
        [task], // SELECT task
        [], // UPDATE task assigned
        [], // UPDATE agent load
        [], // INSERT routing decision
        [{ ...task, status: 'assigned', assigned_to: 'a1' }], // SELECT updated
      ],
    });

    const result = await routeTask(sql, 'org_1', 'rt_test123');
    expect(result.routing.status).toBe('assigned');
    expect(result.routing.agent_id).toBe('a1');
  });

  it('returns pending when no matching agent', async () => {
    const task = makeTaskRow();
    mockListAgents.mockResolvedValue([]);
    mockGetAllMetrics.mockResolvedValue([]);

    const sql = createSqlMock({
      taggedResponses: [
        [task], // SELECT task
        [], // INSERT routing decision (no match)
      ],
    });

    const result = await routeTask(sql, 'org_1', 'rt_test123');
    expect(result.routing.status).toBe('pending');
    expect(result.routing.reason).toContain('No matching agent');
  });

  it('returns already_routed for non-pending task', async () => {
    const task = makeTaskRow({ status: 'assigned', assigned_to: 'a1' });
    const sql = createSqlMock({ taggedResponses: [[task]] });

    const result = await routeTask(sql, 'org_1', 'rt_test123');
    expect(result.routing.status).toBe('already_routed');
  });

  it('throws for non-existent task', async () => {
    const sql = createSqlMock({ taggedResponses: [[]] });
    await expect(routeTask(sql, 'org_1', 'rt_missing')).rejects.toThrow('Task not found');
  });
});

describe('completeTask', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks task as completed on success', async () => {
    const task = makeTaskRow({ status: 'assigned', assigned_to: 'a1' });
    mockUpdateMetrics.mockResolvedValue();

    const sql = createSqlMock({
      taggedResponses: [
        [task],     // SELECT task
        [],         // UPDATE status
        [],         // UPDATE agent load
        // updateMetrics is mocked — no tagged template call
        [{ ...task, status: 'completed' }], // SELECT completed
      ],
    });

    const result = await completeTask(sql, 'org_1', 'rt_test123', { success: true, result: { output: 'done' } });
    expect(result.routing.status).toBe('completed');
  });

  it('retries on failure when retry_count < max_retries', async () => {
    const task = makeTaskRow({ status: 'assigned', assigned_to: 'a1', retry_count: 0, max_retries: 2 });
    mockUpdateMetrics.mockResolvedValue();
    mockListAgents.mockResolvedValue([makeAgent()]);
    mockGetAllMetrics.mockResolvedValue([]);

    const sql = createSqlMock({
      taggedResponses: [
        [task],     // SELECT task (completeTask)
        [],         // UPDATE status to failed
        [],         // UPDATE agent load
        // updateMetrics is mocked — no tagged template call
        [],         // UPDATE to pending for retry
        [makeTaskRow({ retry_count: 1 })], // SELECT for routeTask
        [],         // UPDATE assigned
        [],         // UPDATE agent load
        [],         // routing decision
        [makeTaskRow({ status: 'assigned', assigned_to: 'a1' })], // SELECT updated
      ],
    });

    const result = await completeTask(sql, 'org_1', 'rt_test123', { success: false });
    expect(result.routing).toBeDefined();
  });

  it('escalates when max retries exceeded', async () => {
    const task = makeTaskRow({ status: 'assigned', assigned_to: 'a1', retry_count: 2, max_retries: 2 });
    mockUpdateMetrics.mockResolvedValue();

    const sql = createSqlMock({
      taggedResponses: [
        [task],     // SELECT task
        [],         // UPDATE status to failed
        [],         // UPDATE agent load
        // updateMetrics is mocked — no tagged template call
        [],         // UPDATE to escalated
        [{ ...task, status: 'escalated' }], // SELECT escalated
      ],
    });

    const result = await completeTask(sql, 'org_1', 'rt_test123', { success: false });
    expect(result.routing.status).toBe('escalated');
    expect(result.routing.reason).toContain('Max retries');
  });

  it('throws for non-existent task', async () => {
    const sql = createSqlMock({ taggedResponses: [[]] });
    await expect(completeTask(sql, 'org_1', 'rt_missing')).rejects.toThrow('Task not found');
  });
});

describe('listTasks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns formatted tasks', async () => {
    const task = makeTaskRow();
    const sql = createSqlMock({ taggedResponses: [[task]] });
    const result = await listTasks(sql, 'org_1');
    expect(result).toHaveLength(1);
    expect(Array.isArray(result[0].required_skills)).toBe(true);
  });

  it('filters by status', async () => {
    const sql = createSqlMock({ taggedResponses: [[]] });
    await listTasks(sql, 'org_1', { status: 'completed' });
    expect(sql.taggedCalls[0].text).toContain('status');
  });

  it('filters by assignedTo', async () => {
    const sql = createSqlMock({ taggedResponses: [[]] });
    await listTasks(sql, 'org_1', { assignedTo: 'a1' });
    expect(sql.taggedCalls[0].text).toContain('assigned_to');
  });
});

describe('getTask', () => {
  it('returns formatted task', async () => {
    const sql = createSqlMock({ taggedResponses: [[makeTaskRow()]] });
    const result = await getTask(sql, 'org_1', 'rt_test123');
    expect(result).toBeDefined();
    expect(Array.isArray(result.required_skills)).toBe(true);
  });

  it('returns null for missing task', async () => {
    const sql = createSqlMock({ taggedResponses: [[]] });
    const result = await getTask(sql, 'org_1', 'rt_missing');
    expect(result).toBeNull();
  });
});

describe('deleteTask', () => {
  it('returns true when task deleted', async () => {
    const sql = createSqlMock({ taggedResponses: [[{ id: 'rt_test' }]] });
    expect(await deleteTask(sql, 'org_1', 'rt_test')).toBe(true);
  });

  it('returns false when task not found', async () => {
    const sql = createSqlMock({ taggedResponses: [[]] });
    expect(await deleteTask(sql, 'org_1', 'rt_missing')).toBe(false);
  });
});
