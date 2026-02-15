/**
 * Adaptive file discovery for agent workspaces.
 * Recursively walks a directory and returns a flat array of file entries
 * with metadata for classification.
 */

import { readdirSync, statSync } from 'fs';
import { join, extname, basename, relative } from 'path';

const EXCLUDE_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', '.cache', '.output',
  '__pycache__', '.venv', 'venv', '.tox', 'coverage',
]);

const BINARY_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.webp',
  '.mp3', '.mp4', '.wav', '.avi', '.mov', '.mkv',
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.wasm',
  '.pdf', '.docx', '.xlsx', '.pptx',
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  '.sqlite', '.db',
]);

const MAX_DEPTH = 8;
const MAX_FILES = 5000;
const MAX_FILE_SIZE = 512 * 1024; // 512KB

/**
 * Discover all relevant files in a directory.
 * @param {string} dir - Root directory to scan
 * @param {object} [options]
 * @param {number} [options.maxDepth] - Max recursion depth (default 8)
 * @param {number} [options.maxFiles] - Max files to return (default 5000)
 * @param {number} [options.maxFileSize] - Max file size in bytes (default 512KB)
 * @returns {{ absolutePath: string, relativePath: string, filename: string, ext: string, size: number, depth: number, parentDir: string }[]}
 */
export function discoverFiles(dir, options = {}) {
  const maxDepth = options.maxDepth ?? MAX_DEPTH;
  const maxFiles = options.maxFiles ?? MAX_FILES;
  const maxFileSize = options.maxFileSize ?? MAX_FILE_SIZE;
  const results = [];

  function walk(current, depth) {
    if (depth > maxDepth || results.length >= maxFiles) return;

    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return; // permission denied, etc.
    }

    for (const entry of entries) {
      if (results.length >= maxFiles) return;
      const fullPath = join(current, entry.name);

      if (entry.isDirectory()) {
        if (EXCLUDE_DIRS.has(entry.name) || entry.name.startsWith('.') && entry.name !== '.claude') continue;
        walk(fullPath, depth + 1);
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (BINARY_EXTS.has(ext)) continue;

        let stat;
        try {
          stat = statSync(fullPath);
        } catch {
          continue;
        }
        if (stat.size > maxFileSize || stat.size === 0) continue;

        results.push({
          absolutePath: fullPath,
          relativePath: relative(dir, fullPath),
          filename: basename(entry.name),
          ext,
          size: stat.size,
          depth,
          parentDir: basename(current),
        });
      }
    }
  }

  walk(dir, 0);
  return results;
}
