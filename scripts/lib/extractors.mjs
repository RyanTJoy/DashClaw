/**
 * Adaptive extractors for classified agent workspace files.
 * Each extractor takes an array of classified file entries and returns
 * data shaped for DashClaw sync categories.
 *
 * All extractors inherit DLP filtering: paths, secrets, and tokens are redacted.
 */

import { readFileSync } from 'fs';
import { basename } from 'path';

// ─── DLP Helpers (mirror bootstrap-agent.mjs patterns) ──────

function isWindowsPathLike(s) {
  if (!s || typeof s !== 'string') return false;
  return /^[a-zA-Z]:\\/.test(s) || s.includes('\\Users\\') || s.includes('\\AppData\\');
}

function isUnixPathLike(s) {
  if (!s || typeof s !== 'string') return false;
  return s.startsWith('/home/') || s.startsWith('/Users/') || s.startsWith('/var/') || s.startsWith('/etc/');
}

function isSecretLike(s) {
  if (!s || typeof s !== 'string') return false;
  const v = s.trim();
  if (v.length < 12) return false;
  if (v.includes('-----BEGIN') && v.includes('PRIVATE KEY')) return true;
  if (/^oc_(live|test)_[a-zA-Z0-9]{12,}/.test(v)) return true;
  if (/^sk_(live|test)_[a-zA-Z0-9]{12,}/.test(v)) return true;
  if (/^ghp_[a-zA-Z0-9]{20,}/.test(v)) return true;
  if (/^xox[baprs]-/.test(v)) return true;
  if (/^AIza[0-9A-Za-z-_]{30,}/.test(v)) return true;
  if (/^AKIA[0-9A-Z]{16}/.test(v)) return true;
  if (/^eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}$/.test(v)) return true;
  return false;
}

function safeText(text) {
  if (!text || typeof text !== 'string') return null;
  if (isWindowsPathLike(text) || isUnixPathLike(text) || isSecretLike(text)) return null;
  return text.trim();
}

function safeRead(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function extractSections(markdown) {
  const sections = [];
  const lines = markdown.split('\n');
  let heading = null;
  let body = [];
  for (const line of lines) {
    const m = line.match(/^#{1,3}\s+(.+)/);
    if (m) {
      if (heading) sections.push([heading, body.join('\n')]);
      heading = m[1].trim();
      body = [];
    } else if (heading) {
      body.push(line);
    }
  }
  if (heading) sections.push([heading, body.join('\n')]);
  return sections;
}

function extractBullets(text) {
  const items = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^[-*]\s+(.+)/);
    if (m) {
      const t = safeText(m[1]);
      if (t && t.length > 3) items.push(t);
    }
  }
  return items;
}

// ─── Identity Extractor ─────────────────────────────────────

/**
 * Extract identity info (values, traits, mission) from identity-classified files.
 * Maps to: preferences (identity-derived) + context_points
 * @param {object[]} files - Classified file entries with category 'identity'
 * @returns {{ preferences: object[], context_points: object[] }}
 */
export function extractIdentity(files) {
  const preferences = [];
  const contextPoints = [];

  for (const file of files) {
    const content = safeRead(file.absolutePath);
    if (!content) continue;

    const sections = extractSections(content);
    for (const [heading, body] of sections) {
      const lower = heading.toLowerCase();
      const trimmed = body.trim();
      if (!trimmed || trimmed.length < 10) continue;

      // Values/traits → preferences
      if (lower.includes('value') || lower.includes('trait') || lower.includes('principle') || lower.includes('belief')) {
        const items = extractBullets(body);
        for (const item of items) {
          preferences.push({ preference: item, category: 'identity', confidence: 80 });
        }
      }

      // Mission/purpose → context_points
      if (lower.includes('mission') || lower.includes('purpose') || lower.includes('core') || lower.includes('identity')) {
        contextPoints.push({
          content: `[Identity:${heading}] ${trimmed.slice(0, 2000)}`,
          category: 'insight',
          importance: 9,
        });
      }
    }

    // If no sections were extracted, treat the whole file as identity context
    if (!sections.length && content.trim().length > 20) {
      contextPoints.push({
        content: `[Identity:${basename(file.filename, '.md')}] ${content.trim().slice(0, 2000)}`,
        category: 'insight',
        importance: 8,
      });
    }
  }

  return { preferences, context_points: contextPoints };
}

// ─── User Profile Extractor ─────────────────────────────────

/**
 * Extract user/operator profile info.
 * Maps to: context_points
 * @param {object[]} files
 * @returns {{ context_points: object[] }}
 */
export function extractUserProfile(files) {
  const contextPoints = [];

  for (const file of files) {
    const content = safeRead(file.absolutePath);
    if (!content) continue;

    const sections = extractSections(content);
    if (sections.length) {
      for (const [heading, body] of sections) {
        const trimmed = body.trim();
        if (trimmed.length > 20 && trimmed.length < 5000) {
          contextPoints.push({
            content: `[User:${heading}] ${trimmed.slice(0, 2000)}`,
            category: 'insight',
            importance: 7,
          });
        }
      }
    } else if (content.trim().length > 20) {
      contextPoints.push({
        content: `[User:${basename(file.filename, '.md')}] ${content.trim().slice(0, 2000)}`,
        category: 'insight',
        importance: 7,
      });
    }
  }

  return { context_points: contextPoints };
}

