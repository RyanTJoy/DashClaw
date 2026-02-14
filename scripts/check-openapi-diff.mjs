#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { generateOpenApiSpec, getOpenApiOutputPath, serializeOpenApiSpec } from './generate-openapi.mjs';

function getOpenApiOverrideTag() {
  try {
    const commitBody = execSync('git log -1 --pretty=%B', { encoding: 'utf8' });
    const match = commitBody.match(/\[openapi-breaking-rfc:\s*(RFC-[^\]]+)\]/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

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
    const overrideRfc = getOpenApiOverrideTag();
    if (overrideRfc) {
      console.warn(`OpenAPI artifact drift detected, but override tag found: ${overrideRfc}`);
      console.warn('Bypassing drift failure per RFC-tag exception workflow.');
      return;
    }

    console.error(`OpenAPI artifact is out of date: ${path.relative(rootDir, outputPath)}`);
    console.error('Run: npm run openapi:generate and commit the updated file.');
    console.error('If this PR intentionally introduces a stable breaking change, include commit tag:');
    console.error('[openapi-breaking-rfc: RFC-<id>]');
    process.exitCode = 1;
    return;
  }

  console.log(`OpenAPI artifact is up to date: ${path.relative(rootDir, outputPath)}`);
}

main().catch((err) => {
  console.error(`OpenAPI check failed: ${err.message}`);
  process.exitCode = 1;
});
