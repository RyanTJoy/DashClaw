#!/usr/bin/env node

/**
 * Bootstrap Agent Scanner
 * Reads an agent's workspace and pushes discovered state to OpenClaw Pro.
 *
 * Usage:
 *   node scripts/bootstrap-agent.mjs --dir /path/to/agent --agent-id my-agent [options]
 *
 * Options:
 *   --dir          Agent workspace directory (required)
 *   --agent-id     Agent identifier (required)
 *   --agent-name   Human-readable agent name
 *   --base-url     API base URL (default: https://openclaw-pro.vercel.app)
 *   --api-key      API key (falls back to OPENCLAW_API_KEY / DASHBOARD_API_KEY env)
 *   --local        Shorthand for --base-url http://localhost:3000
 *   --dry-run      Print discovered data without pushing
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join, extname, basename } from 'path';
import { fileURLToPath } from 'url';

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// ─── Env / Args ─────────────────────────────────────────────

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, 'utf8').split('\n');
  for (const l of lines) {
    const idx = l.indexOf('=');
    if (idx > 0 && !l.startsWith('#')) {
      const key = l.slice(0, idx).trim();
      if (!process.env[key]) {
        process.env[key] = l.slice(idx + 1).trim();
      }
    }
  }
}

function loadEnv() {
  loadEnvFile(resolve(projectRoot, '.env.local'));
  loadEnvFile(resolve(projectRoot, '.env'));
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--local') args.local = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg.startsWith('--') && i + 1 < argv.length) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      args[key] = argv[++i];
    }
  }
  return args;
}

// ─── File Helpers ───────────────────────────────────────────

function safeRead(filePath) {
  try {
    return existsSync(filePath) ? readFileSync(filePath, 'utf8') : null;
  } catch { return null; }
}

function findFiles(dir, pattern, maxDepth = 3, depth = 0) {
  if (depth > maxDepth) return [];
  const results = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        results.push(...findFiles(full, pattern, maxDepth, depth + 1));
      } else if (entry.isFile() && pattern.test(entry.name)) {
        results.push(full);
      }
    }
  } catch { /* permission denied etc */ }
  return results;
}

// ─── Provider Detection ─────────────────────────────────────

const PROVIDER_MAP = {
  'GITHUB_': { provider: 'github', auth_type: 'oauth' },
  'GOOGLE_': { provider: 'google', auth_type: 'oauth' },
  'STRIPE_': { provider: 'stripe', auth_type: 'api_key' },
  'OPENAI_': { provider: 'openai', auth_type: 'api_key' },
  'ANTHROPIC_': { provider: 'anthropic', auth_type: 'api_key' },
  'RESEND_': { provider: 'resend', auth_type: 'api_key' },
  'AWS_': { provider: 'aws', auth_type: 'api_key' },
  'VERCEL_': { provider: 'vercel', auth_type: 'api_key' },
  'SLACK_': { provider: 'slack', auth_type: 'api_key' },
  'DISCORD_': { provider: 'discord', auth_type: 'api_key' },
  'TWILIO_': { provider: 'twilio', auth_type: 'api_key' },
  'SENDGRID_': { provider: 'sendgrid', auth_type: 'api_key' },
  'SUPABASE_': { provider: 'supabase', auth_type: 'api_key' },
  'FIREBASE_': { provider: 'firebase', auth_type: 'api_key' },
  'REDIS_': { provider: 'redis', auth_type: 'api_key' },
  'MONGODB_': { provider: 'mongodb', auth_type: 'api_key' },
  'POSTGRES': { provider: 'postgresql', auth_type: 'api_key' },
  'SENTRY_': { provider: 'sentry', auth_type: 'api_key' },
  'DATADOG_': { provider: 'datadog', auth_type: 'api_key' },
  'CLOUDFLARE_': { provider: 'cloudflare', auth_type: 'api_key' },
  'LINEAR_': { provider: 'linear', auth_type: 'api_key' },
  'NOTION_': { provider: 'notion', auth_type: 'api_key' },
};

