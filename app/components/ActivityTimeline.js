'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock, Play, CheckCircle2, XCircle, AlertTriangle,
  CircleDot, Brain, ArrowRight, Shield, Loader2, Target,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { CardSkeleton } from './ui/Skeleton';
import { useAgentFilter } from '../lib/AgentFilterContext';
import { useRealtime } from '../hooks/useRealtime';
import { useTileSize, fitItems } from '../hooks/useTileSize';

function getEventIcon(event) {
  switch (event.category) {
    case 'action':
      if (event.status === 'completed') return <CheckCircle2 size={14} className="text-emerald-400" />;
      if (event.status === 'failed') return <XCircle size={14} className="text-red-400" />;
      if (event.status === 'running') return <Loader2 size={14} className="text-blue-400 animate-spin" />;
      return <Play size={14} className="text-zinc-400" />;
    case 'loop':
      if (event.status === 'resolved') return <CheckCircle2 size={14} className="text-emerald-400" />;
      return <CircleDot size={14} className="text-amber-400" />;
    case 'goal':
      if (event.status === 'completed') return <CheckCircle2 size={14} className="text-emerald-400" />;
      return <Target size={14} className="text-emerald-400" />;
    case 'learning':
      return <Brain size={14} className="text-purple-400" />;
    case 'signal':
      return <Shield size={14} className="text-red-400" />;
    default:
      return <Clock size={14} className="text-zinc-400" />;
  }
}

function getCategoryLabel(category) {
  switch (category) {
    case 'action': return 'Decision';
    case 'loop': return 'Open Loop';
    case 'goal': return 'Goal';
    case 'learning': return 'Lesson';
    case 'signal': return 'Integrity Signal';
    default: return 'Event';
  }
}

function getCategoryColor(category) {
  switch (category) {
    case 'action': return 'text-blue-400';
    case 'loop': return 'text-amber-400';
    case 'goal': return 'text-emerald-400';
    case 'learning': return 'text-purple-400';
    case 'signal': return 'text-red-400';
    default: return 'text-zinc-400';
  }
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function groupByDay(events) {
  const groups = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const event of events) {
    const dateStr = new Date(event.timestamp).toDateString();
    let label;
    if (dateStr === today) label = 'Today';
    else if (dateStr === yesterday) label = 'Yesterday';
    else label = new Date(event.timestamp).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    if (!groups[label]) groups[label] = [];
    groups[label].push(event);
  }
  return Object.entries(groups);
}

