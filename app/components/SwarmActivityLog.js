'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Zap, MessageSquare, Shield, Activity,
  Clock, ArrowRight, Terminal, Target
} from 'lucide-react';
import { Card, CardHeader, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { useAgentFilter } from '../lib/AgentFilterContext';
import { useRealtime } from '../hooks/useRealtime';
import { getAgentColor } from '../lib/colors';

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function SwarmActivityLog() {
  const { agentId } = useAgentFilter();
  const [logs, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  // Initial fetch
  useEffect(() => {
    async function fetchInitial() {
      try {
        const agentParam = agentId ? `?agent_id=${encodeURIComponent(agentId)}` : '';
        const [actionsRes, msgsRes, guardRes] = await Promise.all([
          fetch(`/api/actions?limit=10${agentId ? `&agent_id=${agentId}` : ''}`),
          fetch(`/api/messages?limit=10${agentId ? `&agent_id=${agentId}` : ''}`),
          fetch(`/api/guard?limit=10${agentId ? `&agent_id=${agentId}` : ''}`),
        ]);

        const merged = [];
        if (actionsRes.ok) {
          const d = await actionsRes.json();
          (d.actions || []).forEach(a => merged.push({
            id: a.action_id,
            type: 'action',
            agent_id: a.agent_id,
            text: a.declared_goal || a.action_type,
            timestamp: a.timestamp_start,
            status: a.status
          }));
        }
        if (msgsRes.ok) {
          const d = await msgsRes.json();
          (d.messages || []).forEach(m => merged.push({
            id: m.id,
            type: 'message',
            agent_id: m.from_agent_id,
            text: `Sent message: ${m.subject || m.body?.substring(0, 30)}`,
            timestamp: m.created_at
          }));
        }
        if (guardRes.ok) {
          const d = await guardRes.json();
          (d.decisions || []).forEach(g => merged.push({
            id: g.id,
            type: 'guard',
            agent_id: g.agent_id,
            text: `Policy check: ${g.decision.toUpperCase()} (${g.action_type})`,
            timestamp: g.created_at
          }));
        }

        merged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setSignals(merged.slice(0, 50));
      } catch (err) {
        console.error('Failed to fetch activity logs:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchInitial();
  }, [agentId]);

  useRealtime(useCallback((event, payload) => {
    let newEntry = null;

    if (event === 'action.created' || event === 'action.updated') {
      if (agentId && payload.agent_id !== agentId) return;
      newEntry = {
        id: payload.action_id,
        type: 'action',
        agent_id: payload.agent_id,
        text: payload.declared_goal || payload.action_type,
        timestamp: payload.timestamp_start || payload.timestamp_end,
        status: payload.status
      };
    } else if (event === 'message.created') {
      const msg = payload;
      if (agentId && msg.from_agent_id !== agentId && msg.to_agent_id !== agentId) return;
      newEntry = {
        id: msg.id,
        type: 'message',
        agent_id: msg.from_agent_id,
        text: `Sent message: ${msg.subject || msg.body?.substring(0, 30)}`,
        timestamp: msg.created_at
      };
    } else if (event === 'guard.decision.created') {
      const g = payload;
      if (agentId && g.agent_id !== agentId) return;
      newEntry = {
        id: g.id,
        type: 'guard',
        agent_id: g.agent_id,
        text: `Policy check: ${g.decision.toUpperCase()} (${g.action_type || 'other'})`,
        timestamp: g.created_at
      };
    } else if (event === 'goal.created' || event === 'goal.updated') {
      const g = payload;
      if (agentId && g.agent_id !== agentId) return;
      newEntry = {
        id: g.id,
        type: 'goal',
        agent_id: g.agent_id,
        text: `${event === 'goal.created' ? 'Created goal' : 'Updated goal'}: ${g.title} (${g.progress}%)`,
        timestamp: g.created_at || new Date().toISOString()
      };
    }

    if (newEntry) {
      setSignals(prev => {
        if (event === 'action.updated' || event === 'goal.updated') {
          return [newEntry, ...prev.filter(p => p.id !== newEntry.id)].slice(0, 50);
        }
        if (prev.some(p => p.id === newEntry.id)) return prev;
        return [newEntry, ...prev].slice(0, 50);
      });
    }
  }, [agentId]));

  return (
    <Card className="h-full flex flex-col overflow-hidden border-brand/10">
      <CardHeader title="Live Swarm Log" icon={Terminal} className="bg-brand/5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
          </span>
          <span className="text-[10px] font-mono text-brand uppercase tracking-widest">Live Feed</span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 font-mono text-[11px] overflow-hidden bg-black/40">
        <div className="h-full overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800" ref={scrollRef}>
          {loading ? (
            <div className="flex items-center justify-center h-full text-zinc-600 animate-pulse">
              Initialising stream...
            </div>
          ) : logs.length === 0 ? (
            <EmptyState icon={Activity} title="Awaiting activity" description="Agent events will appear here in real-time." />
          ) : (
            logs.map((log) => {
              const agentColor = getAgentColor(log.agent_id);
              const Icon = log.type === 'action' ? Zap : log.type === 'message' ? MessageSquare : log.type === 'goal' ? Target : Shield;
              const typeColor = log.type === 'action' ? 'text-blue-400' : log.type === 'message' ? 'text-purple-400' : log.type === 'goal' ? 'text-emerald-400' : 'text-emerald-400';

              return (
                <div key={log.id} className="flex items-start gap-3 py-1 group border-b border-white/[0.02] last:border-0">
                  <span className="text-zinc-600 shrink-0 tabular-nums">[{formatTime(log.timestamp)}]</span>
                  <div className={`mt-0.5 shrink-0 ${typeColor}`}>
                    <Icon size={10} />
                  </div>
                  <div className="flex-1 min-w-0 flex items-start gap-2">
                    <span className={`px-1 rounded bg-zinc-900 border border-white/5 ${agentColor} text-[10px] shrink-0`}>
                      {log.agent_id?.substring(0, 8)}
                    </span>
                    <span className="text-zinc-300 truncate group-hover:text-white transition-colors">
                      {log.text}
                    </span>
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
