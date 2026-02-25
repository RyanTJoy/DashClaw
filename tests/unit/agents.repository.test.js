import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listAgentsForOrg } from '../../app/lib/repositories/agents.repository.js';

describe('listAgentsForOrg', () => {
  let mockSql;
  let mockEnv;

  beforeEach(() => {
    mockSql = {
      query: vi.fn(),
    };
    mockEnv = { ...process.env };
    process.env.AGENT_ONLINE_WINDOW_MS = '600000'; // 10 minutes
  });

  afterEach(() => {
    process.env = mockEnv;
    vi.clearAllMocks();
  });

  it('calculates presence state correctly based on heartbeat', async () => {
    const orgId = 'org_123';
    const now = Date.now();
    
    // Mock agents from actions
    const mockAgents = [
      { agent_id: 'agent_online', agent_name: 'Online Agent', action_count: 5, last_active: new Date(now - 480000).toISOString() }, // 8m ago
      { agent_id: 'agent_offline', agent_name: 'Offline Agent', action_count: 2, last_active: new Date(now - 3600000).toISOString() }, // 1h ago
    ];

    // Mock presence table
    const mockPresence = [
      { agent_id: 'agent_online', status: 'online', last_heartbeat_at: new Date(now - 60000).toISOString() }, // 1m ago (heartbeat overrides action)
      { agent_id: 'agent_stale', status: 'online', last_heartbeat_at: new Date(now - 900000).toISOString() }, // 15m ago (stale)
    ];

    // Mock SQL queries in sequence:
    // 1. action_records
    // 2. goals
    // 3. decisions
    // 4. token_snapshots
    // 5. agent_presence
    mockSql.query
      .mockResolvedValueOnce(mockAgents) // action_records
      .mockResolvedValueOnce([]) // goals
      .mockResolvedValueOnce([]) // decisions
      .mockResolvedValueOnce([]) // snapshots
      .mockResolvedValueOnce(mockPresence); // agent_presence

    const result = await listAgentsForOrg(mockSql, orgId);

    // Online agent (heartbeat < 10m)
    const online = result.find(a => a.agent_id === 'agent_online');
    expect(online).toBeDefined();
    expect(online.presence_state).toBe('online');
    expect(online.seconds_since_seen).toBeLessThan(600); // < 10m

    // Stale agent (heartbeat 10m-30m, only in presence table)
    const stale = result.find(a => a.agent_id === 'agent_stale');
    expect(stale).toBeDefined();
    expect(stale.presence_state).toBe('stale');
    expect(stale.seconds_since_seen).toBeGreaterThan(600);
    expect(stale.seconds_since_seen).toBeLessThan(1800);

    // Offline agent (last active > 30m, no heartbeat)
    const offline = result.find(a => a.agent_id === 'agent_offline');
    expect(offline).toBeDefined();
    expect(offline.presence_state).toBe('offline');
  });

  it('respects org scoping', async () => {
    const orgId = 'org_A';
    
    mockSql.query.mockResolvedValue([]); // All queries return empty
    
    const result = await listAgentsForOrg(mockSql, orgId);
    expect(result).toHaveLength(0);
    
    // Verify org_id was passed to query
    expect(mockSql.query).toHaveBeenCalledWith(expect.stringContaining('WHERE org_id = $1'), expect.arrayContaining([orgId]));
  });
});
