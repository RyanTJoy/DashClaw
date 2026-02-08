'use client';

import { useState, useEffect } from 'react';

export default function ContextCard() {
  const [contextData, setContextData] = useState({
    todayPoints: 0,
    recentPoints: [],
    stats: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContext() {
      try {
        const res = await fetch('/api/learning');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();

        const decisions = (data.decisions || []).slice(0, 6);
        const stats = data.stats || {};

        const points = decisions.map(d => ({
          id: d.id,
          text: d.decision,
          category: mapOutcomeToCategory(d.outcome),
          importance: d.context ? Math.min(10, Math.max(3, Math.ceil(d.decision.length / 30))) : 5,
          timestamp: formatTimestamp(d.timestamp)
        }));

        setContextData({
          todayPoints: points.length,
          recentPoints: points,
          stats
        });
      } catch (error) {
        console.error('Failed to fetch context:', error);
        setContextData({ todayPoints: 0, recentPoints: [], stats: {} });
      } finally {
        setLoading(false);
      }
    }
    fetchContext();
  }, []);

  const mapOutcomeToCategory = (outcome) => {
    if (outcome === 'success') return 'decision';
    if (outcome === 'pending') return 'status';
    if (outcome === 'failure' || outcome === 'failed') return 'insight';
    return 'status';
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '--';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York' }) + ' EST';
    } catch { return ts; }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'decision': return '⚡';
      case 'insight': return '💡';
      case 'preference': return '❤️';
      case 'status': return '📊';
      default: return '💭';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'decision': return 'bg-red-500';
      case 'insight': return 'bg-yellow-500';
      case 'preference': return 'bg-pink-500';
      case 'status': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getImportanceWidth = (importance) => `${importance * 10}%`;

  if (loading) {
    return (
      <div className="glass-card p-6 h-full">
        <h2 className="text-xl font-bold text-white flex items-center mb-4">
          <span className="mr-2">🧵</span>Context
        </h2>
        <div className="text-center text-gray-400 py-8">Loading context...</div>
      </div>
    );
  }

  if (contextData.recentPoints.length === 0) {
    return (
      <div className="glass-card p-6 h-full">
        <h2 className="text-xl font-bold text-white flex items-center mb-4">
          <span className="mr-2">🧵</span>Context
        </h2>
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-2">🧠</div>
          <div>No learning data yet</div>
          <div className="text-xs mt-1">Context is drawn from learning decisions</div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center">
          <span className="mr-2">🧵</span>
          Context
        </h2>
        <div className="flex space-x-2">
          <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
            {contextData.todayPoints} decisions
          </span>
          {contextData.stats.totalLessons > 0 && (
            <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
              {contextData.stats.totalLessons} lessons
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Stats Row */}
        {contextData.stats.successRate !== undefined && (
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="glass-card p-2">
              <div className="font-bold text-green-400">{contextData.stats.successRate}%</div>
              <div className="text-gray-400">Success</div>
            </div>
            <div className="glass-card p-2">
              <div className="font-bold text-white">{contextData.stats.totalDecisions || 0}</div>
              <div className="text-gray-400">Decisions</div>
            </div>
            <div className="glass-card p-2">
              <div className="font-bold text-purple-400">{contextData.stats.patterns || 0}</div>
              <div className="text-gray-400">Patterns</div>
            </div>
          </div>
        )}

        {/* Recent Key Points */}
        <div>
          <div className="text-sm font-semibold text-gray-300 mb-2">Recent Decisions</div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {contextData.recentPoints.map((point) => (
              <div key={point.id} className="glass-card p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    <span className="mr-2">{getCategoryIcon(point.category)}</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold text-white ${getCategoryColor(point.category)}`}>
                      {point.category}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{point.timestamp}</span>
                </div>

                <div className="text-sm text-white mb-2">{point.text}</div>

                <div className="w-full bg-gray-700 rounded-full h-1">
                  <div
                    className="h-1 fire-gradient rounded-full"
                    style={{ width: getImportanceWidth(point.importance) }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
