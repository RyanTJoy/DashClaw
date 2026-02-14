import { buildRecommendationsFromEpisodes, scoreActionEpisode } from './learning-loop.js';
import {
  clearLearningRecommendations,
  getActionEpisodeSource,
  listLearningEpisodes,
  upsertLearningEpisode,
  upsertLearningRecommendations,
} from './repositories/learningLoop.repository.js';

export async function scoreAndStoreActionEpisode(sql, orgId, actionId) {
  if (!actionId) return null;
  const source = await getActionEpisodeSource(sql, orgId, actionId);
  if (!source) return null;

  const scored = scoreActionEpisode(source);
  return upsertLearningEpisode(sql, orgId, source, scored);
}

export async function rebuildLearningRecommendations(sql, orgId, options = {}) {
  const { agentId, actionType, lookbackDays = 30, episodeLimit = 5000, minSamples = 5 } = options;

  const episodes = await listLearningEpisodes(sql, orgId, {
    agentId,
    actionType,
    lookbackDays,
    limit: episodeLimit,
  });
  const recommendations = buildRecommendationsFromEpisodes(episodes, { minSamples });

  await clearLearningRecommendations(sql, orgId, { agentId, actionType });
  const saved = await upsertLearningRecommendations(sql, orgId, recommendations);

  return {
    episodes_scanned: episodes.length,
    recommendations: saved,
  };
}