// ─── Relationships Extractor ────────────────────────────────

/**
 * Extract relationship/people data from .md and .json files.
 * Maps to: relationships (contacts + interaction summaries)
 * @param {object[]} files
 * @returns {{ relationships: object[] }}
 */
export function extractRelationships(files) {
  const relationships = [];

  for (const file of files) {
    const content = safeRead(file.absolutePath);
    if (!content) continue;

    if (file.ext === '.json') {
      try {
        const data = JSON.parse(content);
        const items = Array.isArray(data) ? data : (data.people || data.contacts || data.relationships || []);
        for (const item of items) {
          const name = safeText(item.name || item.title);
          if (!name) continue;
          relationships.push({
            name,
            relationship_type: item.type || item.relationship || item.role || 'contact',
            description: safeText(item.description || item.notes || item.context) || null,
            source_file: file.relativePath,
          });
        }
      } catch {
        // invalid JSON
      }
      continue;
    }

    // Markdown: each heading = a person/entity
    if (file.ext === '.md') {
      const sections = extractSections(content);
      for (const [heading, body] of sections) {
        const name = safeText(heading);
        if (!name || name.length < 2 || name.length > 100) continue;

        // Look for role/type metadata
        const roleMatch = body.match(/^\*\*(?:Role|Type|Relationship):\*\*\s*(.+)$/im);
        const relType = roleMatch ? safeText(roleMatch[1]) || 'contact' : 'contact';

        relationships.push({
          name,
          relationship_type: relType,
          description: safeText(body.trim().slice(0, 500)) || null,
          source_file: file.relativePath,
        });
      }
    }
  }

  return { relationships };
}

// ─── Capabilities Extractor ─────────────────────────────────

/**
 * Extract skills and tools from capability-classified files.
 * Maps to: capabilities (new sync category)
 * @param {object[]} skillFiles - Files classified as capability_skill
 * @param {object[]} toolFiles - Files classified as capability_tool
 * @returns {{ capabilities: object[] }}
 */
