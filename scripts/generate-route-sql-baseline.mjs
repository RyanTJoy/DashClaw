#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  getRouteSqlBaselinePath,
  scanRouteSqlUsage,
  serializeRouteSqlBaseline,
} from './lib/route-sql-guard.mjs';

async function main() {
  const rootDir = process.cwd();
  const outputPath = getRouteSqlBaselinePath(rootDir);
  const snapshot = await scanRouteSqlUsage(rootDir);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, serializeRouteSqlBaseline(snapshot), 'utf8');

  console.log(`Route SQL baseline generated: ${path.relative(rootDir, outputPath)}`);
  console.log(
    `Tracked direct SQL usage: ${snapshot.totals.total} calls across ${snapshot.files_with_direct_sql} route files`
  );
}

main().catch((err) => {
  console.error(`Route SQL baseline generation failed: ${err.message}`);
  process.exitCode = 1;
});
