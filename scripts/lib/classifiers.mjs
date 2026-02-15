/**
 * File classification for agent workspace discovery.
 * Each file entry is classified into a category with a confidence score.
 * Classifier chain runs in priority order — first match wins.
 */

import { readFileSync } from 'fs';
import { basename, dirname, sep } from 'path';

// ─── Category Constants ─────────────────────────────────────

export const CATEGORIES = {
  CONFIG_ENV: 'config_env',
  CONFIG_PACKAGE: 'config_package',
  IDENTITY: 'identity',
  USER_PROFILE: 'user_profile',
  RELATIONSHIPS: 'relationships',
  PROJECT: 'project',
  CAPABILITY_SKILL: 'capability_skill',
  CAPABILITY_TOOL: 'capability_tool',
  OPERATIONAL_CONFIG: 'operational_config',
  DECISIONS: 'decisions',
  DAILY_LOG: 'daily_log',
  GOALS: 'goals',
  LEARNING: 'learning',
  CREATIVE: 'creative',
  MEMORY_GENERAL: 'memory_general',
  UNKNOWN: 'unknown',
};

// ─── Path normalization helper ──────────────────────────────

function normParts(relativePath) {
  return relativePath.replace(/\\/g, '/').toLowerCase().split('/');
}

// ─── Classifier Chain ───────────────────────────────────────
// Each classifier: (entry) => { category, confidence } | null