const PKG_PROVIDER_MAP = {
  'stripe': { provider: 'stripe', auth_type: 'subscription' },
  '@anthropic-ai/sdk': { provider: 'anthropic', auth_type: 'api_key' },
  'openai': { provider: 'openai', auth_type: 'api_key' },
  '@neondatabase/serverless': { provider: 'neon', auth_type: 'api_key' },
  'resend': { provider: 'resend', auth_type: 'api_key' },
  '@supabase/supabase-js': { provider: 'supabase', auth_type: 'api_key' },
  'firebase': { provider: 'firebase', auth_type: 'api_key' },
  'firebase-admin': { provider: 'firebase', auth_type: 'api_key' },
  '@aws-sdk/client-s3': { provider: 'aws', auth_type: 'api_key' },
  'aws-sdk': { provider: 'aws', auth_type: 'api_key' },
  'redis': { provider: 'redis', auth_type: 'api_key' },
  'ioredis': { provider: 'redis', auth_type: 'api_key' },
  'mongoose': { provider: 'mongodb', auth_type: 'api_key' },
  'mongodb': { provider: 'mongodb', auth_type: 'api_key' },
  '@slack/web-api': { provider: 'slack', auth_type: 'api_key' },
  'discord.js': { provider: 'discord', auth_type: 'api_key' },
  '@sendgrid/mail': { provider: 'sendgrid', auth_type: 'api_key' },
  'next-auth': { provider: 'next-auth', auth_type: 'pre_configured' },
  '@sentry/nextjs': { provider: 'sentry', auth_type: 'api_key' },
  'dashclaw': { provider: 'openclaw', auth_type: 'api_key' },
};

// ─── Scanner Functions ──────────────────────────────────────

function scanConnections(dir) {
  const seen = new Map(); // provider -> connection

  // Scan .env files for key NAMES only (never values)
  for (const envFile of ['.env', '.env.local', '.env.example', '.env.production']) {
    const content = safeRead(join(dir, envFile));
    if (!content) continue;
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.startsWith('#') || !line.includes('=')) continue;
      const key = line.split('=')[0].trim();

      // Check for DATABASE_URL with neon
      if (key === 'DATABASE_URL') {
        // Check .env.example for hint (no real value)
        const example = safeRead(join(dir, '.env.example'));
        if (example && example.includes('neon')) {
          seen.set('neon', { provider: 'neon', auth_type: 'api_key', status: 'active' });
        } else {
          seen.set('postgresql', { provider: 'postgresql', auth_type: 'api_key', status: 'active' });
        }
        continue;
      }

      for (const [prefix, info] of Object.entries(PROVIDER_MAP)) {
        if (key.startsWith(prefix) || key === prefix.replace(/_$/, '')) {
          seen.set(info.provider, { ...info, status: 'active' });
        }
      }
    }
  }

  // Scan package.json deps
  const pkgContent = safeRead(join(dir, 'package.json'));
  if (pkgContent) {
    try {
      const pkg = JSON.parse(pkgContent);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [dep, info] of Object.entries(PKG_PROVIDER_MAP)) {
        if (allDeps[dep]) {
          if (!seen.has(info.provider)) {
            seen.set(info.provider, { ...info, status: 'active' });
          }
        }
      }
    } catch { /* invalid json */ }
  }

  return [...seen.values()];
}

