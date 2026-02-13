import { z } from 'zod';

// Helper for loose string fields that might be null/undefined
const optionalString = z.string().nullish().transform(val => val || null);
const optionalNumber = z.number().nullish().transform(val => val || 0);

export const syncSchema = z.object({
  agent_id: z.string().optional(),
  
  connections: z.array(z.object({
    provider: z.string().max(100),
    auth_type: z.string().max(50).default('api_key'),
    plan_name: optionalString,
    status: z.string().max(50).default('active'),
    metadata: z.record(z.any()).nullish(),
  })).optional(),

  memory: z.object({
    health: z.object({
      score: optionalNumber,
      total_files: optionalNumber,
      total_lines: optionalNumber,
      total_size_kb: optionalNumber,
      memory_md_lines: optionalNumber,
      oldest_daily: optionalString,
      newest_daily: optionalString,
      days_with_notes: optionalNumber,
      avg_lines_per_day: optionalNumber,
      duplicates: optionalNumber,
      stale_count: optionalNumber,
    }).optional(),
    entities: z.array(z.object({
      name: z.string().max(255),
      type: z.string().max(50).optional(),
      mentions: optionalNumber,
      mention_count: optionalNumber,
    })).optional(),
    topics: z.array(z.object({
      name: z.string().max(255),
      mentions: optionalNumber,
      mention_count: optionalNumber,
    })).optional(),
  }).optional(),

  goals: z.array(z.object({
    title: z.string().max(500),
    category: optionalString,
    description: optionalString,
    target_date: optionalString,
    progress: optionalNumber.pipe(z.number().min(0).max(100)),
    status: z.string().max(50).default('active'),
  })).optional(),

  learning: z.array(z.object({
    decision: z.string().max(2000),
    context: optionalString,
    reasoning: optionalString,
    outcome: z.string().max(2000).default('pending'),
    confidence: optionalNumber.pipe(z.number().min(0).max(100)),
  })).optional(),

  content: z.array(z.object({
    title: z.string().max(500),
    platform: optionalString,
    status: z.string().max(50).default('draft'),
    url: optionalString,
    body: optionalString,
  })).optional(),

  inspiration: z.array(z.object({
    title: z.string().max(500),
    description: optionalString,
    category: optionalString,
    score: optionalNumber,
    status: z.string().max(50).default('pending'),
    source: optionalString,
  })).optional(),

  context_points: z.array(z.object({
    content: z.string().max(2000),
    category: z.string().max(50).default('general'),
    importance: optionalNumber.pipe(z.number().min(1).max(10).default(5)),
    session_date: optionalString,
  })).optional(),

  context_threads: z.array(z.object({
    name: z.string().max(255),
    summary: optionalString,
  })).optional(),

  handoffs: z.array(z.object({
    session_date: optionalString,
    summary: z.string().max(4000),
    key_decisions: z.any().optional(), // JSON
    open_tasks: z.any().optional(), // JSON
    mood_notes: optionalString,
    next_priorities: z.any().optional(), // JSON
  })).optional(),

  snippets: z.array(z.object({
    name: z.string().max(255),
    description: optionalString,
    code: z.string().max(10000),
    language: optionalString,
    tags: z.any().optional(), // JSON
  })).optional(),

  preferences: z.object({
    observations: z.array(z.object({
      observation: z.string().max(2000),
      category: optionalString,
      importance: optionalNumber,
    })).optional(),
    preferences: z.array(z.object({
      preference: z.string().max(2000),
      category: optionalString,
      confidence: optionalNumber,
    })).optional(),
    moods: z.array(z.object({
      mood: z.string().max(100),
      energy: optionalString,
      notes: optionalString,
    })).optional(),
    approaches: z.array(z.object({
      approach: z.string().max(500),
      context: optionalString,
      success: z.boolean().optional(),
    })).optional(),
  }).optional(),
});
