'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity, ShieldAlert, ShieldCheck, CircleDot, DollarSign,
  ArrowRight, TrendingUp, TrendingDown, Users, Clock, Radar,
} from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ListSkeleton } from '../components/ui/Skeleton';
import { useAgentFilter } from '../lib/AgentFilterContext';
import ActivityTimeline from '../components/ActivityTimeline';

function computeSystemState(redCount, amberCount) {
  if (redCount >= 2) return { label: 'ALERT', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', pulse: true };
  if (redCount === 1) return { label: 'ELEVATED', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', pulse: false };
  if (amberCount >= 3) return { label: 'DRIFTING', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', pulse: false };
  if (amberCount > 0) return { label: 'MONITORING', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', pulse: false };
  return { label: 'STABLE', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', pulse: false };
}

function formatRelativeTime(ts) {
  if (!ts) return '—';
  const diffMs = Date.now() - new Date(ts).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function formatCost(cost) {
  if (!cost || cost === 0) return '$0.00';
  if (cost < 0.01) return '<$0.01';
  return `$${cost.toFixed(2)}`;
}

export default function MissionControlPage() {
  const { agentId, agents } = useAgentFilter();
  const [signals, setSignals] = useState(null);
  const [loops, setLoops] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const agentParam = agentId ? `agent_id=${encodeURIComponent(agentId)}` : '';

    try {
      const [signalsRes, loopsRes, tokensRes, healthRes] = await Promise.all([
        fetch(`/api/actions/signals${agentParam ? `?${agentParam}` : ''}`),
        fetch(`/api/actions/loops?status=open&limit=5${agentParam ? `&${agentParam}` : ''}`),
        fetch(`/api/tokens${agentParam ? `?${agentParam}` : ''}`),
        fetch('/api/health'),
      ]);

      if (signalsRes.ok) setSignals(await signalsRes.json());
      if (loopsRes.ok) setLoops(await loopsRes.json());
      if (tokensRes.ok) setTokens(await tokensRes.json());
      if (healthRes.ok) setHealth(await healthRes.json());
    } catch (error) {
      console.error('Mission Control fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    setLoading(true);
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Derived: signals
  const signalCounts = signals?.counts || { red: 0, amber: 0, total: 0 };
  const systemState = computeSystemState(signalCounts.red, signalCounts.amber);

  // Derived: loops
  const loopList = loops?.loops || [];
  const openLoopCount = loops?.total || loopList.length;
  const criticalLoops = loopList.filter(l => l.priority === 'critical').length;
  const highLoops = loopList.filter(l => l.priority === 'high').length;

  // Derived: cost
  const todayCost = tokens?.today?.estimatedCost || 0;
  const history = tokens?.history || [];
  let projectedCost = null;
  let trendDirection = null;

  if (history.length >= 1) {
    const costs = history.map(d => d.estimatedCost || 0).filter(c => c > 0);
    if (costs.length > 0) {
      const avgDailyCost = costs.reduce((a, b) => a + b, 0) / costs.length;
      const now = new Date();
      const hoursElapsed = now.getHours() + now.getMinutes() / 60;
      const todayExtrapolated = hoursElapsed > 1 ? (todayCost / hoursElapsed) * 24 : avgDailyCost;
      projectedCost = hoursElapsed > 1
        ? todayExtrapolated * 0.6 + avgDailyCost * 0.4
        : avgDailyCost;
      trendDirection = todayCost > avgDailyCost * 1.1 ? 'up' : todayCost < avgDailyCost * 0.9 ? 'down' : null;
    }
  }

  // Derived: health
  const healthStatus = health?.status || 'unknown';
  const healthColor = healthStatus === 'healthy' ? 'text-emerald-400' : healthStatus === 'degraded' ? 'text-amber-400' : 'text-zinc-500';
  const healthDot = healthStatus === 'healthy' ? 'bg-emerald-500' : healthStatus === 'degraded' ? 'bg-amber-500' : 'bg-zinc-500';

  // Derived: last activity
  const lastActivity = loopList[0]?.created_at || null;

  // Fleet
  const fleetCount = agents.length;

  const actionButton = (
    <Link
      href="/dashboard"
      className="text-sm px-4 py-2 bg-brand/10 text-brand border border-brand/20 rounded-lg hover:bg-brand/20 transition-colors inline-flex items-center gap-1.5"
    >
      Operations View <ArrowRight size={14} />
    </Link>
  );

  return (
    <PageLayout
      title="Mission Control"
      subtitle="Strategic overview of your agent fleet"
      breadcrumbs={['Mission Control']}
      actions={actionButton}
    >
      {/* ── Section A: Command Strip ── */}
      <div className="bg-surface-tertiary rounded-xl border border-border px-5 py-3 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* System State */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${systemState.bg} border ${systemState.border}`}>
              <Activity size={11} className={`${systemState.color} ${systemState.pulse ? 'animate-pulse' : ''}`} />
              <span className={`text-xs font-semibold tracking-wider ${systemState.color}`}>
                {loading ? '...' : systemState.label}
              </span>
            </div>
          </div>

          {/* Fleet Size */}
          <div className="flex items-center gap-2">
            <Users size={14} className="text-zinc-500" />
            <span className="text-sm font-medium text-white tabular-nums">{fleetCount}</span>
            <span className="text-xs text-zinc-500">agents</span>
          </div>

          {/* System Health */}
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${healthDot}`} />
            <span className={`text-sm font-medium ${healthColor}`}>
              {loading ? '...' : healthStatus === 'healthy' ? 'Healthy' : healthStatus === 'degraded' ? 'Degraded' : 'Unknown'}
            </span>
          </div>

          {/* Last Activity */}
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-zinc-500" />
            <span className="text-sm text-zinc-400">{loading ? '...' : formatRelativeTime(lastActivity)}</span>
          </div>
        </div>
      </div>

      {/* ── Section B & C: Middle Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

        {/* Card 1: Risk Signals */}
        <Card>
          <CardHeader title="Risk Signals" icon={ShieldAlert}>
            <Link href="/security" className="text-[10px] text-brand hover:text-brand-hover transition-colors inline-flex items-center gap-0.5">
              View all <ArrowRight size={10} />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? <ListSkeleton rows={2} /> : (
              <div>
                <div className="text-3xl font-bold tabular-nums text-white mb-2">
                  {signalCounts.total}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {signalCounts.red > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span className="text-red-400 font-medium">{signalCounts.red} critical</span>
                    </span>
                  )}
                  {signalCounts.amber > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span className="text-amber-400 font-medium">{signalCounts.amber} amber</span>
                    </span>
                  )}
                  {signalCounts.red === 0 && signalCounts.amber === 0 && (
                    <span className="flex items-center gap-1">
                      <ShieldCheck size={12} className="text-emerald-500" />
                      <span className="text-emerald-400">All clear</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Open Loops */}
        <Card>
          <CardHeader title="Open Loops" icon={CircleDot}>
            <Link href="/dashboard" className="text-[10px] text-brand hover:text-brand-hover transition-colors inline-flex items-center gap-0.5">
              View all <ArrowRight size={10} />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? <ListSkeleton rows={3} /> : (
              <div>
                <div className="text-3xl font-bold tabular-nums text-white mb-2">
                  {openLoopCount}
                </div>
                <div className="flex items-center gap-3 text-xs mb-3">
                  {criticalLoops > 0 && (
                    <span className="text-red-400 font-medium">{criticalLoops} critical</span>
                  )}
                  {highLoops > 0 && (
                    <span className="text-amber-400 font-medium">{highLoops} high</span>
                  )}
                  {criticalLoops === 0 && highLoops === 0 && openLoopCount > 0 && (
                    <span className="text-zinc-500">No critical/high</span>
                  )}
                </div>
                {loopList.slice(0, 3).map(loop => (
                  <div key={loop.loop_id} className="text-xs text-zinc-400 truncate mb-1">
                    {loop.description || loop.loop_type || 'Unnamed loop'}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Cost Velocity */}
        <Card>
          <CardHeader title="Cost Velocity" icon={DollarSign}>
            <Link href="/usage" className="text-[10px] text-brand hover:text-brand-hover transition-colors inline-flex items-center gap-0.5">
              Details <ArrowRight size={10} />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? <ListSkeleton rows={2} /> : (
              <div>
                <div className="text-3xl font-bold tabular-nums text-white mb-1">
                  {formatCost(todayCost)}
                </div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">Today&#39;s spend</div>
                {projectedCost !== null && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">24h projection</span>
                    <span className="text-zinc-300 font-medium tabular-nums">{formatCost(projectedCost)}</span>
                  </div>
                )}
                {trendDirection && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                    {trendDirection === 'up' ? (
                      <TrendingUp size={12} className="text-amber-400" />
                    ) : (
                      <TrendingDown size={12} className="text-emerald-400" />
                    )}
                    <span className={trendDirection === 'up' ? 'text-amber-400' : 'text-emerald-400'}>
                      vs 7-day avg
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 4: Agent Fleet Status */}
        <Card>
          <CardHeader title="Fleet Status" icon={Users}>
            <Link href="/swarm" className="text-[10px] text-brand hover:text-brand-hover transition-colors inline-flex items-center gap-0.5">
              Manage <ArrowRight size={10} />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? <ListSkeleton rows={4} /> : agents.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No agents registered"
                description="Register an agent via the SDK to see fleet status"
              />
            ) : (
              <div className="max-h-[200px] overflow-y-auto space-y-1.5 -mr-1 pr-1">
                {agents.slice(0, 8).map(agent => (
                  <div key={agent.agent_id} className="flex items-center gap-2 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span className="text-xs text-zinc-300 truncate flex-1">{agent.name || agent.agent_id}</span>
                    <span className="text-[10px] text-zinc-600 tabular-nums flex-shrink-0">
                      {formatRelativeTime(agent.last_heartbeat || agent.created_at)}
                    </span>
                  </div>
                ))}
                {agents.length > 8 && (
                  <div className="text-[10px] text-zinc-600 pt-1">
                    +{agents.length - 8} more
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Section D: Live Activity Feed ── */}
      <ActivityTimeline />
    </PageLayout>
  );
}