function scanMemory(dir) {
  const claudeDir = join(dir, '.claude');
  if (!existsSync(claudeDir)) return null;

  const mdFiles = findFiles(claudeDir, /\.md$/i, 3);
  let totalLines = 0;
  let totalSize = 0;
  const entities = new Map();
  const topics = new Map();

  for (const f of mdFiles) {
    try {
      const stat = statSync(f);
      totalSize += stat.size;
      const content = readFileSync(f, 'utf8');
      const lines = content.split('\n');
      totalLines += lines.length;

      // Extract topics from ## headings
      for (const line of lines) {
        const headingMatch = line.match(/^##\s+(.+)/);
        if (headingMatch) {
          const name = headingMatch[1].trim();
          if (name.length > 2 && name.length < 100) {
            topics.set(name, (topics.get(name) || 0) + 1);
          }
        }
      }

      // Extract entities: **bold** terms, `backtick` terms
      const boldMatches = content.matchAll(/\*\*([^*]+)\*\*/g);
      for (const m of boldMatches) {
        const name = m[1].trim();
        if (name.length > 1 && name.length < 60) {
          entities.set(name, { name, type: 'concept', count: (entities.get(name)?.count || 0) + 1 });
        }
      }
      const codeMatches = content.matchAll(/`([^`]+)`/g);
      for (const m of codeMatches) {
        const name = m[1].trim();
        if (name.length > 1 && name.length < 60 && !name.includes(' ')) {
          entities.set(name, { name, type: 'code', count: (entities.get(name)?.count || 0) + 1 });
        }
      }
    } catch { /* read error */ }
  }

  // Also check project root CLAUDE.md
  const claudeMd = safeRead(join(dir, 'CLAUDE.md'));
  if (claudeMd) {
    totalLines += claudeMd.split('\n').length;
    totalSize += claudeMd.length;
  }

  // Health score
  let score = 50;
  const memoryMd = safeRead(join(claudeDir, 'MEMORY.md'));
  if (memoryMd) score += 10;
  if (totalLines > 100) score += 10;
  if (mdFiles.length > 3) score += 10;
  if (claudeMd) score += 10;
  if (topics.size > 5) score += 5;
  score = Math.min(100, score);

  return {
    health: {
      score,
      total_files: mdFiles.length + (claudeMd ? 1 : 0),
      total_lines: totalLines,
      total_size_kb: Math.round(totalSize / 1024),
      memory_md_lines: memoryMd ? memoryMd.split('\n').length : 0,
    },
    entities: [...entities.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 100)
      .map(e => ({ name: e.name, type: e.type, mentions: e.count })),
    topics: [...topics.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([name, count]) => ({ name, mentions: count })),
  };
}

function scanGoals(dir) {
  const goals = [];

  // Read tasks/todo.md
  const todoContent = safeRead(join(dir, 'tasks', 'todo.md'));
  if (todoContent) {
    for (const line of todoContent.split('\n')) {
      const unchecked = line.match(/^[-*]\s+\[\s\]\s+(.+)/);
      if (unchecked) {
        goals.push({ title: unchecked[1].trim(), status: 'active' });
        continue;
      }
      const checked = line.match(/^[-*]\s+\[x\]\s+(.+)/i);
      if (checked) {
        goals.push({ title: checked[1].trim(), status: 'completed', progress: 100 });
      }
    }
  }

  // Check CLAUDE.md for goals/TODO sections
  const claudeMd = safeRead(join(dir, 'CLAUDE.md'));
  if (claudeMd) {
    const sections = extractSections(claudeMd);
    for (const [heading, body] of sections) {
      const lower = heading.toLowerCase();
      if (lower.includes('goal') || lower.includes('todo') || lower.includes('next step')) {
        for (const line of body.split('\n')) {
          const bullet = line.match(/^[-*]\s+(.+)/);
          if (bullet) {
            const text = bullet[1].trim();
            if (text.length > 3 && !goals.some(g => g.title === text)) {
              goals.push({ title: text, status: 'active' });
            }
          }
        }
      }
    }
  }

  return goals;
}

function scanLearning(dir) {
  const decisions = [];

  // Read tasks/lessons.md
  const lessonsContent = safeRead(join(dir, 'tasks', 'lessons.md'));
  if (lessonsContent) {
    for (const line of lessonsContent.split('\n')) {
      const bullet = line.match(/^[-*]\s+(.+)/);
      if (bullet) {
        const text = bullet[1].trim();
        if (text.length > 5) {
          decisions.push({ decision: text, outcome: 'confirmed' });
        }
      }
    }
  }

  // Check CLAUDE.md for lessons/patterns sections
  const claudeMd = safeRead(join(dir, 'CLAUDE.md'));
  if (claudeMd) {
    const sections = extractSections(claudeMd);
    for (const [heading, body] of sections) {
      const lower = heading.toLowerCase();
      if (lower.includes('lesson') || lower.includes('key pattern') || lower.includes('convention')) {
        for (const line of body.split('\n')) {
          const bullet = line.match(/^[-*]\s+(.+)/);
          if (bullet) {
            const text = bullet[1].trim();
            if (text.length > 5 && !decisions.some(d => d.decision === text)) {
              decisions.push({ decision: text, context: heading, outcome: 'confirmed' });
            }
          }
        }
      }
    }
  }

  return decisions;
}

function scanContextPoints(dir) {
  const points = [];
  const claudeMd = safeRead(join(dir, 'CLAUDE.md'));
  if (!claudeMd) return points;

  const sections = extractSections(claudeMd);
  for (const [heading, body] of sections) {
    const lower = heading.toLowerCase();
    let category = 'general';
    let importance = 5;

    if (lower.includes('architecture') || lower.includes('tech stack')) {
      category = 'insight';
      importance = 8;
    } else if (lower.includes('pattern') || lower.includes('convention')) {
      category = 'insight';
      importance = 7;
    } else if (lower.includes('command') || lower.includes('deploy')) {
      category = 'general';
      importance = 6;
    } else if (lower.includes('decision') || lower.includes('choice')) {
      category = 'decision';
      importance = 7;
    }

    // Create a point per meaningful section
    const trimmed = body.trim();
    if (trimmed.length > 20 && trimmed.length < 5000) {
      points.push({
        content: `[${heading}] ${trimmed.slice(0, 2000)}`,
        category,
        importance,
      });
    }
  }

  return points;
}

function scanContextThreads(dir) {
  const threads = [];
  const claudeMd = safeRead(join(dir, 'CLAUDE.md'));
  if (!claudeMd) return threads;

  const sections = extractSections(claudeMd);
  for (const [heading, body] of sections) {
    const lines = body.trim().split('\n').filter(l => l.trim());
    if (lines.length >= 3) {
      threads.push({
        name: heading,
        summary: lines.slice(0, 3).join(' ').slice(0, 500),
      });
    }
  }

  return threads;
}

function scanSnippets(dir) {
  const snippets = [];
  const files = [
    join(dir, 'CLAUDE.md'),
    ...findFiles(join(dir, '.claude'), /\.md$/i, 2),
  ];

  for (const filePath of files) {
    const content = safeRead(filePath);
    if (!content) continue;

    let currentHeading = basename(filePath, '.md');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      // Track headings for naming
      const headingMatch = lines[i].match(/^#{1,3}\s+(.+)/);
      if (headingMatch) {
        currentHeading = headingMatch[1].trim();
        continue;
      }

      // Find fenced code blocks
      const fenceMatch = lines[i].match(/^```(\w*)/);
      if (!fenceMatch) continue;

      const language = fenceMatch[1] || null;
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }

      // Skip tiny blocks
      if (codeLines.length < 2) continue;

      const code = codeLines.join('\n');
      const name = `${currentHeading.replace(/[^a-zA-Z0-9\s-]/g, '').trim().slice(0, 50).replace(/\s+/g, '-').toLowerCase()}`;

      if (name && code.length > 10 && !snippets.some(s => s.name === name)) {
        snippets.push({
          name,
          description: `From ${basename(filePath)}: ${currentHeading}`,
          code,
          language,
        });
      }
    }
  }

  return snippets;
}

