'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ActionPostMortem() {
  const params = useParams();
  const actionId = params.actionId;

  const [action, setAction] = useState(null);
  const [loops, setLoops] = useState([]);
  const [assumptions, setAssumptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAction() {
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
      } catch (err) {
        console.error('Failed to fetch action:', err);
        setError('Failed to load action details');
      } finally {
        setLoading(false);
      }
    }
    if (actionId) fetchAction();
  }, [actionId]);

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

          {/* Assumptions */}
          {assumptions.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                <span className="mr-2">🤔</span>Assumptions ({assumptions.length})
              </h2>
              <div className="space-y-3">
                {assumptions.map(asm => (
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
                        <div className="text-xs text-gray-500 mt-1">{formatTime(asm.created_at)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Open Loops */}
          {loops.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                <span className="mr-2">🔄</span>Open Loops ({loops.length})
              </h2>
              {openLoops.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm text-yellow-400 mb-2 font-semibold">Open ({openLoops.length})</div>
                  <div className="space-y-2">
                    {openLoops.map(loop => (
                      <div key={loop.loop_id} className="glass-card p-3 border-l-2 border-yellow-500">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-white">{loop.description}</div>
                          <span className="text-xs text-yellow-400 font-bold">{loop.priority}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{loop.loop_type} · {formatTime(loop.created_at)}</div>
                      </div>
                    ))}
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
                        <div className="text-xs text-gray-400 mt-1">{loop.loop_type} · Resolved {formatTime(loop.resolved_at)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: Timeline */}
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