const classifiers = [
  // 1. Config / env files
  (entry) => {
    const name = entry.filename.toLowerCase();
    if (name.startsWith('.env') || name === '.env.example') {
      return { category: CATEGORIES.CONFIG_ENV, confidence: 95 };
    }
    if (name === 'package.json' || name === 'package-lock.json') {
      return { category: CATEGORIES.CONFIG_PACKAGE, confidence: 95 };
    }
    if (['tsconfig.json', 'jsconfig.json', '.eslintrc', '.eslintrc.json', '.prettierrc', '.prettierrc.json'].includes(name)) {
      return { category: CATEGORIES.CONFIG_PACKAGE, confidence: 80 };
    }
    return null;
  },

  // 2. Identity files
  (entry) => {
    const name = entry.filename.toLowerCase();
    const identityNames = ['identity.md', 'soul.md', 'values.md', 'character.md', 'persona.md', 'who-i-am.md', 'about-me.md', 'self.md'];
    if (identityNames.includes(name)) {
      return { category: CATEGORIES.IDENTITY, confidence: 95 };
    }
    // Check for identity-like headings in parent context
    const parts = normParts(entry.relativePath);
    if (parts.some(p => p === 'identity' || p === 'persona' || p === 'character')) {
      return { category: CATEGORIES.IDENTITY, confidence: 85 };
    }
    return null;
  },

  // 3. User/operator files
  (entry) => {
    const name = entry.filename.toLowerCase();
    const userNames = ['user.md', 'operator.md', 'owner.md', 'human.md', 'principal.md'];
    if (userNames.includes(name)) {
      return { category: CATEGORIES.USER_PROFILE, confidence: 90 };
    }
    return null;
  },

  // 4. Relationship files
  (entry) => {
    const name = entry.filename.toLowerCase();
    const parts = normParts(entry.relativePath);
    if (parts.some(p => p === 'people' || p === 'relationships' || p === 'contacts')) {
      return { category: CATEGORIES.RELATIONSHIPS, confidence: 90 };
    }
    if (name === 'relationships.json' || name === 'people.json' || name === 'contacts.json') {
      return { category: CATEGORIES.RELATIONSHIPS, confidence: 90 };
    }
    if (name === 'relationships.md' || name === 'people.md' || name === 'contacts.md') {
      return { category: CATEGORIES.RELATIONSHIPS, confidence: 85 };
    }
    return null;
  },

  // 5. Project files (only .md/.json — projects/ often contains full codebases)
  (entry) => {
    const name = entry.filename.toLowerCase();
    const parts = normParts(entry.relativePath);
    if (parts.some(p => p === 'projects') && (entry.ext === '.md' || entry.ext === '.json')) {
      return { category: CATEGORIES.PROJECT, confidence: 85 };
    }
    if (name === 'projects.md' || name === 'project_status.md' || name === 'project-status.md') {
      return { category: CATEGORIES.PROJECT, confidence: 90 };
    }
    return null;
  },

  // 6. Skill directories
  (entry) => {
    const parts = normParts(entry.relativePath);
    if (parts.some(p => p === 'skills')) {
      return { category: CATEGORIES.CAPABILITY_SKILL, confidence: 90 };
    }
    return null;
  },

  // 7. Tool directories / TOOLS.md files (only .md docs, not source code)
  (entry) => {
    if (entry.ext !== '.md') return null;
    const name = entry.filename.toLowerCase();
    const parts = normParts(entry.relativePath);
    if (parts.some(p => p === 'tools')) {
      return { category: CATEGORIES.CAPABILITY_TOOL, confidence: 85 };
    }
    if (name.startsWith('tools') && name.endsWith('.md')) {
      return { category: CATEGORIES.CAPABILITY_TOOL, confidence: 85 };
    }
    return null;
  },

  // 8. Operational config
  (entry) => {
    const name = entry.filename.toLowerCase();
    const opNames = [
      'heartbeat.md', 'security.md', 'guardrails.md', 'safety.md',
      'boundaries.md', 'rules.md', 'constraints.md', 'protocols.md',
      'security-policy.md', 'operational.md',
    ];
    if (opNames.includes(name)) {
      return { category: CATEGORIES.OPERATIONAL_CONFIG, confidence: 90 };
    }
    return null;
  },

  // 9. Decision logs
  (entry) => {
    const parts = normParts(entry.relativePath);
    if (parts.some(p => p === 'decisions') && entry.ext === '.md') {
      return { category: CATEGORIES.DECISIONS, confidence: 90 };
    }
    const name = entry.filename.toLowerCase();
    if (name === 'decisions.md' || name === 'decision-log.md') {
      return { category: CATEGORIES.DECISIONS, confidence: 85 };
    }
    return null;
  },

  // 10. Daily logs (YYYY-MM-DD.md pattern)
  (entry) => {
    if (/^\d{4}-\d{2}-\d{2}(?:-[\w]+)?\.md$/i.test(entry.filename)) {
      return { category: CATEGORIES.DAILY_LOG, confidence: 90 };
    }
    return null;
  },

  // 11. Goals/tasks
  (entry) => {
    const name = entry.filename.toLowerCase();
    const parts = normParts(entry.relativePath);
    if (parts.some(p => p === 'tasks')) {
      return { category: CATEGORIES.GOALS, confidence: 80 };
    }
    if (name === 'todo.md' || name === 'goals.md' || name === 'pending-tasks.md' || name === 'backlog.md') {
      return { category: CATEGORIES.GOALS, confidence: 85 };
    }
    return null;
  },

  // 12. Learning/lessons
  (entry) => {
    const name = entry.filename.toLowerCase();
    if (name === 'lessons.md' || name === 'patterns.md' || name === 'learnings.md' || name === 'insights.md') {
      return { category: CATEGORIES.LEARNING, confidence: 85 };
    }
    return null;
  },

  // 13. Creative works
  (entry) => {
    const parts = normParts(entry.relativePath);
    if (parts.some(p => p === 'creative' || p === 'writing' || p === 'compositions' || p === 'stories' || p === 'poems')) {
      return { category: CATEGORIES.CREATIVE, confidence: 85 };
    }
    return null;
  },

  // 14. General memory markdown
  (entry) => {
    const parts = normParts(entry.relativePath);
    if (entry.ext === '.md' && parts.some(p => p === 'memory' || p === '.claude')) {
      return { category: CATEGORIES.MEMORY_GENERAL, confidence: 70 };
    }
    return null;
  },

  // 15. Ambiguous markdown — peek at content headings
  (entry) => {
    if (entry.ext !== '.md') return null;

    // Try reading first 2KB for heading hints
    try {
      const content = readFileSync(entry.absolutePath, 'utf8').slice(0, 2048);
      const headings = content.match(/^#{1,3}\s+(.+)/gm) || [];
      const headingText = headings.join(' ').toLowerCase();

      if (headingText.includes('identity') || headingText.includes('values') || headingText.includes('who i am')) {
        return { category: CATEGORIES.IDENTITY, confidence: 60 };
      }
      if (headingText.includes('goal') || headingText.includes('task') || headingText.includes('todo')) {
        return { category: CATEGORIES.GOALS, confidence: 60 };
      }
      if (headingText.includes('lesson') || headingText.includes('pattern') || headingText.includes('learning')) {
        return { category: CATEGORIES.LEARNING, confidence: 60 };
      }
      if (headingText.includes('decision')) {
        return { category: CATEGORIES.DECISIONS, confidence: 60 };
      }
      if (headingText.includes('project') || headingText.includes('status')) {
        return { category: CATEGORIES.PROJECT, confidence: 55 };
      }
    } catch {
      // read error — skip content-based classification
    }

    return { category: CATEGORIES.MEMORY_GENERAL, confidence: 40 };
  },
];

// ─── Public API ─────────────────────────────────────────────

/**
 * Classify a single file entry.
 * @param {{ absolutePath: string, relativePath: string, filename: string, ext: string, size: number, depth: number, parentDir: string }} entry
 * @returns {{ category: string, confidence: number }}
 */
export function classifyFile(entry) {
  for (const classifier of classifiers) {
    const result = classifier(entry);
    if (result) return result;
  }
  return { category: CATEGORIES.UNKNOWN, confidence: 10 };
}

/**
 * Classify an array of file entries, returning entries augmented with classification.
 * @param {object[]} entries - Array of file entries from discoverFiles()
 * @returns {{ entry: object, category: string, confidence: number }[]}
 */
export function classifyAll(entries) {
  return entries.map(entry => {
    const { category, confidence } = classifyFile(entry);
    return { ...entry, category, confidence };
  });
}

/**
 * Group classified entries by category.
 * @param {object[]} classifiedEntries
 * @returns {Record<string, object[]>}
 */
export function groupByCategory(classifiedEntries) {
  const groups = {};
  for (const entry of classifiedEntries) {
    const cat = entry.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(entry);
  }
  return groups;
}
