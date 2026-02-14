#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { generateOpenApiSpec, getOpenApiOutputPath, serializeOpenApiSpec } from './generate-openapi.mjs';

async function main() {
  const rootDir = process.cwd();
  const outputPath = getOpenApiOutputPath(rootDir);
  const expected = serializeOpenApiSpec(await generateOpenApiSpec(rootDir));

  let actual;
  try {
    actual = await fs.readFile(outputPath, 'utf8');
  } catch {
    console.error(`OpenAPI artifact missing: ${path.relative(rootDir, outputPath)}`);
    console.error('Run: npm run openapi:generate');
    process.exitCode = 1;
    return;
  }

  if (actual !== expected) {
    console.error(`OpenAPI artifact is out of date: ${path.relative(rootDir, outputPath)}`);
    console.error('Run: npm run openapi:generate and commit the updated file.');
    process.exitCode = 1;
    return;
  }

  console.log(`OpenAPI artifact is up to date: ${path.relative(rootDir, outputPath)}`);
}

main().catch((err) => {
  console.error(`OpenAPI check failed: ${err.message}`);
  process.exitCode = 1;
});
