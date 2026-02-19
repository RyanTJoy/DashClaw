'use client';

import { useState, useEffect } from 'react';
import { Activity, ShieldCheck, ShieldAlert, Cpu, Timer, Wifi, WifiOff } from 'lucide-react';
import { Card, CardHeader, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { StatCompact } from './ui/Stat';
import { CardSkeleton } from './ui/Skeleton';
import { useRealtime } from '../hooks/useRealtime';

export default function FleetPresenceCard() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch (err) {
      console.error('Failed to fetch agents presence:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 60000); // Poll once a minute as fallback
    return () => clearInterval(interval);
  }, []);

  useRealtime((event, payload) => {
    if (event === 'agent.heartbeat' || event === 'action.created') {
      fetchAgents();
    }
  });

  if (loading) return <CardSkeleton />;

  const isOnline = (agent) => {
    if (!agent.last_heartbeat_at) return false;
    const diff = Date.now() - new Date(agent.last_heartbeat_at).getTime();
    return diff < 10 * 60 * 1000; // 10 minutes
  };

  const onlineAgents = agents.filter(isOnline);
  const totalAgents = agents.length;

  return (
    <Card className="h-full">
      <CardHeader 
        title="Agent Fleet Presence" 
        icon={Cpu} 
        count={onlineAgents.length}
      />
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <div className="text-xl font-bold text-emerald-400 tabular-nums">{onlineAgents.length}</div>
              <div className="text-[10px] text-zinc-500 uppercase font-semibold">Online</div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-500/5 border border-zinc-500/10">
              <div className="text-xl font-bold text-zinc-400 tabular-nums">{totalAgents - onlineAgents.length}</div>
              <div className="text-[10px] text-zinc-500 uppercase font-semibold">Inactive</div>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {agents.map((agent) => {
              const online = isOnline(agent);
              return (
                <div key={agent.agent_id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`relative`}>
                      <Cpu size={16} className={online ? 'text-brand' : 'text-zinc-600'} />
                      {online && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#0a0a0a]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-zinc-200 truncate">{agent.agent_name || agent.agent_id}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-zinc-500 font-mono">{agent.agent_id}</span>
                        {agent.current_task_id && (
                          <Badge variant="info" size="xs" className="px-1 py-0 h-3.5">task:{agent.current_task_id.slice(0, 6)}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className={`text-[10px] font-medium flex items-center gap-1 ${online ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {online ? <Wifi size={10} /> : <WifiOff size={10} />}
                      {online ? 'Online' : 'Offline'}
                    </div>
                    <div className="text-[9px] text-zinc-600 mt-0.5">
                      {agent.last_heartbeat_at ? new Date(agent.last_heartbeat_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {agents.length === 0 && (
              <div className="py-8 text-center text-xs text-zinc-500 italic">No agents registered in fleet</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
