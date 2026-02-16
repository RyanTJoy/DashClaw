'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Gauge, Clock, CalendarDays, BookOpen, Cpu, ArrowRight, Users } from 'lucide-react';
import { Card, CardHeader, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { StatCompact } from './ui/Stat';
import { ProgressBar } from './ui/ProgressBar';
import { CardSkeleton } from './ui/Skeleton';
import { EmptyState } from './ui/EmptyState';
import { useAgentFilter } from '../lib/AgentFilterContext';

export default function TokenBudgetCard() {
  const { agentId } = useAgentFilter();
  const [data, setData] = useState({
    hourUsed: 0,
    weekUsed: 0,
    hourRemaining: 100,
    weekRemaining: 100,
    contextUsed: 0,
    contextMax: 200000,
    contextPct: 0,
    model: 'loading...',
    status: 'loading',
    todayTokens: 0,
    todayCost: 0,
    compactions: 0
  });
  const [agentContexts, setAgentContexts] = useState([]);
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const url = agentId ? `/api/tokens?agent_id=${encodeURIComponent(agentId)}` : '/api/tokens';
      const res = await fetch(url);
      const json = await res.json();

      // Store per-agent contexts for All Agents view
      setAgentContexts(json.agentContexts || []);

      if (json.current) {
        const current = json.current;
        const today = json.today;

        let status = 'ok';
        if (current.hourlyPctLeft < 10 || current.weeklyPctLeft < 10) status = 'critical';
        else if (current.hourlyPctLeft < 30 || current.weeklyPctLeft < 30) status = 'warning';

        setData({
          hourUsed: current.hourlyUsed || 0,
          weekUsed: current.weeklyUsed || 0,
          hourRemaining: current.hourlyPctLeft || 100,
          weekRemaining: current.weeklyPctLeft || 100,
          contextUsed: current.contextUsed || 0,
          contextMax: current.contextMax || 200000,
          contextPct: current.contextPct || 0,
          model: current.model || 'unknown',
          compactions: current.compactions || 0,
          todayTokens: today?.totalTokens || 0,
          todayCost: today?.estimatedCost || 0,
          status
        });
        setLastUpdated(new Date(current.updatedAt || Date.now()).toLocaleTimeString());
      } else {
        setData(prev => ({ ...prev, status: 'no-data' }));
        setLastUpdated('No data yet');
      }
    } catch (error) {
      console.error('Failed to fetch token data:', error);
      setData(prev => ({ ...prev, status: 'error' }));
    }
  }, [agentId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'critical': return <Badge variant="error" size="sm">Low Capacity</Badge>;
      case 'warning': return <Badge variant="warning" size="sm">Moderate</Badge>;
      case 'error': return <Badge variant="default" size="sm">Error</Badge>;
      case 'no-data': return <Badge variant="default" size="sm">Awaiting Data</Badge>;
      default: return <Badge variant="success" size="sm">Good</Badge>;
    }
  };

  const formatCost = (cost) => {
    if (cost < 0.01) return '<$0.01';
    return `$${cost.toFixed(2)}`;
  };

  const getBarColor = (pctRemaining) => {
    if (pctRemaining < 20) return 'error';
    if (pctRemaining < 40) return 'warning';
    return 'success';
  };

  const getContextBarColor = (pct) => {
    if (pct > 80) return 'error';
    if (pct > 60) return 'warning';
    return 'purple';
  };

  if (data.status === 'loading') {
    return <CardSkeleton />;
  }

  const viewAllLink = (
    <Link href="/usage" className="text-xs text-brand hover:text-brand-hover transition-colors inline-flex items-center gap-1">
      View all <ArrowRight size={12} />
    </Link>
  );

  // All Agents view with no data at all
  const isAllAgents = !agentId;
  const hasNoData = data.status === 'no-data';

  return (
    <Card className="h-full">
      <CardHeader title="Token Usage" icon={Gauge} action={viewAllLink}>
        {getStatusBadge(data.status)}
      </CardHeader>

      <CardContent className="space-y-4">
        {hasNoData ? (
          <EmptyState
            icon={Gauge}
            title="No token data reported yet"
            description="Use the SDK's reportTokens() or POST /api/tokens to report usage"
          />
        ) : (
          <>
            {/* Compact stat row */}
            <div className="bg-surface-tertiary rounded-lg px-3 py-2.5">
              <div className="grid grid-cols-4 gap-2">
                <StatCompact label="Hour" value={`${data.hourRemaining}%`} color="text-green-400" />
                <StatCompact label="Week" value={`${data.weekRemaining}%`} color="text-blue-400" />
                <StatCompact label="Context" value={`${data.contextPct}%`} color="text-purple-400" />
                <StatCompact label="Compacts" value={data.compactions} color="text-zinc-300" />
              </div>
            </div>

            {/* Context Window — per-agent breakdown or single bar */}
            {isAllAgents && agentContexts.length > 0 ? (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Users size={12} className="text-zinc-500" />
                  <span className="text-xs text-zinc-500">Context per Agent</span>
                </div>
                <div className="space-y-2">
                  {agentContexts.map(ac => (
                    <div key={ac.agentId}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-zinc-400 truncate max-w-[140px]">{ac.agentId}</span>
                        <span className="text-xs text-zinc-300 tabular-nums">
                          {Math.round((ac.contextUsed || 0) / 1000)}k / {Math.round((ac.contextMax || 0) / 1000)}k
                        </span>
                      </div>
                      <ProgressBar value={ac.contextPct || 0} color={getContextBarColor(ac.contextPct || 0)} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <BookOpen size={12} className="text-zinc-500" />
                    <span className="text-xs text-zinc-500">Context Window</span>
                  </div>
                  <span className="text-xs text-zinc-300 tabular-nums">
                    {Math.round(data.contextUsed / 1000)}k / {Math.round(data.contextMax / 1000)}k
                  </span>
                </div>
                <ProgressBar value={data.contextPct} color={getContextBarColor(data.contextPct)} />
              </div>
            )}

            {/* Hourly Budget */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-zinc-500" />
                  <span className="text-xs text-zinc-500">Hourly Budget</span>
                </div>
                <span className="text-xs text-zinc-300 tabular-nums">{data.hourRemaining}% left</span>
              </div>
              <ProgressBar value={data.hourRemaining} color={getBarColor(data.hourRemaining)} />
            </div>

            {/* Weekly Budget */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-1.5">
                  <CalendarDays size={12} className="text-zinc-500" />
                  <span className="text-xs text-zinc-500">Weekly Budget</span>
                </div>
                <span className="text-xs text-zinc-300 tabular-nums">{data.weekRemaining}% left</span>
              </div>
              <ProgressBar value={data.weekRemaining} color={getBarColor(data.weekRemaining)} />
            </div>

            {/* Today's Stats */}
            <div className="bg-surface-tertiary rounded-lg px-3 py-2.5">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Today</div>
                  <div className="text-sm font-semibold tabular-nums text-white">
                    {(data.todayTokens / 1000).toFixed(1)}k tokens
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Est. Cost</div>
                  <div className="text-sm font-semibold tabular-nums text-green-400">
                    {formatCost(data.todayCost)}
                  </div>
                </div>
              </div>
            </div>

            {/* Model + Last Updated */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <Cpu size={11} className="text-zinc-600" />
                <span className="font-mono text-xs text-zinc-500">{data.model}</span>
              </div>
              {lastUpdated && (
                <span className="text-xs text-zinc-600">Last updated: {lastUpdated}</span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
