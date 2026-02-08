'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export default function ActionsTimeline() {
  const [actions, setActions] = useState([]);
  const [stats, setStats] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [expandedData, setExpandedData] = useState({});

  // Filters
  const [filterAgent, setFilterAgent] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRiskMin, setFilterRiskMin] = useState('');
  const [page, setPage] = useState(0);
  const [knownAgents, setKnownAgents] = useState([]);
  const pageSize = 25;

  // Consistent color for each agent based on name hash
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

  const fetchActions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterAgent) params.set('agent_id', filterAgent);
      if (filterType) params.set('action_type', filterType);
      if (filterStatus) params.set('status', filterStatus);
      if (filterRiskMin) params.set('risk_min', filterRiskMin);
      params.set('limit', pageSize.toString());
      params.set('offset', (page * pageSize).toString());

      const res = await fetch(`/api/actions?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const actionsList = data.actions || [];
      setActions(actionsList);
      setStats(data.stats || {});
      setTotal(data.total || 0);
      setLastUpdated(new Date().toLocaleTimeString());

      // Build known agents list from results (only on unfiltered fetches)
      if (!filterAgent) {
        const agentMap = new Map();
        actionsList.forEach(a => {
          if (a.agent_id && !agentMap.has(a.agent_id)) {
            agentMap.set(a.agent_id, a.agent_name || a.agent_id);
          }
        });
        setKnownAgents(prev => {
          const merged = new Map(prev.map(a => [a.id, a.name]));
          agentMap.forEach((name, id) => merged.set(id, name));
          return Array.from(merged, ([id, name]) => ({ id, name }));
        });
      }
    } catch (error) {
      console.error('Failed to fetch actions:', error);
    } finally {
      setLoading(false);
    }
  }, [filterAgent, filterType, filterStatus, filterRiskMin, page]);

  useEffect(() => {
    setLoading(true);
    fetchActions();
  }, [fetchActions]);

  const toggleExpand = async (actionId) => {
    if (expandedId === actionId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(actionId);
    if (!expandedData[actionId]) {
      try {
        const res = await fetch(`/api/actions/${actionId}`);
        if (res.ok) {
          const data = await res.json();
          setExpandedData(prev => ({ ...prev, [actionId]: data }));
        }
      } catch (error) {
        console.error('Failed to fetch action detail:', error);
      }
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      build: '🔨', deploy: '🚀', post: '📝', apply: '💼', security: '🛡️',
      message: '💬', api: '🔗', calendar: '📅', research: '🔍', review: '👀',
      fix: '🔧', refactor: '♻️', test: '🧪', config: '⚙️', monitor: '📡',
      alert: '🚨', cleanup: '🧹', sync: '🔄', migrate: '📦'
    };
    return icons[type] || '⚡';
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      running: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30',
      cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      pending: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
    return styles[status] || styles.pending;
  };

  const getRiskColor = (score) => {
    const s = parseInt(score, 10);
    if (s >= 70) return 'text-red-400';
    if (s >= 40) return 'text-amber-400';
    return 'text-green-400';
  };

  const formatTime = (ts) => {
    if (!ts) return '--';
    try {
      return new Date(ts).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
      });
    } catch { return ts; }
  };

  const parseJsonArray = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return []; }
    }
    return [];
  };

  const successRate = parseInt(stats.total, 10) > 0
    ? Math.round((parseInt(stats.completed, 10) / parseInt(stats.total, 10)) * 100)
    : 0;

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen p-6">
      <nav className="mb-6">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors">
          ← Back to Dashboard
        </Link>
      </nav>

      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-2xl">
              ⚡
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Action Timeline</h1>
              <p className="text-gray-400">Agent Operations Control Plane {lastUpdated && `• Updated ${lastUpdated}`}</p>
            </div>
          </div>
          <button onClick={() => { setLoading(true); fetchActions(); }} className="px-3 py-2 glass-card hover:bg-opacity-20 transition-all rounded-lg">
            🔄 Refresh
          </button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-white">{stats.total || 0}</div>
          <div className="text-sm text-gray-400">Total Actions</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-green-400">{successRate}%</div>
          <div className="text-sm text-gray-400">Success Rate</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-yellow-400">{stats.running || 0}</div>
          <div className="text-sm text-gray-400">Running</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className={`text-3xl font-bold ${parseInt(stats.high_risk, 10) > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {stats.high_risk || 0}
          </div>
          <div className="text-sm text-gray-400">High Risk</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-purple-400">${parseFloat(stats.total_cost || 0).toFixed(2)}</div>
          <div className="text-sm text-gray-400">Total Cost</div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select
            value={filterAgent}
            onChange={(e) => { setFilterAgent(e.target.value); setPage(0); }}
            className="px-3 py-2 bg-white/5 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
          >
            <option value="">All Agents</option>
            {knownAgents.map(a => (
              <option key={a.id} value={a.id}>{a.name || a.id}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(0); }}
            className="px-3 py-2 bg-white/5 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
          >
            <option value="">All Types</option>
            {['build','deploy','post','apply','security','message','api','calendar','research','review','fix','refactor','test','config','monitor','alert','cleanup','sync','migrate','other'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
            className="px-3 py-2 bg-white/5 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
          >
            <option value="">All Statuses</option>
            {['running','completed','failed','cancelled','pending'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={filterRiskMin}
            onChange={(e) => { setFilterRiskMin(e.target.value); setPage(0); }}
            className="px-3 py-2 bg-white/5 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
          >
            <option value="">Any Risk</option>
            <option value="40">Medium+ (40+)</option>
            <option value="70">High (70+)</option>
            <option value="90">Critical (90+)</option>
          </select>
        </div>
      </div>

      {/* Actions List */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">
            Actions <span className="text-sm font-normal text-gray-400">({total} total)</span>
          </h2>
          {totalPages > 1 && (
            <div className="flex items-center space-x-2 text-sm">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2 py-1 glass-card rounded disabled:opacity-30 hover:bg-opacity-20 text-white"
              >
                ←
              </button>
              <span className="text-gray-400">{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-2 py-1 glass-card rounded disabled:opacity-30 hover:bg-opacity-20 text-white"
              >
                →
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Loading actions...</div>
        ) : actions.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <div className="text-4xl mb-2">📭</div>
            <div>No actions found</div>
          </div>
        ) : (
          <div className="space-y-3">
            {actions.map((action) => {
              const isExpanded = expandedId === action.action_id;
              const detail = expandedData[action.action_id];
              const systems = parseJsonArray(action.systems_touched);
              const sideEffects = parseJsonArray(action.side_effects);
              const artifacts = parseJsonArray(action.artifacts_created);

              return (
                <div key={action.action_id} className="glass-card overflow-hidden">
                  <button
                    onClick={() => toggleExpand(action.action_id)}
                    className="w-full p-4 text-left hover:bg-white/5 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <span className="text-xl mt-0.5">{getTypeIcon(action.action_type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white truncate">{action.declared_goal}</div>
                          <div className="flex items-center space-x-3 mt-1 text-xs text-gray-400">
                            <span className={`px-1.5 py-0.5 rounded border text-xs font-medium ${getAgentColor(action.agent_id)}`}>
                              {action.agent_name || action.agent_id}
                            </span>
                            <span>·</span>
                            <span>{action.action_type}</span>
                            <span>·</span>
                            <span>{formatTime(action.timestamp_start)}</span>
                            {systems.length > 0 && (
                              <>
                                <span>·</span>
                                <span>{systems.slice(0, 2).join(', ')}{systems.length > 2 ? ` +${systems.length - 2}` : ''}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 ml-3">
                        <span className={`text-sm font-bold ${getRiskColor(action.risk_score)}`}>
                          R:{action.risk_score || 0}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getStatusBadge(action.status)}`}>
                          {action.status}
                        </span>
                        <span className="text-gray-500 text-sm">{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-700 p-4 bg-white/5 space-y-4">
                      {/* Intent */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-500 uppercase mb-1">Reasoning</div>
                          <div className="text-sm text-gray-300">{action.reasoning || 'Not specified'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase mb-1">Authorization</div>
                          <div className="text-sm text-gray-300">{action.authorization_scope || 'Not specified'}</div>
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Confidence: </span>
                          <span className="text-white">{action.confidence || 50}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Reversible: </span>
                          <span className={action.reversible ? 'text-green-400' : 'text-red-400'}>
                            {action.reversible ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Duration: </span>
                          <span className="text-white">{action.duration_ms ? `${(action.duration_ms / 1000).toFixed(1)}s` : '--'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Cost: </span>
                          <span className="text-white">${parseFloat(action.cost_estimate || 0).toFixed(4)}</span>
                        </div>
                      </div>

                      {/* Outcome */}
                      {action.output_summary && (
                        <div>
                          <div className="text-xs text-gray-500 uppercase mb-1">Output</div>
                          <div className="text-sm text-gray-300 bg-black/20 p-2 rounded">{action.output_summary}</div>
                        </div>
                      )}

                      {action.error_message && (
                        <div>
                          <div className="text-xs text-gray-500 uppercase mb-1">Error</div>
                          <div className="text-sm text-red-400 bg-red-900/20 p-2 rounded">{action.error_message}</div>
                        </div>
                      )}

                      {/* Side Effects & Artifacts */}
                      {sideEffects.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 uppercase mb-1">Side Effects ({sideEffects.length})</div>
                          <div className="flex flex-wrap gap-1">
                            {sideEffects.map((se, i) => (
                              <span key={i} className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-300">{se}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {artifacts.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 uppercase mb-1">Artifacts ({artifacts.length})</div>
                          <div className="flex flex-wrap gap-1">
                            {artifacts.map((a, i) => (
                              <span key={i} className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-300">{a}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Open Loops & Assumptions from detail fetch */}
                      {detail && (
                        <>
                          {detail.open_loops?.length > 0 && (
                            <div>
                              <div className="text-xs text-gray-500 uppercase mb-1">Open Loops ({detail.open_loops.length})</div>
                              <div className="space-y-1">
                                {detail.open_loops.map(loop => (
                                  <div key={loop.loop_id} className="flex items-center space-x-2 text-sm">
                                    <span className={`w-2 h-2 rounded-full ${loop.status === 'open' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                                    <span className="text-gray-300">{loop.description}</span>
                                    <span className="text-xs text-gray-500">({loop.loop_type} · {loop.priority})</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {detail.assumptions?.length > 0 && (
                            <div>
                              <div className="text-xs text-gray-500 uppercase mb-1">Assumptions ({detail.assumptions.length})</div>
                              <div className="space-y-1">
                                {detail.assumptions.map(asm => (
                                  <div key={asm.assumption_id} className="flex items-center space-x-2 text-sm">
                                    <span>{asm.validated ? '✅' : asm.invalidated ? '❌' : '❓'}</span>
                                    <span className="text-gray-300">{asm.assumption}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Link to full detail */}
                      <div className="pt-2">
                        <Link
                          href={`/actions/${action.action_id}`}
                          className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
                        >
                          View full post-mortem →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
