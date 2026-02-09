'use client';

import { useState, useEffect } from 'react';
import {
  Zap, Hammer, Rocket, FileText, Briefcase, Shield, MessageSquare,
  Link, Calendar, Search, Eye, Wrench, RefreshCw, FlaskConical,
  Settings, Radio, AlertTriangle, Trash2, Package,
  CheckCircle2, XCircle, Clock, Loader2, Ban, HelpCircle, Inbox
} from 'lucide-react';
import { Card, CardHeader, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { StatCompact } from './ui/Stat';
import { EmptyState } from './ui/EmptyState';
import { CardSkeleton } from './ui/Skeleton';
import { getAgentColor } from '../lib/colors';

const TYPE_ICONS = {
  build: Hammer,
  deploy: Rocket,
  post: FileText,
  apply: Briefcase,
  security: Shield,
  message: MessageSquare,
  api: Link,
  calendar: Calendar,
  research: Search,
  review: Eye,
  fix: Wrench,
  refactor: RefreshCw,
  test: FlaskConical,
  config: Settings,
  monitor: Radio,
  alert: AlertTriangle,
  cleanup: Trash2,
  sync: RefreshCw,
  migrate: Package,
};

function StatusIcon({ status }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={14} className="text-green-400" />;
    case 'failed':
      return <XCircle size={14} className="text-red-400" />;
    case 'pending':
      return <Clock size={14} className="text-yellow-400" />;
    case 'in-progress':
      return <Loader2 size={14} className="text-blue-400" />;
    case 'cancelled':
      return <Ban size={14} className="text-zinc-500" />;
    default:
      return <HelpCircle size={14} className="text-zinc-500" />;
  }
}

export default function RecentActionsCard() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActions() {
      try {
        const res = await fetch('/api/actions?limit=10');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setActions((data.actions || []).map(a => ({
          id: a.action_id,
          type: a.action_type || 'other',
          action: a.declared_goal,
          agentId: a.agent_id,
          agentName: a.agent_name || a.agent_id,
          platform: (() => {
            try {
              const systems = JSON.parse(a.systems_touched || '[]');
              return systems[0] || 'System';
            } catch { return 'System'; }
          })(),
          timestamp: a.timestamp_start,
          status: a.status === 'running' ? 'in-progress' : a.status
        })));
      } catch (error) {
        console.error('Failed to fetch actions:', error);
        setActions([]);
      } finally {
        setLoading(false);
      }
    }
    fetchActions();
  }, []);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return { time: '--:--', date: '----' };
    try {
      const d = new Date(timestamp);
      return {
        time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      };
    } catch {
      const parts = timestamp.split(' ');
      return { time: parts[1] || '--:--', date: parts[0] || '----' };
    }
  };

  if (loading) {
    return <CardSkeleton />;
  }

  const completed = actions.filter(a => a.status === 'completed').length;
  const running = actions.filter(a => a.status === 'in-progress').length;
  const pending = actions.filter(a => a.status === 'pending').length;
  const failed = actions.filter(a => a.status === 'failed').length;

  return (
    <Card className="h-full">
      <CardHeader title="Recent Actions" icon={Zap} count={actions.length} />

      <CardContent>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {actions.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No recent actions"
              description="Actions will appear here as agents report activity"
            />
          ) : (
            actions.map((action) => {
              const { time, date } = formatTimestamp(action.timestamp);
              const TypeIcon = TYPE_ICONS[action.type] || Zap;
              const agentColorClass = getAgentColor(action.agentId);

              return (
                <div
                  key={action.id}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg transition-colors duration-150 hover:bg-white/[0.03]"
                >
                  {/* Type icon */}
                  <TypeIcon size={14} className="text-zinc-400 flex-shrink-0" />

                  {/* Action name + agent + system */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-300 truncate">{action.action}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${agentColorClass}`}>
                        {action.agentName}
                      </span>
                      <span className="text-[10px] text-zinc-600">{action.platform}</span>
                    </div>
                  </div>

                  {/* Status + timestamp */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusIcon status={action.status} />
                    <div className="text-right">
                      <div className="font-mono text-xs text-zinc-400">{time}</div>
                      <div className="font-mono text-[10px] text-zinc-600">{date}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom stats */}
        {actions.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)]">
            <div className="grid grid-cols-4 gap-2">
              <StatCompact label="Done" value={completed} color="text-green-400" />
              <StatCompact label="Running" value={running} color="text-blue-400" />
              <StatCompact label="Pending" value={pending} color="text-yellow-400" />
              <StatCompact label="Failed" value={failed} color="text-red-400" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
