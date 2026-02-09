'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Zap, Lightbulb, Sparkles, FileText, RotateCw, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

export default function LearningDashboard() {
  const [decisions, setDecisions] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [stats, setStats] = useState({ totalDecisions: 0, totalLessons: 0, successRate: 0, patterns: 0 });
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchData = async () => {
    try {
      const res = await fetch('/api/learning');
      const data = await res.json();
      if (data.decisions && Array.isArray(data.decisions)) setDecisions(data.decisions);
      if (data.lessons && Array.isArray(data.lessons)) setLessons(data.lessons);
      if (data.stats) setStats({
        totalDecisions: data.stats.totalDecisions || 0,
        totalLessons: data.stats.totalLessons || 0,
        successRate: data.stats.successRate || 0,
        patterns: data.stats.patterns || 0
      });
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to fetch learning data:', error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

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