export function extractCapabilities(skillFiles, toolFiles) {
  const capabilities = [];
  const seen = new Set();

  // Skills
  for (const file of skillFiles) {
    const content = safeRead(file.absolutePath);
    if (!content) continue;

    const name = basename(file.filename, file.ext);
    const key = `skill:${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Extract description from first paragraph or heading
    const firstPara = content.split('\n\n')[0] || '';
    const desc = safeText(firstPara.replace(/^#.*\n?/, '').trim());

    capabilities.push({
      name,
      capability_type: 'skill',
      description: desc?.slice(0, 500) || null,
      source_path: file.relativePath,
      file_count: 1,
      metadata: null,
    });
  }

  // Group skill files by parent directory to count files per skill
  const skillDirCounts = {};
  for (const file of skillFiles) {
    const dir = file.parentDir;
    skillDirCounts[dir] = (skillDirCounts[dir] || 0) + 1;
  }

  // Update file counts for skills with multi-file directories
  for (const cap of capabilities) {
    const dirCount = skillDirCounts[cap.source_path.split(/[/\\]/)[cap.source_path.split(/[/\\]/).length - 2]];
    if (dirCount && dirCount > 1) cap.file_count = dirCount;
  }

  // Tools: TOOLS*.md root files list multiple tools per doc (extract sections).
  // README.md files inside tool dirs represent a single tool (use parent dir name).
  for (const file of toolFiles) {
    if (capabilities.length >= 500) break;
    const content = safeRead(file.absolutePath);
    if (!content) continue;

    const name = file.filename.toLowerCase();
    const isRootToolDoc = name.startsWith('tools') && name.endsWith('.md');

    if (isRootToolDoc) {
      // Multi-tool doc: each section = a tool
      const sections = extractSections(content);
      for (const [heading, body] of sections) {
        const toolName = safeText(heading);
        if (!toolName || toolName.length < 2) continue;
        const key = `tool:${toolName.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        capabilities.push({
          name: toolName,
          capability_type: 'tool',
          description: safeText(body.trim().slice(0, 500)) || null,
          source_path: file.relativePath,
          file_count: 1,
          metadata: null,
        });
      }
    } else {
      // Single tool: use parent directory name (or filename) as the tool name
      const toolName = file.parentDir !== 'tools' ? file.parentDir : basename(file.filename, file.ext);
      const key = `tool:${toolName.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Extract first paragraph as description
      const firstPara = content.split('\n\n')[0] || '';
      const desc = safeText(firstPara.replace(/^#.*\n?/, '').trim());

      capabilities.push({
        name: toolName,
        capability_type: 'tool',
        description: desc?.slice(0, 500) || null,
        source_path: file.relativePath,
        file_count: 1,
        metadata: null,
      });
    }
  }

  return { capabilities };
}

// ─── Operational Config Extractor ───────────────────────────

/**
 * Extract security policies, guardrails, operational config.
 * Maps to: context_points + preferences
 * @param {object[]} files
 * @returns {{ context_points: object[], preferences: object[] }}
 */
export function extractOperationalConfig(files) {
  const contextPoints = [];
  const preferences = [];

  for (const file of files) {
    const content = safeRead(file.absolutePath);
    if (!content) continue;

    const sections = extractSections(content);
    for (const [heading, body] of sections) {
      const trimmed = body.trim();
      if (!trimmed || trimmed.length < 15) continue;

      contextPoints.push({
        content: `[Ops:${heading}] ${trimmed.slice(0, 2000)}`,
        category: 'insight',
        importance: 8,
      });

      // Extract bullet items as operational preferences (capped)
      if (preferences.length < 100) {
        const items = extractBullets(body);
        for (const item of items) {
          if (item.length > 10 && preferences.length < 100) {
            preferences.push({ preference: item, category: 'operational', confidence: 75 });
          }
        }
      }
    }
  }

  return { context_points: contextPoints, preferences };
}

// ─── Projects Extractor ─────────────────────────────────────

/**
 * Extract project info from project-classified files.
 * Maps to: goals
 * @param {object[]} files
 * @returns {{ goals: object[] }}
 */
export function extractProjects(files, { maxGoals = 500 } = {}) {
  const goals = [];
  const seen = new Set();

  for (const file of files) {
    if (goals.length >= maxGoals) break;
    const content = safeRead(file.absolutePath);
    if (!content) continue;

    if (file.ext === '.json') {
      try {
        const data = JSON.parse(content);
        const items = Array.isArray(data) ? data : (data.projects || []);
        for (const item of items) {
          const title = safeText(item.name || item.title);
          if (!title || seen.has(title.toLowerCase())) continue;
          seen.add(title.toLowerCase());
          goals.push({
            title,
            status: normalizeStatus(item.status),
            category: 'project',
            description: safeText(item.description || item.goal) || `From ${file.relativePath}`,
            progress: item.progress || 0,
          });
        }
      } catch {
        // invalid JSON
      }
      continue;
    }

    // Markdown project files
    const sections = extractSections(content);
    for (const [heading, body] of sections) {
      const title = safeText(heading);
      if (!title || title.length < 3 || seen.has(title.toLowerCase())) continue;

      const statusLine = (body.match(/^\*\*Status:\*\*\s*(.+)$/m)?.[1] || '').trim();
      const goalLine = (body.match(/^\*\*Goal:\*\*\s*(.+)$/m)?.[1] || '').trim();

      const projectTitle = goalLine || title;
      if (seen.has(projectTitle.toLowerCase())) continue;
      seen.add(projectTitle.toLowerCase());

      goals.push({
        title: projectTitle,
        status: normalizeStatus(statusLine),
        category: 'project',
        description: `Project: ${title}${statusLine ? ` | Status: ${statusLine}` : ''} (from ${file.relativePath})`,
        progress: 0,
      });

      // Extract checkbox tasks within project
      for (const line of body.split('\n')) {
        const unchecked = line.match(/^[-*]\s+\[\s\]\s+(.+)/);
        if (unchecked) {
          const t = safeText(unchecked[1]);
          if (t && !seen.has(t.toLowerCase())) {
            seen.add(t.toLowerCase());
            goals.push({ title: t, status: 'active', category: 'task', description: `From ${file.relativePath} (${title})` });
          }
        }
        const checked = line.match(/^[-*]\s+\[x\]\s+(.+)/i);
        if (checked) {
          const t = safeText(checked[1]);
          if (t && !seen.has(t.toLowerCase())) {
            seen.add(t.toLowerCase());
            goals.push({ title: t, status: 'completed', progress: 100, category: 'task', description: `From ${file.relativePath} (${title})` });
          }
        }
      }
    }
  }

  return { goals };
}

// ─── Creative Works Extractor ───────────────────────────────

/**
 * Extract creative works as content items.
 * Maps to: content
 * @param {object[]} files
 * @returns {{ content: object[] }}
 */
export function extractCreativeWorks(files) {
  const content = [];

  for (const file of files) {
    const text = safeRead(file.absolutePath);
    if (!text || text.trim().length < 20) continue;

    const name = basename(file.filename, file.ext);
    content.push({
      title: name,
      platform: null,
      status: 'published',
      body: text.trim().slice(0, 5000),
    });

    if (content.length >= 200) break;
  }

  return { content };
}

// ─── Helpers ────────────────────────────────────────────────

function normalizeStatus(raw) {
  if (!raw) return 'active';
  const s = raw.toLowerCase();
  if (s.includes('complete') || s.includes('done') || s.includes('finished')) return 'completed';
  if (s.includes('paused') || s.includes('hold') || s.includes('blocked')) return 'paused';
  if (s.includes('cancel') || s.includes('dropped')) return 'cancelled';
  return 'active';
}
