'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ActionPostMortem() {
  const params = useParams();
  const actionId = params.actionId;

  const [action, setAction] = useState(null);
  const [loops, setLoops] = useState([]);
  const [assumptions, setAssumptions] = useState([]);
  const [trace, setTrace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingOps, setPendingOps] = useState({});
  const [invalidateReasons, setInvalidateReasons] = useState({});
  const [resolveTexts, setResolveTexts] = useState({});

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/actions/${actionId}`);
      if (!res.ok) {
        if (res.status === 404) { setError('Action not found'); return; }
        throw new Error('Failed to fetch');
      }
      const data = await res.json();
      setAction(data.action);
      setLoops(data.open_loops || []);
      setAssumptions(data.assumptions || []);

      // Fetch trace data for failed/completed actions
      if (data.action.status === 'failed' || data.action.status === 'completed') {
        try {
          const traceRes = await fetch(`/api/actions/${actionId}/trace`);
          if (traceRes.ok) {
            const traceData = await traceRes.json();
            setTrace(traceData.trace);
          }
        } catch { /* trace is optional */ }
      }
    } catch (err) {
      console.error('Failed to fetch action:', err);
      setError('Failed to load action details');
    } finally {
      setLoading(false);
    }
  }, [actionId]);

  useEffect(() => {
    if (actionId) fetchData();
  }, [actionId, fetchData]);

  // --- Assumption actions ---
  const handleValidateAssumption = async (assumptionId) => {
    setPendingOps(prev => ({ ...prev, [assumptionId]: 'validating' }));
    try {
      const res = await fetch(`/api/actions/assumptions/${assumptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validated: true })
      });
      if (res.ok) {
        const data = await res.json();
        setAssumptions(prev => prev.map(a => a.assumption_id === assumptionId ? data.assumption : a));
      }
    } catch (err) { console.error('Failed to validate assumption:', err); }
    setPendingOps(prev => { const n = { ...prev }; delete n[assumptionId]; return n; });
  };

  const handleInvalidateAssumption = async (assumptionId) => {
    const reason = invalidateReasons[assumptionId]?.trim();
    if (!reason) return;
    setPendingOps(prev => ({ ...prev, [assumptionId]: 'invalidating' }));
    try {
      const res = await fetch(`/api/actions/assumptions/${assumptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validated: false, invalidated_reason: reason })
      });
      if (res.ok) {
        const data = await res.json();
        setAssumptions(prev => prev.map(a => a.assumption_id === assumptionId ? data.assumption : a));
        setInvalidateReasons(prev => { const n = { ...prev }; delete n[assumptionId]; return n; });
      }
    } catch (err) { console.error('Failed to invalidate assumption:', err); }
    setPendingOps(prev => { const n = { ...prev }; delete n[assumptionId]; return n; });
  };

  // --- Loop actions ---
  const handleResolveLoop = async (loopId) => {
    const resolution = resolveTexts[loopId]?.trim();
    if (!resolution) return;
    setPendingOps(prev => ({ ...prev, [loopId]: 'resolving' }));
    try {
      const res = await fetch(`/api/actions/loops/${loopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved', resolution })
      });
      if (res.ok) {
        const data = await res.json();
        setLoops(prev => prev.map(l => l.loop_id === loopId ? data.loop : l));
        setResolveTexts(prev => { const n = { ...prev }; delete n[loopId]; return n; });
      }
    } catch (err) { console.error('Failed to resolve loop:', err); }
    setPendingOps(prev => { const n = { ...prev }; delete n[loopId]; return n; });
  };

  const handleCancelLoop = async (loopId) => {
    setPendingOps(prev => ({ ...prev, [loopId]: 'cancelling' }));
    try {
      const res = await fetch(`/api/actions/loops/${loopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      });
      if (res.ok) {
        const data = await res.json();
        setLoops(prev => prev.map(l => l.loop_id === loopId ? data.loop : l));
      }
    } catch (err) { console.error('Failed to cancel loop:', err); }
    setPendingOps(prev => { const n = { ...prev }; delete n[loopId]; return n; });
  };

  const parseJsonArray = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return []; }
    }
    return [];
  };

  const formatTime = (ts) => {
    if (!ts) return '--';
    try {
      return new Date(ts).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      });
    } catch { return ts; }
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: 'bg-green-500', running: 'bg-yellow-500', failed: 'bg-red-500',
      cancelled: 'bg-gray-500', pending: 'bg-blue-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getRiskColor = (score) => {
    const s = parseInt(score, 10);
    if (s >= 70) return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (s >= 40) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-green-400 bg-green-500/10 border-green-500/20';
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading action details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6">
        <nav className="mb-6">
          <Link href="/actions" className="text-gray-400 hover:text-white transition-colors">
            ← Back to Actions
          </Link>
        </nav>
        <div className="glass-card p-12 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <div className="text-xl text-white mb-2">{error}</div>
          <div className="text-gray-400">Action ID: {actionId}</div>
        </div>
      </div>
    );
  }

  const systems = parseJsonArray(action.systems_touched);
  const sideEffects = parseJsonArray(action.side_effects);
  const artifacts = parseJsonArray(action.artifacts_created);
  const openLoops = loops.filter(l => l.status === 'open');
  const resolvedLoops = loops.filter(l => l.status !== 'open');

  // Build timeline events
  const timeline = [];
  timeline.push({ time: action.timestamp_start, label: 'Action started', icon: '🚀', type: 'start' });

  for (const asm of assumptions) {
    timeline.push({ time: asm.created_at, label: `Assumption: ${asm.assumption}`, icon: asm.validated ? '✅' : asm.invalidated ? '❌' : '❓', type: 'assumption' });
  }

  for (const loop of loops) {
    timeline.push({ time: loop.created_at, label: `Loop opened: ${loop.description}`, icon: '🔄', type: 'loop_open' });
    if (loop.resolved_at) {
      timeline.push({ time: loop.resolved_at, label: `Loop resolved: ${loop.resolution || loop.description}`, icon: '✅', type: 'loop_resolved' });
    }
  }

  if (action.timestamp_end) {
    timeline.push({ time: action.timestamp_end, label: `Action ${action.status}`, icon: action.status === 'completed' ? '🏁' : '❌', type: 'end' });
  }

  timeline.sort((a, b) => new Date(a.time) - new Date(b.time));

  return (
    <div className="min-h-screen p-6">
      <nav className="mb-6">
        <Link href="/actions" className="text-gray-400 hover:text-white transition-colors">
          ← Back to Actions
        </Link>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className={`w-14 h-14 ${getStatusColor(action.status)} rounded-full flex items-center justify-center text-2xl`}>
              {action.status === 'completed' ? '✅' : action.status === 'failed' ? '❌' : action.status === 'running' ? '⏳' : '⚡'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{action.declared_goal}</h1>
              <div className="flex items-center space-x-3 mt-1 text-sm text-gray-400">
                <span>{action.agent_name || action.agent_id}</span>
                <span>·</span>
                <span>{action.action_type}</span>
                <span>·</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(action.status)} text-white`}>
                  {action.status}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1 font-mono">{action.action_id}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className={`glass-card p-4 text-center border ${getRiskColor(action.risk_score)}`}>
          <div className="text-3xl font-bold">{action.risk_score || 0}</div>
          <div className="text-xs opacity-70">Risk Score</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-white">{action.confidence || 50}%</div>
          <div className="text-xs text-gray-400">Confidence</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className={`text-3xl font-bold ${action.reversible ? 'text-green-400' : 'text-red-400'}`}>
            {action.reversible ? 'Yes' : 'No'}
          </div>
          <div className="text-xs text-gray-400">Reversible</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-white">
            {action.duration_ms ? `${(action.duration_ms / 1000).toFixed(1)}s` : '--'}
          </div>
          <div className="text-xs text-gray-400">Duration</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-purple-400">${parseFloat(action.cost_estimate || 0).toFixed(4)}</div>
          <div className="text-xs text-gray-400">Cost</div>
        </div>
      </div>

      {/* Root Cause Trace (for failed/completed with indicators) */}
      {trace && trace.root_cause_indicators && trace.root_cause_indicators.length > 0 && (
        <div className="glass-card p-6 mb-8 border border-red-500/30">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center">
            <span className="mr-2">🔬</span>Root Cause Analysis
          </h2>
          <div className="space-y-3">
            {trace.root_cause_indicators.map((indicator, idx) => (
              <div key={idx} className={`p-4 rounded border-l-4 ${
                indicator.severity === 'high' ? 'border-red-500 bg-red-500/10' : 'border-amber-500 bg-amber-500/10'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-white font-semibold text-sm">
                    {indicator.type === 'invalidated_assumptions' && '❌ Invalidated Assumptions'}
                    {indicator.type === 'unresolved_loops' && '🔄 Unresolved Loops'}
                    {indicator.type === 'parent_failures' && '⬆️ Parent Failures'}
                    {indicator.type === 'related_failures' && '🔗 Related Failures'}
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    indicator.severity === 'high' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    {indicator.severity.toUpperCase()} ({indicator.count})
                  </span>
                </div>
                <div className="space-y-1">
                  {indicator.detail.slice(0, 5).map((item, i) => (
                    <div key={i} className="text-xs text-gray-300">
                      {item.assumption && `"${item.assumption}" — ${item.reason || 'no reason'}`}
                      {item.description && `${item.description} (${item.priority})`}
                      {item.goal && (
                        <Link href={`/actions/${item.action_id}`} className="text-orange-400 hover:underline">
                          {item.goal} {item.error ? `— ${item.error}` : ''}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Parent Chain */}
          {trace.parent_chain && trace.parent_chain.length > 0 && (
            <div className="mt-4">
              <div className="text-sm text-gray-400 font-semibold mb-2">Parent Chain</div>
              <div className="space-y-1">
                {trace.parent_chain.map((parent, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-xs">
                    <span className="text-gray-500">{'→'.repeat(idx + 1)}</span>
                    <Link href={`/actions/${parent.action_id}`} className="text-orange-400 hover:underline">
                      {parent.declared_goal}
                    </Link>
                    <span className={`px-1.5 py-0.5 rounded text-white text-xs ${getStatusColor(parent.status)}`}>
                      {parent.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Actions */}
          {trace.related_actions && trace.related_actions.length > 0 && (
            <div className="mt-4">
              <div className="text-sm text-gray-400 font-semibold mb-2">Related Actions (same systems/agent, same timeframe)</div>
              <div className="space-y-1">
                {trace.related_actions.slice(0, 5).map((rel, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-xs">
                    <Link href={`/actions/${rel.action_id}`} className="text-orange-400 hover:underline">
                      {rel.declared_goal}
                    </Link>
                    <span className={`px-1.5 py-0.5 rounded text-white text-xs ${getStatusColor(rel.status)}`}>
                      {rel.status}
                    </span>
                    <span className="text-gray-500">{rel.agent_name || rel.agent_id}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Intent */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center">
              <span className="mr-2">🎯</span>Intent
            </h2>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-500 uppercase mb-1">Goal</div>
                <div className="text-gray-200">{action.declared_goal}</div>
              </div>
              {action.reasoning && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Reasoning</div>
                  <div className="text-gray-300 text-sm">{action.reasoning}</div>
                </div>
              )}
              {action.authorization_scope && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Authorization Scope</div>
                  <div className="text-gray-300 text-sm">{action.authorization_scope}</div>
                </div>
              )}
              {action.trigger && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Trigger</div>
                  <div className="text-gray-300 text-sm">{action.trigger}</div>
                </div>
              )}
              {action.input_summary && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Input Summary</div>
                  <div className="text-gray-300 text-sm bg-black/20 p-3 rounded">{action.input_summary}</div>
                </div>
              )}
            </div>
          </div>

          {/* Outcome */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center">
              <span className="mr-2">📊</span>Outcome
            </h2>
            <div className="space-y-4">
              {action.output_summary && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Output</div>
                  <div className="text-gray-300 text-sm bg-black/20 p-3 rounded">{action.output_summary}</div>
                </div>
              )}
              {action.error_message && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Error</div>
                  <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded">{action.error_message}</div>
                </div>
              )}
              {sideEffects.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Side Effects ({sideEffects.length})</div>
                  <div className="space-y-1">
                    {sideEffects.map((se, i) => (
                      <div key={i} className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded text-sm text-amber-300">
                        {se}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {artifacts.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Artifacts ({artifacts.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {artifacts.map((a, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-300 font-mono">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {systems.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Systems Touched</div>
                  <div className="flex flex-wrap gap-2">
                    {systems.map((s, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-500/10 border border-gray-500/20 rounded text-xs text-gray-300">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Assumptions */}
          {assumptions.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                <span className="mr-2">🤔</span>Assumptions ({assumptions.length})
              </h2>
              <div className="space-y-3">
                {assumptions.map(asm => {
                  const isUnresolved = !asm.validated && !asm.invalidated;
                  const isPending = !!pendingOps[asm.assumption_id];
                  return (
                    <div key={asm.assumption_id} className="glass-card p-4">
                      <div className="flex items-start space-x-3">
                        <span className="text-xl mt-0.5">
                          {asm.validated ? '✅' : asm.invalidated ? '❌' : '❓'}
                        </span>
                        <div className="flex-1">
                          <div className="text-white text-sm font-medium">{asm.assumption}</div>
                          {asm.basis && (
                            <div className="text-xs text-gray-400 mt-1">Basis: {asm.basis}</div>
                          )}
                          {asm.invalidated_reason && (
                            <div className="text-xs text-red-400 mt-1">Invalidated: {asm.invalidated_reason}</div>
                          )}
                          {asm.validated_at && (
                            <div className="text-xs text-green-400 mt-1">Validated: {formatTime(asm.validated_at)}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">{formatTime(asm.created_at)}</div>

                          {/* Action buttons for unresolved assumptions */}
                          {isUnresolved && (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleValidateAssumption(asm.assumption_id)}
                                  disabled={isPending}
                                  className="px-3 py-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs rounded font-semibold transition-colors"
                                >
                                  {pendingOps[asm.assumption_id] === 'validating' ? 'Validating...' : 'Validate'}
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = invalidateReasons[asm.assumption_id];
                                    if (reason) handleInvalidateAssumption(asm.assumption_id);
                                    else setInvalidateReasons(prev => ({ ...prev, [asm.assumption_id]: '' }));
                                  }}
                                  disabled={isPending}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs rounded font-semibold transition-colors"
                                >
                                  {pendingOps[asm.assumption_id] === 'invalidating' ? 'Invalidating...' : 'Invalidate'}
                                </button>
                              </div>
                              {invalidateReasons[asm.assumption_id] !== undefined && (
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    placeholder="Reason for invalidation..."
                                    value={invalidateReasons[asm.assumption_id] || ''}
                                    onChange={(e) => setInvalidateReasons(prev => ({ ...prev, [asm.assumption_id]: e.target.value }))}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleInvalidateAssumption(asm.assumption_id); }}
                                    className="flex-1 px-2 py-1 bg-black/30 border border-red-500/30 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-400"
                                  />
                                  <button
                                    onClick={() => handleInvalidateAssumption(asm.assumption_id)}
                                    disabled={!invalidateReasons[asm.assumption_id]?.trim() || isPending}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs rounded transition-colors"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setInvalidateReasons(prev => { const n = { ...prev }; delete n[asm.assumption_id]; return n; })}
                                    className="px-2 py-1 text-gray-400 hover:text-white text-xs transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interactive Open Loops */}
          {loops.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                <span className="mr-2">🔄</span>Open Loops ({loops.length})
              </h2>
              {openLoops.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm text-yellow-400 mb-2 font-semibold">Open ({openLoops.length})</div>
                  <div className="space-y-2">
                    {openLoops.map(loop => {
                      const isPending = !!pendingOps[loop.loop_id];
                      return (
                        <div key={loop.loop_id} className="glass-card p-3 border-l-2 border-yellow-500">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-white">{loop.description}</div>
                            <span className="text-xs text-yellow-400 font-bold">{loop.priority}</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{loop.loop_type} · {formatTime(loop.created_at)}</div>

                          {/* Action buttons */}
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                placeholder="Resolution text..."
                                value={resolveTexts[loop.loop_id] || ''}
                                onChange={(e) => setResolveTexts(prev => ({ ...prev, [loop.loop_id]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleResolveLoop(loop.loop_id); }}
                                className="flex-1 px-2 py-1 bg-black/30 border border-green-500/30 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
                              />
                              <button
                                onClick={() => handleResolveLoop(loop.loop_id)}
                                disabled={!resolveTexts[loop.loop_id]?.trim() || isPending}
                                className="px-3 py-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs rounded font-semibold transition-colors"
                              >
                                {pendingOps[loop.loop_id] === 'resolving' ? 'Resolving...' : 'Resolve'}
                              </button>
                              <button
                                onClick={() => handleCancelLoop(loop.loop_id)}
                                disabled={isPending}
                                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white text-xs rounded font-semibold transition-colors"
                              >
                                {pendingOps[loop.loop_id] === 'cancelling' ? 'Cancelling...' : 'Cancel'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {resolvedLoops.length > 0 && (
                <div>
                  <div className="text-sm text-green-400 mb-2 font-semibold">Resolved ({resolvedLoops.length})</div>
                  <div className="space-y-2">
                    {resolvedLoops.map(loop => (
                      <div key={loop.loop_id} className="glass-card p-3 border-l-2 border-green-500 opacity-70">
                        <div className="text-sm text-white">{loop.description}</div>
                        {loop.resolution && (
                          <div className="text-xs text-green-400 mt-1">Resolution: {loop.resolution}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">{loop.loop_type} · {loop.status === 'cancelled' ? 'Cancelled' : 'Resolved'} {formatTime(loop.resolved_at)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: Timeline + Identity */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center">
              <span className="mr-2">📍</span>Timeline
            </h2>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700" />
              <div className="space-y-4">
                {timeline.map((event, idx) => (
                  <div key={idx} className="relative flex items-start space-x-4 pl-2">
                    <div className="relative z-10 w-6 h-6 flex items-center justify-center bg-gray-900 rounded-full text-sm">
                      {event.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-300">{event.label}</div>
                      <div className="text-xs text-gray-500">{formatTime(event.time)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trace Summary (compact) */}
          {trace && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                <span className="mr-2">🔬</span>Trace Summary
              </h2>
              <div className="grid grid-cols-2 gap-3 text-center text-xs">
                <div className="glass-card p-3">
                  <div className="font-bold text-white text-lg">{trace.assumptions.total}</div>
                  <div className="text-gray-400">Assumptions</div>
                  <div className="mt-1 space-x-1">
                    {trace.assumptions.validated > 0 && <span className="text-green-400">{trace.assumptions.validated}v</span>}
                    {trace.assumptions.invalidated > 0 && <span className="text-red-400">{trace.assumptions.invalidated}i</span>}
                    {trace.assumptions.unvalidated > 0 && <span className="text-yellow-400">{trace.assumptions.unvalidated}?</span>}
                  </div>
                </div>
                <div className="glass-card p-3">
                  <div className="font-bold text-white text-lg">{trace.loops.total}</div>
                  <div className="text-gray-400">Loops</div>
                  <div className="mt-1 space-x-1">
                    {trace.loops.open > 0 && <span className="text-yellow-400">{trace.loops.open} open</span>}
                    {trace.loops.resolved > 0 && <span className="text-green-400">{trace.loops.resolved} done</span>}
                  </div>
                </div>
                <div className="glass-card p-3">
                  <div className="font-bold text-white text-lg">{trace.parent_chain.length}</div>
                  <div className="text-gray-400">Parents</div>
                </div>
                <div className="glass-card p-3">
                  <div className="font-bold text-white text-lg">{trace.related_actions.length}</div>
                  <div className="text-gray-400">Related</div>
                </div>
              </div>
            </div>
          )}

          {/* Identity Card */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center">
              <span className="mr-2">🪪</span>Identity
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-gray-500 uppercase">Action ID</div>
                <div className="text-gray-300 font-mono text-xs break-all">{action.action_id}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase">Agent</div>
                <div className="text-gray-300">{action.agent_name || '--'} ({action.agent_id})</div>
              </div>
              {action.swarm_id && (
                <div>
                  <div className="text-xs text-gray-500 uppercase">Swarm</div>
                  <div className="text-gray-300 font-mono text-xs">{action.swarm_id}</div>
                </div>
              )}
              {action.parent_action_id && (
                <div>
                  <div className="text-xs text-gray-500 uppercase">Parent Action</div>
                  <Link href={`/actions/${action.parent_action_id}`} className="text-orange-400 hover:text-orange-300 font-mono text-xs">
                    {action.parent_action_id}
                  </Link>
                </div>
              )}
              <div>
                <div className="text-xs text-gray-500 uppercase">Started</div>
                <div className="text-gray-300">{formatTime(action.timestamp_start)}</div>
              </div>
              {action.timestamp_end && (
                <div>
                  <div className="text-xs text-gray-500 uppercase">Ended</div>
                  <div className="text-gray-300">{formatTime(action.timestamp_end)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
