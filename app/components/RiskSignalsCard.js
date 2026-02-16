'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, ShieldCheck, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { CardSkeleton } from './ui/Skeleton';
import { useAgentFilter } from '../lib/AgentFilterContext';

function getSignalHash(signal) {
  return `${signal.type || signal.signal_type || ''}:${signal.agent_id || ''}:${signal.action_id || ''}:${signal.loop_id || ''}:${signal.assumption_id || ''}`;
}

export default function RiskSignalsCard() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const { agentId } = useAgentFilter();

  useEffect(() => {
    async function fetchSignals() {
      try {
        const res = await fetch(`/api/actions/signals${agentId ? `?agent_id=${agentId}` : ''}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setSignals(data.signals || []);
      } catch (error) {
        console.error('Failed to fetch risk signals:', error);
        setSignals([]);
      } finally {
        setLoading(false);
      }
    }
    fetchSignals();
  }, [agentId]);

  if (loading) {
    return <CardSkeleton />;
  }

  // Respect dismissals from the Security page
  let dismissed = new Set();
  try {
    const stored = typeof window !== 'undefined' && localStorage.getItem('dashclaw_dismissed_signals');
    if (stored) dismissed = new Set(JSON.parse(stored));
  } catch { /* ignore */ }

  const filteredSignals = signals.filter(s => !dismissed.has(getSignalHash(s)));
  const redCount = filteredSignals.filter(s => s.severity === 'red').length;
  const amberCount = filteredSignals.filter(s => s.severity === 'amber').length;

  const viewAllLink = (
    <Link href="/security" className="text-xs text-brand hover:text-brand-hover transition-colors inline-flex items-center gap-1">
      View all <ArrowRight size={12} />
    </Link>
  );

  return (
    <Card className="h-full">
      <CardHeader title="Decision Integrity Signals" icon={ShieldAlert} action={viewAllLink}>
        {redCount > 0 && (
          <Badge variant="error" size="sm">{redCount} Red</Badge>
        )}
        {amberCount > 0 && (
          <Badge variant="warning" size="sm">{amberCount} Amber</Badge>
        )}
        {redCount === 0 && amberCount === 0 && (
          <Badge variant="success" size="sm">Clear</Badge>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {filteredSignals.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="All clear"
              description="All clear - no active risk signals"
            />
          ) : (
            filteredSignals.map((signal, idx) => {
              const dotColor = signal.severity === 'red' ? 'bg-red-500' : 'bg-amber-500';
              const titleColor = signal.severity === 'red' ? 'text-red-400' : 'text-amber-400';

              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-surface-tertiary border border-[rgba(255,255,255,0.06)] transition-colors duration-150"
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${titleColor}`}>{signal.label}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{signal.detail}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
