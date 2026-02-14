'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Zap, Lightbulb, Sparkles, FileText, RotateCw, CheckCircle2, XCircle, AlertTriangle, Clock, Power, BarChart3, TrendingUp } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { useAgentFilter } from '../lib/AgentFilterContext';

export default function LearningDashboard() {
  const { agentId } = useAgentFilter();
  const [decisions, setDecisions] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationMetrics, setRecommendationMetrics] = useState({ metrics: [], summary: {} });
  const [recommendationError, setRecommendationError] = useState('');
  const [updatingRecommendationId, setUpdatingRecommendationId] = useState('');
  const [stats, setStats] = useState({ totalDecisions: 0, totalLessons: 0, successRate: 0, patterns: 0 });
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const learningParams = new URLSearchParams();
      const recommendationParams = new URLSearchParams({ limit: '50', include_inactive: 'true' });
      const metricsParams = new URLSearchParams({ limit: '50', include_inactive: 'true' });
      if (agentId) {
        learningParams.set('agent_id', agentId);
        recommendationParams.set('agent_id', agentId);
        metricsParams.set('agent_id', agentId);
      }

      const learningPath = `/api/learning${learningParams.toString() ? `?${learningParams.toString()}` : ''}`;
      const recommendationPath = `/api/learning/recommendations?${recommendationParams.toString()}`;
      const metricsPath = `/api/learning/recommendations/metrics?${metricsParams.toString()}`;

      const [learningRes, recRes, metricsRes] = await Promise.all([
        fetch(learningPath),
        fetch(recommendationPath),
        fetch(metricsPath),
      ]);
      const [data, recommendationData, metricsData] = await Promise.all([
        learningRes.json(),
        recRes.json(),
        metricsRes.json(),
      ]);

      if (data.decisions && Array.isArray(data.decisions)) setDecisions(data.decisions);
      if (data.lessons && Array.isArray(data.lessons)) setLessons(data.lessons);
      if (data.stats) setStats({
        totalDecisions: data.stats.totalDecisions || 0,
        totalLessons: data.stats.totalLessons || 0,
        successRate: data.stats.successRate || 0,
        patterns: data.stats.patterns || 0
      });

      if (Array.isArray(recommendationData.recommendations)) {
        setRecommendations(recommendationData.recommendations);
      }
      if (Array.isArray(metricsData.metrics)) {
        setRecommendationMetrics({
          metrics: metricsData.metrics,
          summary: metricsData.summary || {},
        });
      } else {
        setRecommendationMetrics({ metrics: [], summary: {} });
      }

      if (!recRes.ok || !metricsRes.ok) {
        setRecommendationError(
          recommendationData.error || metricsData.error || 'Failed to load recommendation telemetry'
        );
      } else {
        setRecommendationError('');
      }
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to fetch learning data:', error);
      setRecommendationError('Failed to load recommendation telemetry');
    }
  }, [agentId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getOutcomeVariant = (outcome) => {
    switch (outcome) {
      case 'success': return 'success';
      case 'failure': return 'error';
      case 'mixed': return 'warning';
      case 'pending': return 'info';
      default: return 'default';
    }
  };

  const getOutcomeIcon = (outcome) => {
    switch (outcome) {
      case 'success': return CheckCircle2;
      case 'failure': return XCircle;
      case 'mixed': return AlertTriangle;
      case 'pending': return Clock;
      default: return Clock;
    }
  };

  const getConfidenceColor = (conf) => {
    const c = conf || 0;
    if (c >= 90) return 'text-green-400';
    if (c >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const parseTags = (tags) => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags === 'string') return tags.split(',').map(t => t.trim()).filter(t => t);
    return [];
  };

  const formatPercent = (value) => `${Math.round((Number(value) || 0) * 100)}%`;

  const handleRecommendationToggle = async (recommendation) => {
    if (!recommendation?.id) return;
    setUpdatingRecommendationId(recommendation.id);
    setRecommendationError('');
    try {
      const res = await fetch(`/api/learning/recommendations/${recommendation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !recommendation.active }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update recommendation state');
      }

      const next = data.recommendation;
      setRecommendations((prev) =>
        prev.map((item) => (item.id === recommendation.id ? { ...item, active: next.active } : item))
      );
      setRecommendationMetrics((prev) => ({
        ...prev,
        metrics: Array.isArray(prev.metrics)
          ? prev.metrics.map((item) =>
              item.recommendation_id === recommendation.id ? { ...item, active: next.active } : item
            )
          : [],
      }));
    } catch (error) {
      setRecommendationError(error.message || 'Failed to update recommendation state');
    } finally {
      setUpdatingRecommendationId('');
    }
  };

  return (
    <PageLayout
      title="Learning Database"
      subtitle={`Decisions, Outcomes & Lessons${lastUpdated ? ` -- Updated ${lastUpdated}` : ''}`}
      breadcrumbs={['Dashboard', 'Learning']}
      actions={
        <button
          onClick={fetchData}
          className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white bg-surface-tertiary border border-[rgba(255,255,255,0.06)] rounded-lg hover:border-[rgba(255,255,255,0.12)] transition-colors duration-150 flex items-center gap-1.5"
        >
          <RotateCw size={14} />
          Refresh
        </button>
      }
    >
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card hover={false}>
          <CardContent className="pt-5 text-center">
            <div className="text-2xl font-semibold tabular-nums text-white">{stats.totalDecisions}</div>
            <div className="text-xs text-zinc-500 mt-1">Decisions Tracked</div>
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-5 text-center">
            <div className="text-2xl font-semibold tabular-nums text-white">{stats.totalLessons}</div>
            <div className="text-xs text-zinc-500 mt-1">Lessons Learned</div>
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-5 text-center">
            <div className="text-2xl font-semibold tabular-nums text-white">{stats.successRate}%</div>
            <div className="text-xs text-zinc-500 mt-1">Success Rate</div>
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-5 text-center">
            <div className="text-2xl font-semibold tabular-nums text-white">{stats.patterns}</div>
            <div className="text-xs text-zinc-500 mt-1">Patterns Found</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Decisions */}
        <Card>
          <CardHeader title="Recent Decisions" icon={Zap} count={decisions.length} />
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {decisions.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="No decisions logged yet"
                  description="Start tracking decisions to build your knowledge base."
                />
              ) : (
                decisions.map((decision) => {
                  const OutcomeIcon = getOutcomeIcon(decision.outcome);
                  return (
                    <div key={decision.id} className="bg-surface-tertiary rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-2">
                          <OutcomeIcon size={16} className="text-zinc-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-sm font-medium text-white">{decision.decision}</div>
                            <div className="text-xs text-zinc-500">{decision.timestamp || decision.date}</div>
                          </div>
                        </div>
                        <Badge variant={getOutcomeVariant(decision.outcome)} size="xs">
                          {decision.outcome || 'pending'}
                        </Badge>
                      </div>

                      {decision.context && (
                        <div className="text-sm text-zinc-400 mb-3 pl-6">{decision.context}</div>
                      )}

                      {parseTags(decision.tags).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3 pl-6">
                          {parseTags(decision.tags).map((tag, index) => (
                            <span key={index} className="px-2 py-0.5 bg-white/5 rounded text-xs text-zinc-400">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lessons */}
        <Card>
          <CardHeader title="Distilled Lessons" icon={Lightbulb} count={lessons.length} />
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {lessons.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="No lessons captured yet"
                  description="Lessons are distilled from your tracked decisions."
                />
              ) : (
                lessons.map((lesson) => (
                  <div key={lesson.id} className="bg-surface-tertiary rounded-lg p-4">
                    <div className="text-sm font-medium text-white mb-2">{lesson.lesson}</div>

                    {lesson.source_decisions && (
                      <div className="text-sm text-zinc-400 mb-3">{lesson.source_decisions}</div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-xs text-zinc-500">Confidence</div>
                          <div className={`text-sm font-semibold tabular-nums ${getConfidenceColor(lesson.confidence)}`}>
                            {lesson.confidence || 0}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-zinc-500">Validated</div>
                          <div className="text-sm font-semibold text-white tabular-nums">{lesson.times_validated || 0}x</div>
                        </div>
                      </div>

                      <div className="w-24">
                        <div className="w-full bg-white/5 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${(lesson.confidence || 0) >= 90 ? 'bg-green-500' : (lesson.confidence || 0) >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${lesson.confidence || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader title="Recommendation Ops" icon={Power} count={recommendations.length} />
          <CardContent>
            {recommendationError ? (
              <div className="mb-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                {recommendationError}
              </div>
            ) : null}
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {recommendations.length === 0 ? (
                <EmptyState
                  icon={Power}
                  title="No recommendations yet"
                  description="Rebuild recommendations after enough scored episodes are available."
                />
              ) : (
                recommendations.map((rec) => (
                  <div key={rec.id} className="bg-surface-tertiary rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-white">
                          {rec.agent_id} - {rec.action_type}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          Confidence {rec.confidence || 0}% | Samples {rec.sample_size || 0}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={rec.active ? 'success' : 'default'} size="xs">
                          {rec.active ? 'active' : 'inactive'}
                        </Badge>
                        <button
                          onClick={() => handleRecommendationToggle(rec)}
                          disabled={updatingRecommendationId === rec.id}
                          className="px-2.5 py-1 text-xs rounded border border-[rgba(255,255,255,0.12)] text-zinc-200 hover:text-white disabled:opacity-50"
                        >
                          {updatingRecommendationId === rec.id
                            ? 'Saving...'
                            : rec.active
                              ? 'Disable'
                              : 'Enable'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Recommendation Metrics" icon={BarChart3} count={recommendationMetrics.metrics?.length || 0} />
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-surface-tertiary rounded-lg p-3">
                <div className="text-xs text-zinc-500">Active</div>
                <div className="text-sm text-white font-semibold">
                  {recommendationMetrics.summary?.active_recommendations || 0}
                </div>
              </div>
              <div className="bg-surface-tertiary rounded-lg p-3">
                <div className="text-xs text-zinc-500">Avg Adoption</div>
                <div className="text-sm text-white font-semibold">
                  {formatPercent(recommendationMetrics.summary?.avg_adoption_rate)}
                </div>
              </div>
              <div className="bg-surface-tertiary rounded-lg p-3">
                <div className="text-xs text-zinc-500">Avg Success Lift</div>
                <div className="text-sm text-white font-semibold">
                  {formatPercent(recommendationMetrics.summary?.avg_success_lift)}
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-[330px] overflow-y-auto">
              {(recommendationMetrics.metrics || []).slice(0, 20).map((metric) => (
                <div key={metric.recommendation_id} className="bg-surface-tertiary rounded-md p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-zinc-300">
                      {metric.agent_id} - {metric.action_type}
                    </div>
                    <Badge variant={metric.active ? 'success' : 'default'} size="xs">
                      {metric.active ? 'active' : 'inactive'}
                    </Badge>
                  </div>
                  <div className="text-xs text-zinc-500 flex items-center gap-1.5">
                    <TrendingUp size={12} />
                    Adoption {formatPercent(metric.telemetry?.adoption_rate)} | Success lift {formatPercent(metric.deltas?.success_lift)}
                  </div>
                </div>
              ))}
              {(recommendationMetrics.metrics || []).length === 0 ? (
                <EmptyState
                  icon={BarChart3}
                  title="No metrics yet"
                  description="Metrics appear after recommendation telemetry and outcomes are recorded."
                />
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader title="Quick Actions" icon={Zap} />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => {
                navigator.clipboard.writeText('cd tools/learning-database && python learner.py patterns');
                alert('Command copied!');
              }}
              className="bg-surface-tertiary rounded-lg p-4 text-left hover:border-[rgba(255,255,255,0.12)] transition-colors duration-150"
            >
              <div className="text-sm font-medium text-purple-400 flex items-center gap-1.5">
                <Sparkles size={14} />
                View Patterns
              </div>
              <div className="text-xs text-zinc-500 mt-1">Analyze decision patterns</div>
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText('cd tools/learning-database && python learner.py log "decision" --context "context"');
                alert('Command copied! Edit and paste.');
              }}
              className="bg-surface-tertiary rounded-lg p-4 text-left hover:border-[rgba(255,255,255,0.12)] transition-colors duration-150"
            >
              <div className="text-sm font-medium text-blue-400 flex items-center gap-1.5">
                <FileText size={14} />
                Log Decision
              </div>
              <div className="text-xs text-zinc-500 mt-1">Record a new decision</div>
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText('cd tools/learning-database && python learner.py lesson "learned X" --confidence 80');
                alert('Command copied! Edit and paste.');
              }}
              className="bg-surface-tertiary rounded-lg p-4 text-left hover:border-[rgba(255,255,255,0.12)] transition-colors duration-150"
            >
              <div className="text-sm font-medium text-yellow-400 flex items-center gap-1.5">
                <Lightbulb size={14} />
                Add Lesson
              </div>
              <div className="text-xs text-zinc-500 mt-1">Capture a new lesson</div>
            </button>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
