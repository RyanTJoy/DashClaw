#!/usr/bin/env node

/**
 * ActionRecord Control Plane - Integration Test Script
 *
 * Tests all API endpoints and the SDK end-to-end.
 * Requires the dev server running: npm run dev
 *
 * Usage:
 *   node scripts/test-actions.mjs
 *   node scripts/test-actions.mjs http://localhost:3000
 *   DASHBOARD_API_KEY=xxx node scripts/test-actions.mjs https://your-app.vercel.app
 */

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const API_KEY = process.env.DASHBOARD_API_KEY || '';

let passed = 0;
let failed = 0;
const results = [];

function log(icon, msg) {
  console.log(`  ${icon} ${msg}`);
}

function assert(condition, label) {
  if (condition) {
    passed++;
    results.push({ label, ok: true });
    log('✅', label);
  } else {
    failed++;
    results.push({ label, ok: false });
    log('❌', label);
  }
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['x-api-key'] = API_KEY;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json();
  return { status: res.status, data };
}

// ──────────────────────────────────────────────
// Phase 1: Core API
// ──────────────────────────────────────────────

async function testCoreAPI() {
  console.log('\n━━━ Phase 1: Core API ━━━');

  // POST - Create action
  const { status: s1, data: d1 } = await request('POST', '/api/actions', {
    agent_id: 'test-agent-1',
    agent_name: 'Test Agent',
    action_type: 'build',
    declared_goal: 'Integration test action',
    reasoning: 'Testing the ActionRecord API end-to-end',
    systems_touched: ['local', 'test-db'],
    risk_score: 25,
    confidence: 90,
    reversible: true
  });
  assert(s1 === 201, `POST /api/actions returns 201 (got ${s1})`);
  assert(d1.action_id && d1.action_id.startsWith('act_'), `action_id is auto-generated: ${d1.action_id}`);
  const actionId = d1.action_id;

  // POST - Create second action (for stats)
  const { status: s1b } = await request('POST', '/api/actions', {
    agent_id: 'test-agent-2',
    agent_name: 'Second Agent',
    action_type: 'deploy',
    declared_goal: 'Second test action for stats',
    risk_score: 75,
    confidence: 60,
    reversible: false
  });
  assert(s1b === 201, 'POST second action returns 201');

  // GET - List actions
  const { status: s2, data: d2 } = await request('GET', '/api/actions?limit=10');
  assert(s2 === 200, `GET /api/actions returns 200 (got ${s2})`);
  assert(Array.isArray(d2.actions), 'Response has actions array');
  assert(d2.actions.length >= 2, `At least 2 actions returned (got ${d2.actions.length})`);
  assert(d2.stats && d2.stats.total !== undefined, 'Response includes stats');

  // GET - Filter by agent_id
  const { status: s3, data: d3 } = await request('GET', '/api/actions?agent_id=test-agent-1');
  assert(s3 === 200, 'GET with agent_id filter returns 200');
  assert(d3.actions.every(a => a.agent_id === 'test-agent-1'), 'All results match agent_id filter');

  // GET - Filter by risk_min
  const { status: s4, data: d4 } = await request('GET', '/api/actions?risk_min=70');
  assert(s4 === 200, 'GET with risk_min filter returns 200');
  assert(d4.actions.every(a => parseInt(a.risk_score, 10) >= 70), 'All results have risk_score >= 70');

  // GET - Single action
  const { status: s5, data: d5 } = await request('GET', `/api/actions/${actionId}`);
  assert(s5 === 200, `GET /api/actions/${actionId} returns 200`);
  assert(d5.action.action_id === actionId, 'Returned correct action');
  assert(Array.isArray(d5.open_loops), 'Includes open_loops array');
  assert(Array.isArray(d5.assumptions), 'Includes assumptions array');

  // GET - 404 for missing action
  const { status: s6 } = await request('GET', '/api/actions/act_nonexistent');
  assert(s6 === 404, 'GET missing action returns 404');

  // PATCH - Update outcome
  const { status: s7, data: d7 } = await request('PATCH', `/api/actions/${actionId}`, {
    status: 'completed',
    output_summary: 'Test completed successfully',
    side_effects: ['created test records'],
    artifacts_created: ['test-report.json'],
    duration_ms: 1500,
    cost_estimate: 0.003
  });
  assert(s7 === 200, `PATCH /api/actions/${actionId} returns 200`);
  assert(d7.action.status === 'completed', 'Status updated to completed');

  // PATCH - 404 for missing action
  const { status: s8 } = await request('PATCH', '/api/actions/act_nonexistent', { status: 'failed' });
  assert(s8 === 404, 'PATCH missing action returns 404');

  return actionId;
}

