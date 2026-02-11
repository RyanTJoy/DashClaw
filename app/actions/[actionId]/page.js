'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CheckCircle2, XCircle, Clock, Zap, Target, BarChart3, HelpCircle,
  RefreshCw, MapPin, Microscope, IdCard, Rocket, Search, ArrowUp,
  Link2, AlertTriangle
} from 'lucide-react';
import PageLayout from '../../components/PageLayout';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Stat } from '../../components/ui/Stat';
import AssumptionGraph from '../../components/AssumptionGraph';

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

  const getStatusVariant = (status) => {
    const map = {
      completed: 'success', running: 'warning', failed: 'error',
      cancelled: 'default', pending: 'info'
    };
    return map[status] || 'default';
  };

  const getStatusBgColor = (status) => {
    const colors = {
      completed: 'bg-green-500', running: 'bg-yellow-500', failed: 'bg-red-500',
      cancelled: 'bg-zinc-500', pending: 'bg-blue-500'
    };
    return colors[status] || 'bg-zinc-500';
  };

  const StatusIcon = ({ status, size = 20 }) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={size} className="text-green-400" />;
      case 'failed': return <XCircle size={size} className="text-red-400" />;
      case 'running': return <Clock size={size} className="text-yellow-400" />;
      default: return <Zap size={size} className="text-blue-400" />;
    }
  };

  const getRiskColor = (score) => {
    const s = parseInt(score, 10);
    if (s >= 70) return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (s >= 40) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-green-400 bg-green-500/10 border-green-500/20';
  };

  const TimelineIcon = ({ type, status }) => {
    switch (type) {
      case 'start': return <Rocket size={14} className="text-blue-400" />;
      case 'end':
        return status === 'completed'
          ? <CheckCircle2 size={14} className="text-green-400" />
          : <XCircle size={14} className="text-red-400" />;
      case 'assumption':
        return <HelpCircle size={14} className="text-amber-400" />;
      case 'loop_open':
        return <RefreshCw size={14} className="text-yellow-400" />;
      case 'loop_resolved':
        return <CheckCircle2 size={14} className="text-green-400" />;
      default:
        return <Clock size={14} className="text-zinc-400" />;
    }
  };

  if (loading) {
    return (
      <PageLayout
        title="Loading..."
        breadcrumbs={['Dashboard', 'Actions']}
      >
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-zinc-500">Loading action details...</div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout
        title="Action Not Found"
        breadcrumbs={['Dashboard', 'Actions', actionId]}
      >
        <Card hover={false} className="max-w-md mx-auto mt-12">
          <CardContent className="pt-5 text-center">
            <Search size={32} className="text-zinc-600 mx-auto mb-3" />
            <div className="text-lg font-medium text-white mb-2">{error}</div>
            <div className="text-sm text-zinc-500">Action ID: {actionId}</div>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const systems = parseJsonArray(action.systems_touched);
  const sideEffects = parseJsonArray(action.side_effects);
  const artifacts = parseJsonArray(action.artifacts_created);
  const openLoops = loops.filter(l => l.status === 'open');
  const resolvedLoops = loops.filter(l => l.status !== 'open');

  // Build timeline events
  const timeline = [];
  timeline.push({ time: action.timestamp_start, label: 'Action started', type: 'start' });

  for (const asm of assumptions) {
    timeline.push({
      time: asm.created_at,
      label: `Assumption: ${asm.assumption}`,
      type: 'assumption',
      validated: asm.validated,
      invalidated: asm.invalidated
    });
  }

  for (const loop of loops) {
    timeline.push({ time: loop.created_at, label: `Loop opened: ${loop.description}`, type: 'loop_open' });
    if (loop.resolved_at) {
      timeline.push({ time: loop.resolved_at, label: `Loop resolved: ${loop.resolution || loop.description}`, type: 'loop_resolved' });
    }
  }

  if (action.timestamp_end) {
    timeline.push({
      time: action.timestamp_end,
      label: `Action ${action.status}`,
      type: 'end',
      status: action.status
    });
  }

  timeline.sort((a, b) => new Date(a.time) - new Date(b.time));

  return (
    <PageLayout
      title={action.declared_goal}
      subtitle={`${action.agent_name || action.agent_id} -- ${formatTime(action.timestamp_start)}`}
      breadcrumbs={['Dashboard', 'Actions', action.action_id]}
      actions={
        <Badge variant={getStatusVariant(action.status)}>
          {action.status}
        </Badge>
      }
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card hover={false} className={`border ${getRiskColor(action.risk_score)}`}>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-semibold tabular-nums">{action.risk_score || 0}</div>
            <div className="text-xs text-zinc-500">Risk Score</div>
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-semibold tabular-nums text-white">{action.confidence || 50}%</div>
            <div className="text-xs text-zinc-500">Confidence</div>
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-4 pb-4 text-center">
            <div className={`text-2xl font-semibold tabular-nums ${action.reversible ? 'text-green-400' : 'text-red-400'}`}>
              {action.reversible ? 'Yes' : 'No'}
            </div>
            <div className="text-xs text-zinc-500">Reversible</div>
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-semibold tabular-nums text-white">
              {action.duration_ms ? `${(action.duration_ms / 1000).toFixed(1)}s` : '--'}
            </div>
            <div className="text-xs text-zinc-500">Duration</div>
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-semibold tabular-nums text-purple-400">${parseFloat(action.cost_estimate || 0).toFixed(4)}</div>
            <div className="text-xs text-zinc-500">Cost</div>
          </CardContent>
        </Card>
      </div>

      {/* Trace Graph Visualization */}
      {trace && (
        <AssumptionGraph
          trace={trace}
          currentActionId={actionId}
          onNodeClick={({ type, id, actionId: nodeActionId }) => {
            if (type === 'assumption') {
              const el = document.getElementById(`assumption-${id}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (type === 'loop') {
              const el = document.getElementById(`loop-${id}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if ((type === 'action' || type === 'related') && nodeActionId && nodeActionId !== actionId) {
              window.open(`/actions/${nodeActionId}`, '_blank');
            }
          }}
        />
      )}

      {/* Root Cause Trace (for failed/completed with indicators) */}
      {trace && trace.root_cause_indicators && trace.root_cause_indicators.length > 0 && (
        <Card hover={false} className="mb-8 border border-red-500/30">
          <CardHeader title="Root Cause Analysis" icon={Microscope} />
          <CardContent>
            <div className="space-y-3">
              {trace.root_cause_indicators.map((indicator, idx) => (
                <div key={idx} className={`p-4 rounded border-l-4 ${
                  indicator.severity === 'high' ? 'border-red-500 bg-red-500/10' : 'border-amber-500 bg-amber-500/10'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-white font-semibold text-sm flex items-center gap-2">
                      {indicator.type === 'invalidated_assumptions' && <><XCircle size={14} className="text-red-400" /> Invalidated Assumptions</>}
                      {indicator.type === 'unresolved_loops' && <><RefreshCw size={14} className="text-yellow-400" /> Unresolved Loops</>}
                      {indicator.type === 'parent_failures' && <><ArrowUp size={14} className="text-amber-400" /> Parent Failures</>}
                      {indicator.type === 'related_failures' && <><Link2 size={14} className="text-amber-400" /> Related Failures</>}
                    </div>
                    <Badge variant={indicator.severity === 'high' ? 'error' : 'warning'} size="xs">
                      {indicator.severity.toUpperCase()} ({indicator.count})
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {indicator.detail.slice(0, 5).map((item, i) => (
                      <div key={i} className="text-xs text-zinc-300">
                        {item.assumption && `"${item.assumption}" -- ${item.reason || 'no reason'}`}
                        {item.description && `${item.description} (${item.priority})`}
                        {item.goal && (
                          <Link href={`/actions/${item.action_id}`} className="text-brand hover:underline">
                            {item.goal} {item.error ? `-- ${item.error}` : ''}
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
                <div className="text-sm text-zinc-400 font-semibold mb-2">Parent Chain</div>
                <div className="space-y-1">
                  {trace.parent_chain.map((parent, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-xs">
                      <span className="text-zinc-500">{'->'.repeat(idx + 1)}</span>
                      <Link href={`/actions/${parent.action_id}`} className="text-brand hover:underline">
                        {parent.declared_goal}
                      </Link>
                      <Badge variant={getStatusVariant(parent.status)} size="xs">
                        {parent.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Actions */}
            {trace.related_actions && trace.related_actions.length > 0 && (
              <div className="mt-4">
                <div className="text-sm text-zinc-400 font-semibold mb-2">Related Actions (same systems/agent, same timeframe)</div>
                <div className="space-y-1">
                  {trace.related_actions.slice(0, 5).map((rel, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-xs">
                      <Link href={`/actions/${rel.action_id}`} className="text-brand hover:underline">
                        {rel.declared_goal}
                      </Link>
                      <Badge variant={getStatusVariant(rel.status)} size="xs">
                        {rel.status}
                      </Badge>
                      <span className="text-zinc-500">{rel.agent_name || rel.agent_id}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Intent */}
          <Card hover={false}>
            <CardHeader title="Intent" icon={Target} />
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-zinc-500 uppercase mb-1">Goal</div>
                  <div className="text-sm text-zinc-200">{action.declared_goal}</div>
                </div>
                {action.reasoning && (
                  <div>
                    <div className="text-xs text-zinc-500 uppercase mb-1">Reasoning</div>
                    <div className="text-sm text-zinc-300">{action.reasoning}</div>
                  </div>
                )}
                {action.authorization_scope && (
                  <div>
                    <div className="text-xs text-zinc-500 uppercase mb-1">Authorization Scope</div>
                    <div className="text-sm text-zinc-300">{action.authorization_scope}</div>
                  </div>
                )}
                {action.trigger && (
                  <div>
                    <div className="text-xs text-zinc-500 uppercase mb-1">Trigger</div>
                    <div className="text-sm text-zinc-300">{action.trigger}</div>
                  </div>
                )}
                {action.input_summary && (
                  <div>
                    <div className="text-xs text-zinc-500 uppercase mb-1">Input Summary</div>
                    <div className="text-sm text-zinc-300 bg-surface-tertiary p-3 rounded-lg">{action.input_summary}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Outcome */}
          <Card hover={false}>
            <CardHeader title="Outcome" icon={BarChart3} />
            <CardContent>
              <div className="space-y-4">
                {action.output_summary && (
                  <div>
                    <div className="text-xs text-zinc-500 uppercase mb-1">Output</div>
                    <div className="text-sm text-zinc-300 bg-surface-tertiary p-3 rounded-lg">{action.output_summary}</div>
                  </div>
                )}
                {action.error_message && (
                  <div>
                    <div className="text-xs text-zinc-500 uppercase mb-1">Error</div>
                    <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">{action.error_message}</div>
                  </div>
                )}
                {sideEffects.length > 0 && (
                  <div>
                    <div className="text-xs text-zinc-500 uppercase mb-1">Side Effects ({sideEffects.length})</div>
                    <div className="space-y-1">
                      {sideEffects.map((se, i) => (
                        <div key={i} className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-300">
                          {se}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {artifacts.length > 0 && (
                  <div>
                    <div className="text-xs text-zinc-500 uppercase mb-1">Artifacts ({artifacts.length})</div>
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
                    <div className="text-xs text-zinc-500 uppercase mb-1">Systems Touched</div>
                    <div className="flex flex-wrap gap-2">
                      {systems.map((s, i) => (
                        <span key={i} className="px-2 py-1 bg-zinc-500/10 border border-zinc-500/20 rounded text-xs text-zinc-300">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Interactive Assumptions */}
          {assumptions.length > 0 && (
            <Card hover={false}>
              <CardHeader title="Assumptions" icon={HelpCircle} count={assumptions.length} />
              <CardContent>
                <div className="space-y-3">
                  {assumptions.map(asm => {
                    const isUnresolved = !asm.validated && !asm.invalidated;
                    const isPending = !!pendingOps[asm.assumption_id];
                    return (
                      <div key={asm.assumption_id} id={`assumption-${asm.assumption_id}`} className="bg-surface-tertiary rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <span className="mt-0.5">
                            {asm.validated
                              ? <CheckCircle2 size={18} className="text-green-400" />
                              : asm.invalidated
                                ? <XCircle size={18} className="text-red-400" />
                                : <HelpCircle size={18} className="text-amber-400" />
                            }
                          </span>
                          <div className="flex-1">
                            <div className="text-white text-sm font-medium">{asm.assumption}</div>
                            {asm.basis && (
                              <div className="text-xs text-zinc-500 mt-1">Basis: {asm.basis}</div>
                            )}
                            {asm.invalidated_reason && (
                              <div className="text-xs text-red-400 mt-1">Invalidated: {asm.invalidated_reason}</div>
                            )}
                            {asm.validated_at && (
                              <div className="text-xs text-green-400 mt-1">Validated: {formatTime(asm.validated_at)}</div>
                            )}
                            <div className="text-xs text-zinc-500 mt-1">{formatTime(asm.created_at)}</div>

                            {/* Action buttons for unresolved assumptions */}
                            {isUnresolved && (
                              <div className="mt-3 space-y-2">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleValidateAssumption(asm.assumption_id)}
                                    disabled={isPending}
                                    className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 disabled:opacity-50 text-green-400 text-xs rounded-lg font-medium transition-colors duration-150"
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
                                    className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 text-red-400 text-xs rounded-lg font-medium transition-colors duration-150"
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
                                      className="flex-1 px-2 py-1.5 bg-surface-tertiary border border-red-500/20 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-400"
                                    />
                                    <button
                                      onClick={() => handleInvalidateAssumption(asm.assumption_id)}
                                      disabled={!invalidateReasons[asm.assumption_id]?.trim() || isPending}
                                      className="px-2 py-1.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 text-red-400 text-xs rounded-lg transition-colors duration-150"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      onClick={() => setInvalidateReasons(prev => { const n = { ...prev }; delete n[asm.assumption_id]; return n; })}
                                      className="px-2 py-1.5 text-zinc-400 hover:text-white text-xs transition-colors"
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
              </CardContent>
            </Card>
          )}

          {/* Interactive Open Loops */}
          {loops.length > 0 && (
            <Card hover={false}>
              <CardHeader title="Open Loops" icon={RefreshCw} count={loops.length} />
              <CardContent>
                {openLoops.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm text-yellow-400 mb-2 font-semibold">Open ({openLoops.length})</div>
                    <div className="space-y-2">
                      {openLoops.map(loop => {
                        const isPending = !!pendingOps[loop.loop_id];
                        return (
                          <div key={loop.loop_id} id={`loop-${loop.loop_id}`} className="bg-surface-tertiary rounded-lg p-3 border-l-2 border-yellow-500">
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-white">{loop.description}</div>
                              <Badge variant="warning" size="xs">{loop.priority}</Badge>
                            </div>
                            <div className="text-xs text-zinc-500 mt-1">{loop.loop_type} -- {formatTime(loop.created_at)}</div>

                            {/* Action buttons */}
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  placeholder="Resolution text..."
                                  value={resolveTexts[loop.loop_id] || ''}
                                  onChange={(e) => setResolveTexts(prev => ({ ...prev, [loop.loop_id]: e.target.value }))}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleResolveLoop(loop.loop_id); }}
                                  className="flex-1 px-2 py-1.5 bg-surface-tertiary border border-green-500/20 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-green-400"
                                />
                                <button
                                  onClick={() => handleResolveLoop(loop.loop_id)}
                                  disabled={!resolveTexts[loop.loop_id]?.trim() || isPending}
                                  className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 disabled:opacity-50 text-green-400 text-xs rounded-lg font-medium transition-colors duration-150"
                                >
                                  {pendingOps[loop.loop_id] === 'resolving' ? 'Resolving...' : 'Resolve'}
                                </button>
                                <button
                                  onClick={() => handleCancelLoop(loop.loop_id)}
                                  disabled={isPending}
                                  className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white bg-surface-tertiary border border-[rgba(255,255,255,0.06)] rounded-lg hover:border-[rgba(255,255,255,0.12)] transition-colors duration-150 text-xs font-medium"
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
                        <div key={loop.loop_id} id={`loop-${loop.loop_id}`} className="bg-surface-tertiary rounded-lg p-3 border-l-2 border-green-500 opacity-70">
                          <div className="text-sm text-white">{loop.description}</div>
                          {loop.resolution && (
                            <div className="text-xs text-green-400 mt-1">Resolution: {loop.resolution}</div>
                          )}
                          <div className="text-xs text-zinc-500 mt-1">{loop.loop_type} -- {loop.status === 'cancelled' ? 'Cancelled' : 'Resolved'} {formatTime(loop.resolved_at)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Timeline + Identity */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card hover={false}>
            <CardHeader title="Timeline" icon={MapPin} />
            <CardContent>
              <div className="relative">
                <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-zinc-700/50" />
                <div className="space-y-4">
                  {timeline.map((event, idx) => (
                    <div key={idx} className="relative flex items-start space-x-3 pl-0">
                      <div className="relative z-10 w-6 h-6 flex items-center justify-center bg-surface-secondary rounded-full">
                        <TimelineIcon type={event.type} status={event.status} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-zinc-300">{event.label}</div>
                        <div className="text-xs text-zinc-500">{formatTime(event.time)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trace Summary (compact) */}
          {trace && (
            <Card hover={false}>
              <CardHeader title="Trace Summary" icon={Microscope} />
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-center text-xs">
                  <div className="bg-surface-tertiary rounded-lg p-3">
                    <div className="font-semibold text-white text-lg tabular-nums">{trace.assumptions.total}</div>
                    <div className="text-zinc-500">Assumptions</div>
                    <div className="mt-1 space-x-1">
                      {trace.assumptions.validated > 0 && <span className="text-green-400">{trace.assumptions.validated}v</span>}
                      {trace.assumptions.invalidated > 0 && <span className="text-red-400">{trace.assumptions.invalidated}i</span>}
                      {trace.assumptions.unvalidated > 0 && <span className="text-yellow-400">{trace.assumptions.unvalidated}?</span>}
                    </div>
                  </div>
                  <div className="bg-surface-tertiary rounded-lg p-3">
                    <div className="font-semibold text-white text-lg tabular-nums">{trace.loops.total}</div>
                    <div className="text-zinc-500">Loops</div>
                    <div className="mt-1 space-x-1">
                      {trace.loops.open > 0 && <span className="text-yellow-400">{trace.loops.open} open</span>}
                      {trace.loops.resolved > 0 && <span className="text-green-400">{trace.loops.resolved} done</span>}
                    </div>
                  </div>
                  <div className="bg-surface-tertiary rounded-lg p-3">
                    <div className="font-semibold text-white text-lg tabular-nums">{trace.parent_chain.length}</div>
                    <div className="text-zinc-500">Parents</div>
                  </div>
                  <div className="bg-surface-tertiary rounded-lg p-3">
                    <div className="font-semibold text-white text-lg tabular-nums">{trace.related_actions.length}</div>
                    <div className="text-zinc-500">Related</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Identity Card */}
          <Card hover={false}>
            <CardHeader title="Identity" icon={IdCard} />
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs text-zinc-500 uppercase">Action ID</div>
                  <div className="text-zinc-300 font-mono text-xs break-all">{action.action_id}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 uppercase">Agent</div>
                  <div className="text-sm text-zinc-300">{action.agent_name || '--'} ({action.agent_id})</div>
                </div>
                {action.swarm_id && (
                  <div>
                    <div className="text-xs text-zinc-500 uppercase">Swarm</div>
                    <div className="text-zinc-300 font-mono text-xs">{action.swarm_id}</div>
                  </div>
                )}
                {action.parent_action_id && (
                  <div>
                    <div className="text-xs text-zinc-500 uppercase">Parent Action</div>
                    <Link href={`/actions/${action.parent_action_id}`} className="text-brand hover:text-brand/80 font-mono text-xs">
                      {action.parent_action_id}
                    </Link>
                  </div>
                )}
                <div>
                  <div className="text-xs text-zinc-500 uppercase">Type</div>
                  <div className="text-sm text-zinc-300">{action.action_type}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 uppercase">Started</div>
                  <div className="text-sm text-zinc-300">{formatTime(action.timestamp_start)}</div>
                </div>
                {action.timestamp_end && (
                  <div>
                    <div className="text-xs text-zinc-500 uppercase">Ended</div>
                    <div className="text-sm text-zinc-300">{formatTime(action.timestamp_end)}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