// ─── Helpers ────────────────────────────────────────────────

function extractSections(markdown) {
  const sections = [];
  const lines = markdown.split('\n');
  let currentHeading = null;
  let currentBody = [];

  for (const line of lines) {
    const match = line.match(/^##\s+(.+)/);
    if (match) {
      if (currentHeading) {
        sections.push([currentHeading, currentBody.join('\n')]);
      }
      currentHeading = match[1].trim();
      currentBody = [];
    } else if (currentHeading) {
      currentBody.push(line);
    }
  }
  if (currentHeading) {
    sections.push([currentHeading, currentBody.join('\n')]);
  }

  return sections;
}

function formatTable(data) {
  const maxKey = Math.max(...Object.keys(data).map(k => k.length), 10);
  const maxVal = Math.max(...Object.values(data).map(v => String(v).length), 5);
  const sep = `+${'-'.repeat(maxKey + 2)}+${'-'.repeat(maxVal + 2)}+`;

  const rows = [
    sep,
    `| ${'Category'.padEnd(maxKey)} | ${'Count'.padEnd(maxVal)} |`,
    sep,
    ...Object.entries(data).map(([k, v]) =>
      `| ${k.padEnd(maxKey)} | ${String(v).padEnd(maxVal)} |`
    ),
    sep,
  ];
  return rows.join('\n');
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  loadEnv();
  const args = parseArgs(process.argv);

  // Validate required args
  if (!args.dir) {
    console.error('Error: --dir is required (path to agent workspace)');
    process.exit(1);
  }
  if (!args.agentId) {
    console.error('Error: --agent-id is required');
    process.exit(1);
  }

  const dir = resolve(args.dir);
  if (!existsSync(dir)) {
    console.error(`Error: Directory not found: ${dir}`);
    process.exit(1);
  }

  console.log(`\nBootstrap Agent Scanner`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Directory: ${dir}`);
  console.log(`Agent ID:  ${args.agentId}`);
  console.log(`Mode:      ${args.dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log();

  // Run all scanners
  console.log('Scanning...\n');
  const payload = {};
  const summary = {};

  // Connections
  try {
    const connections = scanConnections(dir);
    if (connections.length) {
      payload.connections = connections;
      summary.connections = connections.length;
      console.log(`  Connections: ${connections.length} providers detected`);
      for (const c of connections) {
        console.log(`    - ${c.provider} (${c.auth_type})`);
      }
    } else {
      console.log('  Connections: none detected');
    }
  } catch (e) {
    console.error(`  Connections: ERROR - ${e.message}`);
  }

  // Memory
  try {
    const memory = scanMemory(dir);
    if (memory) {
      payload.memory = memory;
      summary.memory = 1;
      summary['  entities'] = memory.entities.length;
      summary['  topics'] = memory.topics.length;
      console.log(`  Memory: score=${memory.health.score}, ${memory.entities.length} entities, ${memory.topics.length} topics`);
    } else {
      console.log('  Memory: no .claude/ directory found');
    }
  } catch (e) {
    console.error(`  Memory: ERROR - ${e.message}`);
  }

  // Goals
  try {
    const goals = scanGoals(dir);
    if (goals.length) {
      payload.goals = goals;
      summary.goals = goals.length;
      console.log(`  Goals: ${goals.length} (${goals.filter(g => g.status === 'completed').length} completed)`);
    } else {
      console.log('  Goals: none found');
    }
  } catch (e) {
    console.error(`  Goals: ERROR - ${e.message}`);
  }

  // Learning
  try {
    const learning = scanLearning(dir);
    if (learning.length) {
      payload.learning = learning;
      summary.learning = learning.length;
      console.log(`  Learning: ${learning.length} decisions/lessons`);
    } else {
      console.log('  Learning: none found');
    }
  } catch (e) {
    console.error(`  Learning: ERROR - ${e.message}`);
  }

  // Context Points
  try {
    const points = scanContextPoints(dir);
    if (points.length) {
      payload.context_points = points;
      summary.context_points = points.length;
      console.log(`  Context Points: ${points.length} sections`);
    } else {
      console.log('  Context Points: none extracted');
    }
  } catch (e) {
    console.error(`  Context Points: ERROR - ${e.message}`);
  }

  // Context Threads
  try {
    const threads = scanContextThreads(dir);
    if (threads.length) {
      payload.context_threads = threads;
      summary.context_threads = threads.length;
      console.log(`  Context Threads: ${threads.length} threads`);
    } else {
      console.log('  Context Threads: none created');
    }
  } catch (e) {
    console.error(`  Context Threads: ERROR - ${e.message}`);
  }

  // Snippets
  try {
    const snippets = scanSnippets(dir);
    if (snippets.length) {
      payload.snippets = snippets;
      summary.snippets = snippets.length;
      console.log(`  Snippets: ${snippets.length} code blocks`);
    } else {
      console.log('  Snippets: none found');
    }
  } catch (e) {
    console.error(`  Snippets: ERROR - ${e.message}`);
  }

  console.log();

  // Dry run — print and exit
  if (args.dryRun) {
    console.log('DRY RUN — Summary:');
    console.log(formatTable(summary));
    console.log('\nPayload preview (JSON):');
    // Print with truncated code blocks for readability
    const preview = JSON.parse(JSON.stringify(payload));
    if (preview.snippets) {
      for (const s of preview.snippets) {
        if (s.code?.length > 80) s.code = s.code.slice(0, 80) + '...';
      }
    }
    if (preview.context_points) {
      for (const p of preview.context_points) {
        if (p.content?.length > 120) p.content = p.content.slice(0, 120) + '...';
      }
    }
    console.log(JSON.stringify(preview, null, 2));
    console.log('\nRe-run without --dry-run to push data.');
    return;
  }

  // Live mode — push via SDK
  const baseUrl = args.local
    ? 'http://localhost:3000'
    : (args.baseUrl || 'https://openclaw-pro.vercel.app');
  const apiKey = args.apiKey || process.env.OPENCLAW_API_KEY || process.env.DASHBOARD_API_KEY;

  if (!apiKey) {
    console.error('Error: No API key. Use --api-key or set OPENCLAW_API_KEY / DASHBOARD_API_KEY env var.');
    process.exit(1);
  }

  // Dynamic import of SDK from project
  const sdkPath = resolve(projectRoot, 'sdk', 'dashclaw.js');
  const { DashClaw } = await import(`file://${sdkPath.replace(/\\/g, '/')}`);

  const claw = new DashClaw({
    baseUrl,
    apiKey,
    agentId: args.agentId,
    agentName: args.agentName || args.agentId,
  });

  console.log(`Pushing to ${baseUrl}...`);

  const hasData = Object.keys(payload).length > 0;
  if (!hasData) {
    console.log('\nNo data discovered to sync. Check your agent workspace structure.');
    return;
  }

  try {
    const result = await claw.syncState(payload);
    console.log(`\nSync complete in ${result.duration_ms}ms`);
    console.log(`  Total synced:  ${result.total_synced}`);
    console.log(`  Total errors:  ${result.total_errors}`);

    if (result.results) {
      console.log('\nPer-category results:');
      for (const [cat, res] of Object.entries(result.results)) {
        const status = res.errors?.length ? `${res.synced} synced, ${res.errors.length} errors` : `${res.synced} synced`;
        console.log(`  ${cat}: ${status}`);
        if (res.errors?.length) {
          for (const err of res.errors.slice(0, 3)) {
            console.log(`    ! ${err}`);
          }
        }
      }
    }
  } catch (e) {
    console.error(`\nSync failed: ${e.message}`);
    process.exit(1);
  }
}

main();