// ──────────────────────────────────────────────
// Phase 2: Validation
// ──────────────────────────────────────────────

async function testValidation() {
  console.log('\n━━━ Phase 2: Validation ━━━');

  // Missing required fields
  const { status: s1, data: d1 } = await request('POST', '/api/actions', {
    agent_name: 'Bad Agent'
    // missing: agent_id, action_type, declared_goal
  });
  assert(s1 === 400, `Missing required fields returns 400 (got ${s1})`);
  assert(d1.details && d1.details.length >= 3, `Reports ${d1.details?.length || 0} validation errors`);

  // Invalid enum value
  const { status: s2 } = await request('POST', '/api/actions', {
    agent_id: 'test',
    action_type: 'invalid_type',
    declared_goal: 'Test'
  });
  assert(s2 === 400, 'Invalid action_type returns 400');

  // Risk score out of range
  const { status: s3 } = await request('POST', '/api/actions', {
    agent_id: 'test',
    action_type: 'build',
    declared_goal: 'Test',
    risk_score: 200
  });
  assert(s3 === 400, 'risk_score > 100 returns 400');

  // PATCH with no outcome fields
  // Need a valid action first
  const { data: temp } = await request('POST', '/api/actions', {
    agent_id: 'val-test',
    action_type: 'test',
    declared_goal: 'Validation target'
  });
  const { status: s4 } = await request('PATCH', `/api/actions/${temp.action_id}`, {
    agent_id: 'trying to change identity'
  });
  assert(s4 === 400, 'PATCH with no valid outcome fields returns 400');
}

// ──────────────────────────────────────────────
// Phase 3: Open Loops
// ──────────────────────────────────────────────

async function testOpenLoops(actionId) {
  console.log('\n━━━ Phase 3: Open Loops ━━━');

  // POST - Create loop
  const { status: s1, data: d1 } = await request('POST', '/api/actions/loops', {
    action_id: actionId,
    loop_type: 'followup',
    description: 'Need to verify test results with team',
    priority: 'high',
    owner: 'wes'
  });
  assert(s1 === 201, `POST /api/actions/loops returns 201 (got ${s1})`);
  assert(d1.loop_id && d1.loop_id.startsWith('loop_'), `loop_id generated: ${d1.loop_id}`);
  const loopId = d1.loop_id;

  // POST - Create second loop
  const { status: s1b, data: d1b } = await request('POST', '/api/actions/loops', {
    action_id: actionId,
    loop_type: 'approval',
    description: 'Needs sign-off before production deploy',
    priority: 'critical'
  });
  assert(s1b === 201, 'Second loop created');

  // POST - Invalid parent
  const { status: s2 } = await request('POST', '/api/actions/loops', {
    action_id: 'act_nonexistent',
    loop_type: 'followup',
    description: 'Orphan loop'
  });
  assert(s2 === 404, 'Loop with invalid parent returns 404');

  // GET - List open loops
  const { status: s3, data: d3 } = await request('GET', '/api/actions/loops?status=open');
  assert(s3 === 200, 'GET /api/actions/loops returns 200');
  assert(Array.isArray(d3.loops), 'Response has loops array');
  assert(d3.stats && d3.stats.open_count !== undefined, 'Response includes stats');

  // GET - Single loop
  const { status: s4, data: d4 } = await request('GET', `/api/actions/loops/${loopId}`);
  assert(s4 === 200, `GET /api/actions/loops/${loopId} returns 200`);
  assert(d4.loop.loop_id === loopId, 'Returned correct loop');
  assert(d4.loop.agent_id, 'Loop includes parent action agent_id');

  // PATCH - Resolve loop
  const { status: s5, data: d5 } = await request('PATCH', `/api/actions/loops/${loopId}`, {
    status: 'resolved',
    resolution: 'Team confirmed test results are valid'
  });
  assert(s5 === 200, 'PATCH resolve loop returns 200');
  assert(d5.loop.status === 'resolved', 'Loop status is resolved');
  assert(d5.loop.resolved_at, 'resolved_at is set');

  // PATCH - Can't resolve already resolved
  const { status: s6 } = await request('PATCH', `/api/actions/loops/${loopId}`, {
    status: 'resolved',
    resolution: 'Double resolve'
  });
  assert(s6 === 409, 'Resolving already-resolved loop returns 409');

  // PATCH - Cancel the second loop
  const { status: s7 } = await request('PATCH', `/api/actions/loops/${d1b.loop_id}`, {
    status: 'cancelled'
  });
  assert(s7 === 200, 'Cancel loop returns 200');

  return loopId;
}

