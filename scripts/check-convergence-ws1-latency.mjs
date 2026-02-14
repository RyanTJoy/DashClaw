#!/usr/bin/env node

import fs from 'node:fs/promises';

const BASELINE_PATH = process.argv[2] || 'docs/rfcs/platform-convergence-ws1-latency-baseline.json';
const EVIDENCE_PATH = process.argv[3] || 'docs/rfcs/platform-convergence-evidence.json';

async function readJson(path) {
  const raw = await fs.readFile(path, 'utf8');
  return JSON.parse(raw);
}

function getEvidenceP95Map(evidence) {
  const rows = evidence?.ws1_latency?.endpoint_benchmarks;
  if (!Array.isArray(rows)) return {};

  const out = {};
  for (const row of rows) {
    if (!row || row.skipped || typeof row.name !== 'string') continue;
    out[row.name] = Number(row.p95_ms || 0);
  }
  return out;
}

function fmtMs(v) {
  return `${Number(v).toFixed(2)}ms`;
}

async function main() {
  const baseline = await readJson(BASELINE_PATH);
  const evidence = await readJson(EVIDENCE_PATH);

  const baselineMap = baseline?.endpoint_p95_ms || {};
  const thresholdPct = Number(
    baseline?.threshold_pct
      ?? evidence?.ws1_latency?.regression_guard_threshold_pct
      ?? 10
  );
  const currentMap = getEvidenceP95Map(evidence);

  const failures = [];
  const lines = [];

  for (const [endpoint, baselineP95] of Object.entries(baselineMap)) {
    const currentP95 = currentMap[endpoint];
    if (currentP95 == null) {
      failures.push(`${endpoint}: missing in current evidence`);
      continue;
    }

    const allowedMax = Number(baselineP95) * (1 + thresholdPct / 100);
    const changePct = baselineP95 > 0
      ? ((Number(currentP95) - Number(baselineP95)) / Number(baselineP95)) * 100
      : 0;

    lines.push(
      `- ${endpoint}: baseline=${fmtMs(baselineP95)}, current=${fmtMs(currentP95)}, delta=${changePct.toFixed(2)}%, allowed<=${fmtMs(allowedMax)}`
    );

    if (Number(currentP95) > allowedMax) {
      failures.push(
        `${endpoint}: current p95 ${fmtMs(currentP95)} exceeds ${thresholdPct}% guardrail from baseline ${fmtMs(baselineP95)}`
      );
    }
  }

  console.log('WS1 latency regression check');
  console.log(`baseline: ${BASELINE_PATH}`);
  console.log(`evidence: ${EVIDENCE_PATH}`);
  console.log(`threshold: ${thresholdPct}%`);
  for (const line of lines) {
    console.log(line);
  }

  if (failures.length > 0) {
    console.error('\nFAILURES:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('\nPASS: all WS1 p95 latencies are within the allowed regression threshold.');
}

main().catch((err) => {
  console.error(`WS1 latency check failed: ${err?.message || err}`);
  process.exit(1);
});
