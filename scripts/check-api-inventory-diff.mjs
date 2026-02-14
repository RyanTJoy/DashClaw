#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  generateApiInventory,
  serializeApiInventoryJson,
  serializeApiInventoryMarkdown,
} from './generate-api-inventory.mjs';

function getInventoryJsonPath(rootDir = process.cwd()) {
  return path.join(rootDir, 'docs', 'api-inventory.json');
}

function getInventoryMarkdownPath(rootDir = process.cwd()) {
  return path.join(rootDir, 'docs', 'api-inventory.md');
}

async function readOrNull(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function main() {
  const rootDir = process.cwd();
  const inventory = await generateApiInventory(rootDir);
  const expectedJson = serializeApiInventoryJson(inventory);
  const expectedMd = serializeApiInventoryMarkdown(inventory);

  const jsonPath = getInventoryJsonPath(rootDir);
  const mdPath = getInventoryMarkdownPath(rootDir);
  const actualJson = await readOrNull(jsonPath);
  const actualMd = await readOrNull(mdPath);

  const issues = [];
  if (actualJson == null) {
    issues.push(`missing file: ${path.relative(rootDir, jsonPath)}`);
  } else if (actualJson !== expectedJson) {
    issues.push(`out-of-date file: ${path.relative(rootDir, jsonPath)}`);
  }

  if (actualMd == null) {
    issues.push(`missing file: ${path.relative(rootDir, mdPath)}`);
  } else if (actualMd !== expectedMd) {
    issues.push(`out-of-date file: ${path.relative(rootDir, mdPath)}`);
  }

  if (issues.length > 0) {
    console.error('API inventory drift detected:');
    for (const issue of issues) console.error(`- ${issue}`);
    console.error('Run: npm run api:inventory:generate and commit the updated artifacts.');
    process.exitCode = 1;
    return;
  }

  console.log('API inventory artifacts are up to date.');
}

main().catch((err) => {
  console.error(`API inventory check failed: ${err.message}`);
  process.exitCode = 1;
});