// ──────────────────────────────────────────────
// Phase 4: Assumptions
// ──────────────────────────────────────────────

async function testAssumptions(actionId) {
  console.log('\n━━━ Phase 4: Assumptions ━━━');

  // POST - Create assumption
  const { status: s1, data: d1 } = await request('POST', '/api/actions/assumptions', {
    action_id: actionId,
    assumption: 'Database schema is up to date',
    basis: 'Ran migrations 5 minutes ago'
  });
  assert(s1 === 201, `POST /api/actions/assumptions returns 201 (got ${s1})`);
  assert(d1.assumption_id && d1.assumption_id.startsWith('asm_'), `assumption_id generated: ${d1.assumption_id}`);

  // POST - Create second assumption
  const { status: s1b } = await request('POST', '/api/actions/assumptions', {
    action_id: actionId,
    assumption: 'API key will remain valid during test',
    basis: 'Key was rotated yesterday',
    validated: true
  });
  assert(s1b === 201, 'Second assumption created');

  // POST - Invalid parent
  const { status: s2 } = await request('POST', '/api/actions/assumptions', {
    action_id: 'act_nonexistent',
    assumption: 'Orphan assumption'
  });
  assert(s2 === 404, 'Assumption with invalid parent returns 404');

  // GET - List assumptions
  const { status: s3, data: d3 } = await request('GET', '/api/actions/assumptions');
  assert(s3 === 200, 'GET /api/actions/assumptions returns 200');
  assert(Array.isArray(d3.assumptions), 'Response has assumptions array');
  assert(d3.assumptions.length >= 2, `At least 2 assumptions returned (got ${d3.assumptions.length})`);

  // GET - Filter by action_id
  const { status: s4, data: d4 } = await request('GET', `/api/actions/assumptions?action_id=${actionId}`);
  assert(s4 === 200, 'Filter by action_id returns 200');
  assert(d4.assumptions.every(a => a.action_id === actionId), 'All results match action_id filter');
}

// ──────────────────────────────────────────────
// Phase 5: Risk Signals
// ──────────────────────────────────────────────

async function testRiskSignals() {
  console.log('\n━━━ Phase 5: Risk Signals ━━━');

  const { status: s1, data: d1 } = await request('GET', '/api/actions/signals');
  assert(s1 === 200, `GET /api/actions/signals returns 200 (got ${s1})`);
  assert(Array.isArray(d1.signals), 'Response has signals array');
  assert(d1.counts !== undefined, 'Response has counts');
  assert(typeof d1.counts.red === 'number', 'counts.red is a number');
  assert(typeof d1.counts.amber === 'number', 'counts.amber is a number');
  assert(typeof d1.counts.total === 'number', 'counts.total is a number');
  log('ℹ️', `Signals: ${d1.counts.red} red, ${d1.counts.amber} amber, ${d1.counts.total} total`);
}

// ──────────────────────────────────────────────
// Phase 6: SDK
// ──────────────────────────────────────────────

