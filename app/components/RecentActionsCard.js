'use client';

import { useState, useEffect } from 'react';

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

  const getAgentColor = (agentId) => {
    const colors = [
      'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      'bg-pink-500/20 text-pink-400 border-pink-500/30',
      'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'bg-red-500/20 text-red-400 border-red-500/30',
    ];
    let hash = 0;
    for (let i = 0; i < (agentId || '').length; i++) hash = ((hash << 5) - hash + agentId.charCodeAt(i)) | 0;
    return colors[Math.abs(hash) % colors.length];
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'build': return '🔨';
      case 'deploy': return '🚀';
      case 'post': return '📝';
      case 'apply': return '💼';
      case 'security': return '🛡️';
      case 'message': return '💬';
      case 'api': return '🔗';
      case 'calendar': return '📅';
      case 'research': return '🔍';
      case 'review': return '👀';
      case 'fix': return '🔧';
      case 'refactor': return '♻️';
      case 'test': return '🧪';
      case 'config': return '⚙️';
      case 'monitor': return '📡';
      case 'alert': return '🚨';
      case 'cleanup': return '🧹';
      case 'sync': return '🔄';
      case 'migrate': return '📦';
      default: return '⚡';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'build': return 'bg-green-500';
      case 'deploy': return 'bg-emerald-500';
      case 'post': return 'bg-blue-500';
      case 'apply': return 'bg-purple-500';
      case 'security': return 'bg-red-500';
      case 'message': return 'bg-yellow-500';
      case 'api': return 'bg-orange-500';
      case 'calendar': return 'bg-indigo-500';
      case 'research': return 'bg-cyan-500';
      case 'fix': return 'bg-amber-500';
      case 'test': return 'bg-teal-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in-progress': return '🔄';
      case 'pending': return '⏳';
      case 'failed': return '❌';
      case 'cancelled': return '🚫';
      default: return '❓';
    }
  };

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
    return (
      <div className="glass-card p-6 h-full">
        <h2 className="text-xl font-bold text-white flex items-center mb-4">
          <span className="mr-2">⚡</span>Recent Actions
        </h2>
        <div className="text-center text-gray-400 py-8">Loading actions...</div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center">
          <span className="mr-2">⚡</span>
          Recent Actions
        </h2>
        <span className="bg-fire-orange text-white px-2 py-1 rounded-full text-sm font-semibold">
          {actions.length}
        </span>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {actions.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <div className="text-4xl mb-2">😴</div>
            <div>No recent actions</div>
          </div>
        ) : (
          actions.map((action) => {
            const { time, date } = formatTimestamp(action.timestamp);

            return (
              <div key={action.id} className="glass-card p-4 hover:bg-opacity-20 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{getTypeIcon(action.type)}</span>
                      <span className={`px-2 py-1 rounded text-xs font-bold text-white ${getTypeColor(action.type)}`}>
                        {action.type}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white text-sm">{action.action}</div>
                      <div className="flex items-center space-x-2 text-xs text-gray-400">
                        <span className={`px-1.5 py-0.5 rounded border text-xs font-medium ${getAgentColor(action.agentId)}`}>
                          {action.agentName}
                        </span>
                        <span>{action.platform}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex items-center space-x-2">
                    <span className="text-lg">{getStatusIcon(action.status)}</span>
                    <div>
                      <div className="text-xs text-white font-semibold">{time}</div>
                      <div className="text-xs text-gray-400">{date}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div>
            <div className="font-semibold text-green-400">{actions.filter(a => a.status === 'completed').length}</div>
            <div className="text-gray-400">Done</div>
          </div>
          <div>
            <div className="font-semibold text-blue-400">{actions.filter(a => a.status === 'in-progress').length}</div>
            <div className="text-gray-400">Running</div>
          </div>
          <div>
            <div className="font-semibold text-yellow-400">{actions.filter(a => a.status === 'pending').length}</div>
            <div className="text-gray-400">Pending</div>
          </div>
          <div>
            <div className="font-semibold text-red-400">{actions.filter(a => a.status === 'failed').length}</div>
            <div className="text-gray-400">Failed</div>
          </div>
        </div>
      </div>
    </div>
  );
}
