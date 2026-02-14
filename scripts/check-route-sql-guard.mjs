#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { getRouteSqlBaselinePath, scanRouteSqlUsage } from './lib/route-sql-guard.mjs';

function toFileMap(snapshot) {
  return new Map(snapshot.files.map((entry) => [entry.file, entry]));
}

function compareUsage(baseline, current) {
  const issues = [];
  const baselineFiles = toFileMap(baseline);

  for (const fileEntry of current.files) {
    const baselineEntry = baselineFiles.get(fileEntry.file);
    if (!baselineEntry) {
      issues.push(
        `new route file with direct SQL usage: ${fileEntry.file} (tagged_template=${fileEntry.tagged_template}, query_call=${fileEntry.query_call})`
      );
      continue;
    }

    const taggedIncrease = fileEntry.tagged_template - (baselineEntry.tagged_template || 0);
    const queryIncrease = fileEntry.query_call - (baselineEntry.query_call || 0);
    const totalIncrease = fileEntry.total - (baselineEntry.total || 0);

    if (taggedIncrease > 0 || queryIncrease > 0 || totalIncrease > 0) {
      issues.push(
        `direct SQL usage increased in ${fileEntry.file} (tagged_template +${Math.max(
          taggedIncrease,
          0
        )}, query_call +${Math.max(queryIncrease, 0)}, total +${Math.max(totalIncrease, 0)})`
      );
    }
  }

  return issues;
}

async function main() {
  const rootDir = process.cwd();
  const baselinePath = getRouteSqlBaselinePath(rootDir);

  let baseline;
  try {
    baseline = JSON.parse(await fs.readFile(baselinePath, 'utf8'));
  } catch {
    console.error(`Route SQL baseline missing: ${path.relative(rootDir, baselinePath)}`);
    console.error('Run: npm run route-sql:baseline:generate and commit the baseline file.');
    process.exitCode = 1;
    return;
  }

  const current = await scanRouteSqlUsage(rootDir);
  const issues = compareUsage(baseline, current);

  if (issues.length > 0) {
    console.error('Route SQL guard violation(s):');
    for (const issue of issues) console.error(`- ${issue}`);
    console.error('New direct route-level SQL is blocked by WS1 M4 guardrail.');
    console.error('Refactor query logic into repositories before merging.');
    process.exitCode = 1;
    return;
  }

  console.log(
    `Route SQL guard passed: no direct SQL usage increases (current total ${current.totals.total}, baseline total ${baseline.totals?.total ?? 0}).`
  );
}

main().catch((err) => {
  console.error(`Route SQL guard check failed: ${err.message}`);
  process.exitCode = 1;
});
