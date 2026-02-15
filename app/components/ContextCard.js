'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Zap, Lightbulb, Heart, BarChart3, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { ProgressBar } from './ui/ProgressBar';
import { StatCompact } from './ui/Stat';
import { EmptyState } from './ui/EmptyState';
import { CardSkeleton } from './ui/Skeleton';
import { useAgentFilter } from '../lib/AgentFilterContext';

export default function ContextCard() {
  const [contextData, setContextData] = useState({
    todayPoints: 0,
    recentPoints: [],
    stats: {}
  });
  const [loading, setLoading] = useState(true);
  const { agentId } = useAgentFilter();

  useEffect(() => {
    async function fetchContext() {
      try {
        const res = await fetch(`/api/learning${agentId ? `?agent_id=${agentId}` : ''}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();

        const decisions = (data.decisions || []).slice(0, 6);
        const stats = data.stats || {};

        const points = decisions.map(d => ({
          id: d.id,
          text: d.decision,
          category: mapOutcomeToCategory(d.outcome),
          importance: d.context ? Math.min(10, Math.max(3, Math.ceil(d.decision.length / 30))) : 5,
          timestamp: formatTimestamp(d.timestamp)
        }));

        setContextData({
          todayPoints: points.length,
          recentPoints: points,
          stats
        });
      } catch (error) {
        console.error('Failed to fetch context:', error);
        setContextData({ todayPoints: 0, recentPoints: [], stats: {} });
      } finally {
        setLoading(false);
      }
    }
    fetchContext();
  }, [agentId]);

  const mapOutcomeToCategory = (outcome) => {
    if (outcome === 'success') return 'decision';
    if (outcome === 'pending') return 'status';
    if (outcome === 'failure' || outcome === 'failed') return 'insight';
    return 'status';
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '--';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York' }) + ' EST';
    } catch { return ts; }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'decision': return Zap;
      case 'insight': return Lightbulb;
      case 'preference': return Heart;
      case 'status': return BarChart3;
      default: return FileText;
    }
  };

  const getCategoryVariant = (category) => {
    switch (category) {
      case 'decision': return 'error';
      case 'insight': return 'warning';
      case 'preference': return 'brand';
      case 'status': return 'info';
      default: return 'default';
    }
  };

  if (loading) {
    return <CardSkeleton />;
  }

  const viewAllLink = (
    <Link href="/learning" className="text-xs text-brand hover:text-brand-hover transition-colors inline-flex items-center gap-1">
      View all <ArrowRight size={12} />
    </Link>
  );

  return (
    <Card className="h-full">
      <CardHeader title="Context" icon={FileText} action={viewAllLink}>
        <Badge variant="success" size="sm">{contextData.todayPoints} decisions</Badge>
        {contextData.stats.totalLessons > 0 && (
          <Badge variant="info" size="sm">{contextData.stats.totalLessons} lessons</Badge>
        )}
      </CardHeader>
      <CardContent>
        {contextData.recentPoints.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No learning data yet"
            description="Record decisions via the SDK's recordDecision() or POST /api/learning"
          />
        ) : (
          <div className="space-y-4">
            {/* Stats Row */}
            {contextData.stats.successRate !== undefined && (
              <div className="grid grid-cols-3 gap-2 bg-surface-tertiary rounded-lg p-3">
                <StatCompact label="Success" value={`${contextData.stats.successRate}%`} color="text-green-400" />
                <StatCompact label="Decisions" value={contextData.stats.totalDecisions || 0} />
                <StatCompact label="Patterns" value={contextData.stats.patterns || 0} color="text-purple-400" />
              </div>
            )}

            {/* Recent Decisions */}
            <div>
              <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Recent Decisions</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {contextData.recentPoints.map((point) => {
                  const IconComponent = getCategoryIcon(point.category);
                  return (
                    <div key={point.id} className="bg-surface-tertiary rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <IconComponent size={14} className="text-zinc-400" />
                          <Badge variant={getCategoryVariant(point.category)} size="xs">
                            {point.category}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-zinc-500">{point.timestamp}</span>
                      </div>

                      <div className="text-sm text-zinc-200 mb-2">{point.text}</div>

                      <ProgressBar value={point.importance * 10} color="brand" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