async function testSDK() {
  console.log('\n━━━ Phase 6: SDK ━━━');

  // Dynamic import of the SDK
  const { OpenClawAgent } = await import('../sdk/openclaw-agent.js');

  const agent = new OpenClawAgent({
    baseUrl: BASE_URL,
    apiKey: API_KEY || 'dev-mode',
    agentId: 'sdk-test-agent',
    agentName: 'SDK Test Agent',
    swarmId: 'test-swarm'
  });

  // Constructor validation
  let constructorThrew = false;
  try { new OpenClawAgent({}); } catch { constructorThrew = true; }
  assert(constructorThrew, 'Constructor throws without required params');

  // createAction
  const created = await agent.createAction({
    action_type: 'test',
    declared_goal: 'SDK integration test',
    risk_score: 15,
    confidence: 95
  });
  assert(created.action_id, `SDK createAction returns action_id: ${created.action_id}`);

  // updateOutcome
  const updated = await agent.updateOutcome(created.action_id, {
    status: 'completed',
    output_summary: 'SDK test passed',
    duration_ms: 500
  });
  assert(updated.action.status === 'completed', 'SDK updateOutcome sets status');

  // registerOpenLoop
  const loop = await agent.registerOpenLoop({
    action_id: created.action_id,
    loop_type: 'review',
    description: 'SDK test loop',
    priority: 'low'
  });
  assert(loop.loop_id, `SDK registerOpenLoop returns loop_id: ${loop.loop_id}`);

  // resolveOpenLoop
  const resolved = await agent.resolveOpenLoop(loop.loop_id, 'resolved', 'Resolved via SDK test');
  assert(resolved.loop.status === 'resolved', 'SDK resolveOpenLoop works');

  // registerAssumption
  const asm = await agent.registerAssumption({
    action_id: created.action_id,
    assumption: 'SDK is working correctly',
    basis: 'All previous tests passed'
  });
  assert(asm.assumption_id, `SDK registerAssumption returns assumption_id: ${asm.assumption_id}`);

  // getActions
  const actionsResult = await agent.getActions({ limit: 5 });
  assert(Array.isArray(actionsResult.actions), 'SDK getActions returns array');

  // getAction
  const detail = await agent.getAction(created.action_id);
  assert(detail.action.action_id === created.action_id, 'SDK getAction returns correct action');

  // getSignals
  const signals = await agent.getSignals();
  assert(Array.isArray(signals.signals), 'SDK getSignals returns array');

  // getOpenLoops
  const loopsResult = await agent.getOpenLoops({ status: 'open' });
  assert(Array.isArray(loopsResult.loops), 'SDK getOpenLoops returns array');

  // track() helper
  const trackResult = await agent.track({
    action_type: 'test',
    declared_goal: 'Test the track() helper',
    risk_score: 5
  }, async ({ action_id }) => {
    assert(!!action_id, `track() provides action_id: ${action_id}`);
    return 'track-result';
  });
  assert(trackResult === 'track-result', 'track() returns fn result');

  // track() failure handling
  let trackFailed = false;
  try {
    await agent.track({
      action_type: 'test',
      declared_goal: 'Test track() failure path',
      risk_score: 5
    }, async () => {
      throw new Error('Intentional test failure');
    });
  } catch (e) {
    trackFailed = e.message === 'Intentional test failure';
  }
  assert(trackFailed, 'track() re-throws errors and records failure');
}

// ──────────────────────────────────────────────
// Phase 7: Detail endpoint with populated data
// ──────────────────────────────────────────────

async function testDetailEndpoint(actionId) {
  console.log('\n━━━ Phase 7: Detail Endpoint (populated) ━━━');

  const { status, data } = await request('GET', `/api/actions/${actionId}`);
  assert(status === 200, 'GET detail for populated action returns 200');
  assert(data.open_loops.length >= 2, `Action has ${data.open_loops.length} loops`);
  assert(data.assumptions.length >= 2, `Action has ${data.assumptions.length} assumptions`);
  assert(data.action.status === 'completed', 'Action shows completed status');
}

// ──────────────────────────────────────────────
// Run all tests
// ──────────────────────────────────────────────

async function main() {
  console.log(`\n🧪 ActionRecord Control Plane - Integration Tests`);
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   API Key: ${API_KEY ? '***' + API_KEY.slice(-4) : '(none - dev mode)'}\n`);

  // Verify server is running
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`Health check returned ${res.status}`);
    log('✅', 'Server is running');
  } catch (error) {
    console.error(`\n❌ Cannot reach ${BASE_URL} - is the dev server running?`);
    console.error(`   Run: npm run dev\n`);
    process.exit(1);
  }

  try {
    const actionId = await testCoreAPI();
    await testValidation();
    await testOpenLoops(actionId);
    await testAssumptions(actionId);
    await testRiskSignals();
    await testSDK();
    await testDetailEndpoint(actionId);
  } catch (error) {
    console.error('\n💥 Test suite crashed:', error.message);
    console.error(error.stack);
    failed++;
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (failed > 0) {
    console.log('  Failed tests:');
    results.filter(r => !r.ok).forEach(r => console.log(`    ❌ ${r.label}`));
    console.log('');
    process.exit(1);
  }

  console.log('  🎉 All tests passed!\n');
}

main();
