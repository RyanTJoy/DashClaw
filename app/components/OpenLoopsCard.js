'use client';

import { useState, useEffect } from 'react';

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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'low': return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getLoopTypeIcon = (type) => {
    switch (type) {
      case 'followup': return '📋';
      case 'question': return '❓';
      case 'dependency': return '🔗';
      case 'approval': return '✋';
      case 'review': return '👀';
      case 'handoff': return '🤝';
      default: return '🔄';
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6 h-full">
        <h2 className="text-xl font-bold text-white flex items-center mb-4">
          <span className="mr-2">🔄</span>Open Loops
        </h2>
        <div className="text-center text-gray-400 py-8">Loading...</div>
      </div>
    );
  }

  const openCount = parseInt(stats.open_count || '0', 10);
  const criticalCount = parseInt(stats.critical_open || '0', 10);
  const highCount = parseInt(stats.high_open || '0', 10);

  return (
    <div className="glass-card p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center">
          <span className="mr-2">🔄</span>
          Open Loops
        </h2>
        <div className="flex items-center space-x-2">
          {criticalCount > 0 && (
            <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
              {criticalCount} CRIT
            </span>
          )}
          <span className="bg-fire-orange text-white px-2 py-1 rounded-full text-sm font-semibold">
            {openCount}
          </span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg bg-white/5">
          <div className="text-lg font-bold text-white">{openCount}</div>
          <div className="text-xs text-gray-400">Open</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/5">
          <div className="text-lg font-bold text-orange-400">{highCount}</div>
          <div className="text-xs text-gray-400">High</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/5">
          <div className="text-lg font-bold text-green-400">{parseInt(stats.resolved_count || '0', 10)}</div>
          <div className="text-xs text-gray-400">Resolved</div>
        </div>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {loops.length === 0 ? (
          <div className="text-center text-gray-400 py-6">
            <div className="text-3xl mb-2">✅</div>
            <div>No open loops</div>
          </div>
        ) : (
          loops.map((loop) => (
            <div key={loop.loop_id} className="glass-card p-3 hover:bg-opacity-20 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2 flex-1">
                  <span className="text-lg mt-0.5">{getLoopTypeIcon(loop.loop_type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm truncate">{loop.description}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {loop.agent_name || loop.agent_id || 'Unknown agent'} &middot; {loop.loop_type}
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getPriorityColor(loop.priority)}`}>
                  {loop.priority}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
