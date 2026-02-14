#!/usr/bin/env node

import fs from 'node:fs/promises';

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const OUT_PATH = process.argv[3] || '';
const API_KEY = process.env.DASHCLAW_API_KEY || '';

const headers = {
  'Content-Type': 'application/json',
};
if (API_KEY) headers['x-api-key'] = API_KEY;

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function summarizeLatencies(latencies) {
  return {
    count: latencies.length,
    p50_ms: Number(percentile(latencies, 50).toFixed(2)),
    p95_ms: Number(percentile(latencies, 95).toFixed(2)),
    p99_ms: Number(percentile(latencies, 99).toFixed(2)),
    max_ms: Number(Math.max(...latencies, 0).toFixed(2)),
  };
}

async function request(method, path, body, extraHeaders = {}) {
  const start = performance.now();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { ...headers, ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  });
  const elapsed = performance.now() - start;
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data, elapsed_ms: elapsed };
}

async function benchmarkEndpoint({ name, method = 'GET', path, body = null, iterations = 120, concurrency = 6 }) {
  const latencies = [];
  let success = 0;
  let failures = 0;
  let cursor = 0;

  async function worker() {
    while (true) {
      const i = cursor;
      cursor += 1;
      if (i >= iterations) return;
      const res = await request(method, path, body);
      latencies.push(res.elapsed_ms);
      if (res.status >= 200 && res.status < 300) success += 1;
      else failures += 1;
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return {
    name,
    method,
    path,
    success,
    failures,
    success_rate: Number(((success / iterations) * 100).toFixed(2)),
    ...summarizeLatencies(latencies),
  };
}

function parseSseBlock(raw) {
  const lines = raw.replace(/\r/g, '').split('\n').filter(Boolean);
  let id = null;
  let event = 'message';
  let data = '';
  for (const line of lines) {
    if (line.startsWith('id:')) id = line.slice(3).trim();
    else if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data += line.slice(5).trim();
  }
  let parsed = null;
  try {
    parsed = data ? JSON.parse(data) : null;
  } catch {}
  return { id, event, data: parsed };
}

async function openSseStream({ lastEventId = null } = {}) {
  const extraHeaders = {};
  if (lastEventId) extraHeaders['last-event-id'] = lastEventId;
  const res = await fetch(`${BASE_URL}/api/stream`, {
    method: 'GET',
    headers: { ...headers, ...extraHeaders },
  });
  if (!res.ok || !res.body) {
    throw new Error(`SSE connect failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const state = {
    all: [],
    actionCreated: [],
    connected: false,
    errors: [],
  };

  let buffer = '';
  let closed = false;

  const done = (async () => {
    try {
      while (!closed) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        let splitIdx = buffer.indexOf('\n\n');
        while (splitIdx >= 0) {
          const block = buffer.slice(0, splitIdx);
          buffer = buffer.slice(splitIdx + 2);
          const parsed = parseSseBlock(block);
          state.all.push(parsed);
          if (parsed.event === 'connected') state.connected = true;
          if (parsed.event === 'action.created') state.actionCreated.push(parsed);
          splitIdx = buffer.indexOf('\n\n');
        }
      }
    } catch (err) {
      state.errors.push(err?.message || String(err));
    }
  })();

  return {
    state,
    close: async () => {
      closed = true;
      try {
        await reader.cancel();
      } catch {}
      await done;
    },
  };
}

function countUniqueActions(actionEvents, expectedIds) {
  const seen = new Set();
  for (const evt of actionEvents) {
    const id = evt?.data?.action_id;
    if (!id) continue;
    if (expectedIds && !expectedIds.has(id)) continue;
    seen.add(id);
  }
  return seen.size;
}

async function waitFor(predicate, timeoutMs = 30000, intervalMs = 100) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

async function runRealtimeEvidence() {
  const streamA = await openSseStream();
  const streamB = await openSseStream();

  const expectedActionIds = new Set();
  const sendCount = 40;
  for (let i = 0; i < sendCount; i += 1) {
    const post = await request('POST', '/api/actions', {
      agent_id: 'convergence-load-agent',
      action_type: 'monitor',
      declared_goal: `SSE evidence event ${i + 1}`,
      risk_score: 5,
    });
    if (post.status >= 200 && post.status < 300 && post.data?.action_id) {
      expectedActionIds.add(post.data.action_id);
    }
  }

  await waitFor(
    () => countUniqueActions(streamA.state.actionCreated, expectedActionIds) >= expectedActionIds.size
      && countUniqueActions(streamB.state.actionCreated, expectedActionIds) >= expectedActionIds.size,
    45000,
    150
  );

  const receivedAUnique = countUniqueActions(streamA.state.actionCreated, expectedActionIds);
  const receivedBUnique = countUniqueActions(streamB.state.actionCreated, expectedActionIds);
  const totalA = streamA.state.actionCreated.filter((e) => expectedActionIds.has(e?.data?.action_id)).length;
  const totalB = streamB.state.actionCreated.filter((e) => expectedActionIds.has(e?.data?.action_id)).length;

  const lastEventId = streamA.state.actionCreated.at(-1)?.id || null;
  await streamA.close();

  const replayExpected = new Set();
  for (let i = 0; i < 5; i += 1) {
    const post = await request('POST', '/api/actions', {
      agent_id: 'convergence-load-agent',
      action_type: 'monitor',
      declared_goal: `SSE replay event ${i + 1}`,
      risk_score: 5,
    });
    if (post.status >= 200 && post.status < 300 && post.data?.action_id) {
      replayExpected.add(post.data.action_id);
    }
  }

  const replayStream = await openSseStream({ lastEventId });
  await waitFor(() => countUniqueActions(replayStream.state.actionCreated, replayExpected) >= replayExpected.size, 20000, 150);
  const replayRecovered = countUniqueActions(replayStream.state.actionCreated, replayExpected);

  await replayStream.close();
  await streamB.close();

  const expectedCount = expectedActionIds.size;
  const deliveryRateA = expectedCount ? (receivedAUnique / expectedCount) * 100 : 0;
  const deliveryRateB = expectedCount ? (receivedBUnique / expectedCount) * 100 : 0;
  const duplicateRateA = totalA ? ((totalA - receivedAUnique) / totalA) * 100 : 0;
  const duplicateRateB = totalB ? ((totalB - receivedBUnique) / totalB) * 100 : 0;

  return {
    expected_events: expectedCount,
    subscriber_a: {
      unique_received: receivedAUnique,
      total_received: totalA,
      delivery_success_rate_pct: Number(deliveryRateA.toFixed(3)),
      duplicate_rate_pct: Number(duplicateRateA.toFixed(3)),
    },
    subscriber_b: {
      unique_received: receivedBUnique,
      total_received: totalB,
      delivery_success_rate_pct: Number(deliveryRateB.toFixed(3)),
      duplicate_rate_pct: Number(duplicateRateB.toFixed(3)),
    },
    replay: {
      last_event_id_used: lastEventId,
      expected_replay_events: replayExpected.size,
      recovered_unique_events: replayRecovered,
      recovered_within_60s: replayRecovered >= replayExpected.size,
    },
  };
}

async function main() {
  const health = await request('GET', '/api/health');
  if (health.status < 200 || health.status >= 300) {
    throw new Error(`Server health check failed (${health.status}) at ${BASE_URL}`);
  }

  const seed = await request('POST', '/api/actions', {
    agent_id: 'convergence-bench-agent',
    action_type: 'monitor',
    declared_goal: 'Seed benchmark action',
    risk_score: 5,
  });
  const seededActionId = seed.data?.action_id || 'act_1';

  const ws1Benchmarks = [];
  ws1Benchmarks.push(await benchmarkEndpoint({
    name: 'actions.list',
    path: '/api/actions?limit=25',
  }));
  ws1Benchmarks.push(await benchmarkEndpoint({
    name: 'actions.detail',
    path: `/api/actions/${seededActionId}`,
  }));
  ws1Benchmarks.push(await benchmarkEndpoint({
    name: 'messages.inbox',
    path: '/api/messages?agent_id=convergence-bench-agent&direction=inbox&limit=25',
  }));
  ws1Benchmarks.push(await benchmarkEndpoint({
    name: 'context.threads',
    path: '/api/context/threads?agent_id=convergence-bench-agent&limit=25',
  }));

  const realtime = await runRealtimeEvidence();

  const maxP95 = Math.max(...ws1Benchmarks.map((b) => b.p95_ms));

  const report = {
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    ws1_latency: {
      endpoint_benchmarks: ws1Benchmarks,
      max_endpoint_p95_ms: Number(maxP95.toFixed(2)),
      regression_guard_threshold_pct: 10,
      notes: 'Endpoint p95 values captured post-migration for critical repository-backed routes.',
    },
    ws3_realtime: realtime,
    ws3_slo_checks: {
      delivery_success_rate_target_pct: 99.9,
      duplicate_tolerance_target_pct: 0.1,
      replay_window_target_seconds: 60,
      met: {
        delivery_success_rate: realtime.subscriber_a.delivery_success_rate_pct >= 99.9 && realtime.subscriber_b.delivery_success_rate_pct >= 99.9,
        duplicate_tolerance: realtime.subscriber_a.duplicate_rate_pct <= 0.1 && realtime.subscriber_b.duplicate_rate_pct <= 0.1,
        replay_window: realtime.replay.recovered_within_60s,
      },
    },
  };

  const serialized = JSON.stringify(report, null, 2);
  if (OUT_PATH) {
    await fs.writeFile(OUT_PATH, `${serialized}\n`, 'utf8');
    console.log(`Wrote platform convergence evidence: ${OUT_PATH}`);
  } else {
    console.log(serialized);
  }
}

main().catch((err) => {
  console.error(`Evidence collection failed: ${err.message}`);
  process.exit(1);
});