export default function ActivityTimeline() {
  const { agentId } = useAgentFilter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { ref: sizeRef, height: tileHeight } = useTileSize();

  const fetchAll = useCallback(async () => {
    try {
      const agentParam = agentId ? `&agent_id=${encodeURIComponent(agentId)}` : '';
      const [actionsRes, loopsRes, learningRes] = await Promise.all([
        fetch(`/api/actions?limit=20${agentParam}`),
        fetch(`/api/actions/loops?limit=15${agentParam}`),
        fetch(`/api/learning?${agentId ? `agent_id=${encodeURIComponent(agentId)}` : ''}`),
      ]);

      const merged = [];

      if (actionsRes.ok) {
        const actionsData = await actionsRes.json();
        for (const a of (actionsData.actions || [])) {
          merged.push({
            id: a.action_id,
            category: 'action',
            title: a.action_type || 'Action',
            detail: a.declared_goal || '',
            agentId: a.agent_id,
            agentName: a.agent_name,
            status: a.status === 'in-progress' ? 'running' : a.status,
            riskScore: a.risk_score,
            timestamp: a.timestamp_start || a.timestamp_end,
          });
        }
      }

      if (loopsRes.ok) {
        const loopsData = await loopsRes.json();
        for (const l of (loopsData.loops || [])) {
          merged.push({
            id: l.loop_id,
            category: 'loop',
            title: l.loop_type || 'Open Loop',
            detail: l.description || '',
            agentId: l.agent_id,
            agentName: l.agent_name,
            status: l.status,
            priority: l.priority,
            timestamp: l.created_at,
          });
        }
      }

      if (learningRes.ok) {
        const learningData = await learningRes.json();
        for (const l of (learningData.lessons || [])) {
          merged.push({
            id: `learn-${Math.random().toString(36).slice(2, 8)}`,
            category: 'learning',
            title: 'Lesson Learned',
            detail: l.lesson || l.text || '',
            timestamp: l.created_at || l.timestamp || new Date().toISOString(),
          });
        }
      }

      // Sort by timestamp descending
      merged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setEvents(merged.slice(0, 30));
    } catch (error) {
      console.error('Timeline fetch error:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    setLoading(true);
    fetchAll();
  }, [fetchAll]);

  // Real-time updates
  useRealtime(useCallback((event, payload) => {
    if (event === 'action.created') {
      const a = payload;
      if (agentId && a.agent_id !== agentId) return;
      setEvents(prev => [{
        id: a.action_id,
        category: 'action',
        title: a.action_type || 'Action',
        detail: a.declared_goal || '',
        agentId: a.agent_id,
        agentName: a.agent_name,
        status: a.status === 'running' ? 'running' : a.status,
        timestamp: a.timestamp_start || new Date().toISOString(),
      }, ...prev].slice(0, 30));
    } else if (event === 'action.updated') {
      const a = payload;
      setEvents(prev => prev.map(e => {
        if (e.id === a.action_id) {
          return {
            ...e,
            status: a.status === 'running' ? 'running' : a.status,
            timestamp: a.timestamp_end || e.timestamp,
          };
        }
        return e;
      }));
    } else if (event === 'decision.created') {
      const d = payload;
      if (agentId && d.agent_id !== agentId) return;
      setEvents(prev => [{
        id: `learn-${d.id || Math.random().toString(36).slice(2, 8)}`,
        category: 'learning',
        title: 'Lesson Learned',
        detail: d.decision || '',
        timestamp: d.timestamp || new Date().toISOString(),
      }, ...prev].slice(0, 30));
    } else if (event === 'loop.created') {
      const l = payload;
      if (agentId && l.agent_id !== agentId) return;
      setEvents(prev => [{
        id: l.loop_id,
        category: 'loop',
        title: l.loop_type || 'Open Loop',
        detail: l.description || '',
        agentId: l.agent_id,
        agentName: l.agent_name,
        status: l.status,
        priority: l.priority,
        timestamp: l.created_at || new Date().toISOString(),
      }, ...prev].slice(0, 30));
    } else if (event === 'loop.updated') {
      const l = payload;
      setEvents(prev => prev.map(e => {
        if (e.id === l.loop_id) {
          return {
            ...e,
            status: l.status,
            timestamp: l.resolved_at || e.timestamp,
          };
        }
        return e;
      }));
    } else if (event === 'goal.created') {
      const g = payload;
      if (agentId && g.agent_id !== agentId) return;
      setEvents(prev => [{
        id: g.id,
        category: 'goal',
        title: 'New Goal',
        detail: g.title || '',
        agentId: g.agent_id,
        status: g.status,
        timestamp: g.created_at || new Date().toISOString(),
      }, ...prev].slice(0, 30));
    } else if (event === 'goal.updated') {
      const g = payload;
      setEvents(prev => prev.map(e => {
        if (e.id === g.id) {
          return {
            ...e,
            status: g.status,
            detail: `${g.title} (${g.progress}%)`,
          };
        }
        return e;
      }));
    } else if (event === 'guard.decision.created') {
      const g = payload;
      if (agentId && g.agent_id !== agentId) return;
      setEvents(prev => [{
        id: g.id,
        category: 'signal',
        title: 'Guard Decision',
        detail: `${g.decision.toUpperCase()}: ${g.reason || 'Evaluated action'}`,
        agentId: g.agent_id,
        status: g.decision,
        timestamp: g.created_at,
      }, ...prev].slice(0, 30));
    } else if (event === 'signal.detected') {
      const s = payload;
      if (agentId && s.agent_id !== agentId) return;
      setEvents(prev => [{
        id: `sig-${Date.now()}`,
        category: 'signal',
        title: s.label || 'Risk Signal',
        detail: s.detail || '',
        agentId: s.agent_id,
        timestamp: new Date().toISOString(),
      }, ...prev].slice(0, 30));
    }
  }, [agentId]));

  if (loading) return <CardSkeleton />;

  const ITEM_H = 44;
  const DAY_HEADER_H = 28;
  const maxVisibleEvents = tileHeight > 0 ? fitItems(tileHeight, ITEM_H, DAY_HEADER_H) : 8;
  const visibleEvents = events.slice(0, maxVisibleEvents);
  const eventOverflow = events.length - visibleEvents.length;
  const grouped = groupByDay(visibleEvents);

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardHeader title="Decision Timeline" icon={Clock}>
        <Badge variant="default" size="sm">{events.length} events</Badge>
      </CardHeader>

      <CardContent>
        <div ref={sizeRef} className="flex flex-col h-full min-h-0">
        {events.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No activity yet"
            description="Decisions, open loops, and learning events will appear here chronologically"
          />
        ) : (<>
          <div className="flex-1 min-h-0">
            {grouped.map(([dayLabel, dayEvents]) => (
              <div key={dayLabel} className="mb-4 last:mb-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-2 bg-surface-secondary py-1 z-[1]">
                  {dayLabel}
                </div>
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[7px] top-3 bottom-3 w-px bg-[rgba(255,255,255,0.06)]" />

                  <div className="space-y-1">
                    {dayEvents.map((event) => {
                      const isClickable = event.category === 'action' || event.category === 'loop';
                      const href = event.category === 'action' ? `/actions/${event.id}` : (event.category === 'loop' ? `/actions/${event.actionId || ''}` : null);
                      
                      const content = (
                        <div className={`flex items-start gap-3 pl-0 py-1.5 group ${isClickable ? 'cursor-pointer' : ''}`}>
                          {/* Icon dot on timeline */}
                          <div className="relative z-[1] mt-0.5 flex-shrink-0">
                            {getEventIcon(event)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-medium uppercase tracking-wider ${getCategoryColor(event.category)}`}>
                                {getCategoryLabel(event.category)}
                              </span>
                              <span className="text-xs font-medium text-white truncate">{event.title}</span>
                              {event.agentName && (
                                <span className="text-[10px] text-zinc-600 font-mono">{event.agentName}</span>
                              )}
                              {event.riskScore != null && event.riskScore >= 70 && (
                                <span className="flex items-center gap-0.5 text-[10px] text-red-400">
                                  <AlertTriangle size={9} /> {event.riskScore}
                                </span>
                              )}
                              {event.priority === 'critical' && (
                                <Badge variant="error" size="sm">Critical</Badge>
                              )}
                            </div>
                            {event.detail && (
                              <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-md">{event.detail}</p>
                            )}
                          </div>

                          {/* Timestamp */}
                          <span className="text-[10px] text-zinc-600 whitespace-nowrap flex-shrink-0 mt-0.5 tabular-nums">
                            {formatTimestamp(event.timestamp)}
                          </span>
                        </div>
                      );

                      if (isClickable && href) {
                        return (
                          <Link key={event.id} href={href} className="block hover:bg-white/[0.02] rounded-md transition-colors px-1 -mx-1">
                            {content}
                          </Link>
                        );
                      }

                      return <div key={event.id}>{content}</div>;
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>)}
        </div>
      </CardContent>
    </Card>
  );
}
