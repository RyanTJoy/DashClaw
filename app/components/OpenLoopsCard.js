'use client';

import { useState, useEffect } from 'react';
import {
  CircleDot, ClipboardList, HelpCircle, Link, Hand, Eye,
  ArrowRightLeft, RefreshCw, CheckCircle2
} from 'lucide-react';
import { Card, CardHeader, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { StatCompact } from './ui/Stat';
import { EmptyState } from './ui/EmptyState';
import { CardSkeleton } from './ui/Skeleton';

const LOOP_TYPE_ICONS = {
  followup: ClipboardList,
  question: HelpCircle,
  dependency: Link,
  approval: Hand,
  review: Eye,
  handoff: ArrowRightLeft,
};

function getPriorityVariant(priority) {
  switch (priority) {
    case 'critical': return 'error';
    case 'high': return 'warning';
    default: return 'default';
  }
}

export default function OpenLoopsCard() {
  const [loops, setLoops] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLoops() {
      try {
        const res = await fetch('/api/actions/loops?status=open&limit=5');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setLoops(data.loops || []);
        setStats(data.stats || {});
      } catch (error) {
        console.error('Failed to fetch open loops:', error);
        setLoops([]);
        setStats({});
      } finally {
        setLoading(false);
      }
    }
    fetchLoops();
  }, []);

  if (loading) {
    return <CardSkeleton />;
  }

  const openCount = parseInt(stats.open_count || '0', 10);
  const criticalCount = parseInt(stats.critical_open || '0', 10);
  const highCount = parseInt(stats.high_open || '0', 10);
  const resolvedCount = parseInt(stats.resolved_count || '0', 10);

  return (
    <Card className="h-full">
      <CardHeader title="Open Loops" icon={CircleDot}>
        {openCount > 0 && (
          <Badge variant="brand" size="sm">{openCount} Open</Badge>
        )}
        {criticalCount > 0 && (
          <Badge variant="error" size="sm">{criticalCount} Crit</Badge>
        )}
      </CardHeader>

      <CardContent>
        {/* Summary stats */}
        <div className="bg-surface-tertiary rounded-lg px-3 py-2.5 mb-4">
          <div className="grid grid-cols-3 gap-2">
            <StatCompact label="Open" value={openCount} color="text-white" />
            <StatCompact label="High" value={highCount} color="text-amber-400" />
            <StatCompact label="Resolved" value={resolvedCount} color="text-green-400" />
          </div>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {loops.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No open loops"
              description="All loops have been resolved"
            />
          ) : (
            loops.map((loop) => {
              const TypeIcon = LOOP_TYPE_ICONS[loop.loop_type] || RefreshCw;

              return (
                <div
                  key={loop.loop_id}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-surface-tertiary border border-[rgba(255,255,255,0.06)] transition-colors duration-150 hover:border-[rgba(255,255,255,0.12)]"
                >
                  <TypeIcon size={14} className="text-zinc-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-300 truncate">{loop.description}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-zinc-500">
                        {loop.agent_name || loop.agent_id || 'Unknown agent'}
                      </span>
                      <span className="text-[10px] text-zinc-600">{loop.loop_type}</span>
                    </div>
                  </div>
                  <Badge variant={getPriorityVariant(loop.priority)} size="xs">
                    {loop.priority}
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
