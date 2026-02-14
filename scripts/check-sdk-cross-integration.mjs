#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DashClaw } from '../sdk/dashclaw.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const fixturePath = path.join(rootDir, 'docs', 'sdk-critical-contract-harness.json');

function deepOmitUndefined(value) {
  if (Array.isArray(value)) return value.map(deepOmitUndefined);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (v === undefined) continue;
    if (k === '_signature' && v === null) continue;
    out[k] = deepOmitUndefined(v);
  }
  return out;
}

function normalizeTimestamp(body) {
  if (!body || typeof body !== 'object') return body;
  if (Object.prototype.hasOwnProperty.call(body, 'timestamp_end') && typeof body.timestamp_end === 'string') {
    return { ...body, timestamp_end: '<timestamp>' };
  }
  return body;
}

function normalizeCall(call) {
  const parsed = new URL(call.path, 'https://example.test');
  const query = Array.from(parsed.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b));
  const body = normalizeTimestamp(deepOmitUndefined(call.body));
  return {
    method: String(call.method || '').toUpperCase(),
    pathname: parsed.pathname,
    query,
    body: body ?? null,
  };
}

async function captureNodeCalls() {
  const client = new DashClaw({
    baseUrl: 'https://example.test',
    apiKey: 'test-key',
    agentId: 'agent-1',
    agentName: 'Agent One',
  });

  const calls = [];
  client._request = async (pathName, method, body) => {
    calls.push({ path: pathName, method, body });
    return { ok: true };
  };

  const results = [];
  const capture = async (id, fn) => {
    const before = calls.length;
    await fn();
    if (calls.length <= before) {
      throw new Error(`No call captured for case: ${id}`);
    }
    results.push({ id, call: normalizeCall(calls.at(-1)) });
  };

  await capture('create_action', () => client.createAction({
    action_type: 'deploy',
    declared_goal: 'Ship release',
    risk_score: 40,
  }));
  await capture('update_outcome', () => client.updateOutcome('act_1', {
    status: 'completed',
    output_summary: 'done',
  }));
  await capture('get_actions', () => client.getActions({ status: 'running', limit: 5, offset: 0 }));
  await capture('get_action', () => client.getAction('act_1'));
  await capture('guard', () => client.guard({ action_type: 'deploy', risk_score: 55 }, { includeSignals: true }));
  await capture('get_guard_decisions', () => client.getGuardDecisions({ decision: 'warn', limit: 5, offset: 1 }));
  await capture('report_memory_health', () => client.reportMemoryHealth({
    health: { score: 88 },
    entities: [{ name: 'Repo' }],
    topics: [{ name: 'Ops' }],
  }));
  await capture('close_thread', () => client.closeThread('ct_1', 'done'));
  await capture('get_threads', () => client.getThreads({ status: 'active', limit: 10 }));
  await capture('mark_read', () => client.markRead(['msg_1']));
  await capture('archive_messages', () => client.archiveMessages(['msg_2']));
  await capture('broadcast', () => client.broadcast({
    type: 'status',
    subject: 'daily',
    body: 'status update',
    threadId: 'mt_1',
  }));
  await capture('create_message_thread', () => client.createMessageThread({
    name: 'Coordination',
    participants: ['agent-1', 'agent-2'],
  }));
  await capture('get_message_threads', () => client.getMessageThreads({ status: 'open', limit: 5 }));
  await capture('resolve_message_thread', () => client.resolveMessageThread('mt_1', 'resolved'));
  await capture('save_shared_doc', () => client.saveSharedDoc({ name: 'Ops Runbook', content: 'v1' }));
  await capture('sync_state', () => client.syncState({ goals: [{ title: 'Ship release' }] }));

  return results;
}

async function main() {
  const expectedRaw = JSON.parse(await fs.readFile(fixturePath, 'utf8'));
  const expected = new Map(expectedRaw.map((entry) => [entry.id, entry.call]));
  const actual = await captureNodeCalls();

  const seen = new Set();
  for (const entry of actual) {
    seen.add(entry.id);
    const fixture = expected.get(entry.id);
    if (!fixture) {
      throw new Error(`Unexpected integration case from Node harness: ${entry.id}`);
    }
    if (JSON.stringify(fixture) !== JSON.stringify(entry.call)) {
      throw new Error(`Node contract mismatch for case "${entry.id}"\nExpected: ${JSON.stringify(fixture)}\nActual:   ${JSON.stringify(entry.call)}`);
    }
  }

  for (const id of expected.keys()) {
    if (!seen.has(id)) {
      throw new Error(`Missing Node integration case: ${id}`);
    }
  }

  console.log(`Node SDK critical contract harness passed (${actual.length} cases).`);
}

main().catch((err) => {
  console.error(`Node SDK integration harness failed: ${err.message}`);
  process.exit(1);
});
