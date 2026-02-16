'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, ShieldCheck, Activity } from 'lucide-react';
import { useAgentFilter } from '../lib/AgentFilterContext';

function computeSystemState(redCount, amberCount) {
  if (redCount >= 2) return { label: 'ALERT', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', pulse: true };
  if (redCount === 1) return { label: 'ELEVATED', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', pulse: false };
  if (amberCount >= 3) return { label: 'DRIFTING', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', pulse: false };
  if (amberCount > 0) return { label: 'REVIEWING', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', pulse: false };
  return { label: 'STABLE', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', pulse: false };
}

export default function SystemStatusBar() {
  const { agentId } = useAgentFilter();
  const [counts, setCounts] = useState(null);

  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch(`/api/actions/signals${agentId ? `?agent_id=${agentId}` : ''}`);
      if (!res.ok) return;
      const data = await res.json();
      setCounts(data.counts || { red: 0, amber: 0, total: 0 });
    } catch {
      // Silently fail — bar just won't render
    }
  }, [agentId]);

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 30000);
    return () => clearInterval(interval);
  }, [fetchSignals]);

  if (!counts) return null;

  const state = computeSystemState(counts.red, counts.amber);

  return (
    <div className="flex items-center justify-between px-6 py-1.5 bg-surface-primary border-b border-[rgba(255,255,255,0.04)] text-xs">
      <div className="flex items-center gap-4">
        {/* System State Badge */}
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${state.bg} border ${state.border}`}>
          <Activity size={10} className={`${state.color} ${state.pulse ? 'animate-pulse' : ''}`} />
          <span className={`font-semibold tracking-wider ${state.color}`}>{state.label}</span>
        </div>

        {/* Signal Counts */}
        <div className="flex items-center gap-3 text-zinc-500">
          {counts.red > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-red-400 font-medium">{counts.red} Critical</span>
            </span>
          )}
          {counts.amber > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-amber-400 font-medium">{counts.amber} Amber</span>
            </span>
          )}
          {counts.red === 0 && counts.amber === 0 && (
            <span className="flex items-center gap-1">
              <ShieldCheck size={11} className="text-emerald-500" />
              <span className="text-emerald-400">All clear</span>
            </span>
          )}
        </div>
      </div>

      {/* Total count */}
      <span className="text-zinc-600 tabular-nums">
        {counts.total} signal{counts.total !== 1 ? 's' : ''} active
      </span>
    </div>
  );
}
