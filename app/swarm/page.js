'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Zap, ShieldAlert, MessageSquare, ArrowRight,
  Filter, RefreshCw, BarChart3, Maximize2, Activity
} from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatCompact } from '../components/ui/Stat';
import { EmptyState } from '../components/ui/EmptyState';
import { useAgentFilter } from '../lib/AgentFilterContext';
import { isDemoMode } from '../lib/isDemoMode';

export default function SwarmIntelligencePage() {
  const router = useRouter();
  const { setAgentId: setGlobalAgentId } = useAgentFilter();
  const demo = isDemoMode();

  const [data, setData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const nodes = data.nodes;
  const links = data.links;

  const [agentContext, setAgentContext] = useState({
    loading: false,
    error: null,
    actions: [],
    pendingApprovals: [],
    messages: [],
    guard: [],
    workflows: [],
  });

  const [activityPulse, setActivityPulse] = useState({
    activeAgentId: null,
    activeLink: null,
    tick: 0,
  });

  const fetchGraph = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/swarm/graph');
      if (!res.ok) throw new Error('Failed to load swarm data');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Give the graph some "life" (safe: purely visual). In demo we always animate; in real mode we only animate if there is data.
  useEffect(() => {
    if (!nodes.length) return;
    if (!demo && nodes.length < 2) return;

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const interval = setInterval(() => {
      const node = pick(nodes);
      const link = links?.length ? pick(links) : null;
      setActivityPulse((prev) => ({
        activeAgentId: node?.id || null,
        activeLink: link ? { source: link.source, target: link.target } : null,
        tick: prev.tick + 1,
      }));
    }, demo ? 1800 : 3000);

    return () => clearInterval(interval);
  }, [nodes, links, demo]);

  const getAgentDetails = (agentId) => {
    return nodes.find(n => n.id === agentId);
  };

  const formatTime = (ts) => {
    if (!ts) return '--';
    try {
      return new Date(ts).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return ts;
    }
  };

  // Deterministic "role" label for extra flavor without schema changes.
  const getRoleLabel = (agentId) => {
    const roles = ['Ops', 'Research', 'Security', 'Growth', 'Content', 'QA', 'Support', 'Data'];
    const s = String(agentId || '');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return roles[h % roles.length];
  };

  const selectedPartners = useMemo(() => {
    if (!selectedAgent?.id) return [];
    const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const partners = links
      .filter(l => l.source === selectedAgent.id || l.target === selectedAgent.id)
      .map((link) => {
        const partnerId = link.source === selectedAgent.id ? link.target : link.source;
        const partner = nodeById[partnerId];
        return {
          partnerId,
          partnerName: partner?.name || partnerId,
          weight: link.weight,
        };
      })
      .sort((a, b) => b.weight - a.weight);
    return partners;
  }, [links, nodes, selectedAgent?.id]);

  // Load "Agent Context" from existing read-only APIs (works in both real + demo).
  useEffect(() => {
    if (!selectedAgent?.id) return;
    const agentId = selectedAgent.id;

    const ctrl = new AbortController();
    const load = async () => {
      setAgentContext((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const qs = (extra = '') => `/api/actions?agent_id=${encodeURIComponent(agentId)}&limit=6${extra}`;
        const qsMsgs = `/api/messages?agent_id=${encodeURIComponent(agentId)}&limit=6`;
        const qsGuard = `/api/guard?agent_id=${encodeURIComponent(agentId)}&limit=6`;
        const qsWorkflows = `/api/workflows?agent_id=${encodeURIComponent(agentId)}&limit=6`;
        const qsApprovals = `/api/actions?agent_id=${encodeURIComponent(agentId)}&status=pending_approval&limit=6`;

        const [actionsRes, approvalsRes, msgsRes, guardRes, wfRes] = await Promise.all([
          fetch(qs(), { signal: ctrl.signal }),
          fetch(qsApprovals, { signal: ctrl.signal }),
          fetch(qsMsgs, { signal: ctrl.signal }),
          fetch(qsGuard, { signal: ctrl.signal }),
          fetch(qsWorkflows, { signal: ctrl.signal }),
        ]);

        const safeJson = async (res) => {
          try { return await res.json(); } catch { return null; }
        };

        const [actionsJson, approvalsJson, msgsJson, guardJson, wfJson] = await Promise.all([
          safeJson(actionsRes),
          safeJson(approvalsRes),
          safeJson(msgsRes),
          safeJson(guardRes),
          safeJson(wfRes),
        ]);

        setAgentContext({
          loading: false,
          error: null,
          actions: actionsJson?.actions || [],
          pendingApprovals: approvalsJson?.actions || [],
          messages: msgsJson?.messages || [],
          guard: guardJson?.decisions || guardJson?.guard_decisions || [],
          workflows: wfJson?.workflows || wfJson?.items || [],
        });
      } catch (e) {
        if (e?.name === 'AbortError') return;
        setAgentContext((prev) => ({
          ...prev,
          loading: false,
          error: 'Failed to load agent context',
        }));
      }
    };

    void load();
    return () => ctrl.abort();
  }, [selectedAgent?.id]);

  // Simple Circle Layout for the graph (since we want zero-dep visualization)
  const renderGraph = () => {
    if (nodes.length === 0) return <EmptyState icon={Users} title="No agents found" description="Connect agents to see the swarm map." />;

    const width = 800;
    const height = 600;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    // Position nodes in a circle
    const positionedNodes = nodes.map((node, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI;
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });

    const nodeMap = Object.fromEntries(positionedNodes.map(n => [n.id, n]));

    const activeLink = activityPulse.activeLink;
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full bg-[#0a0a0a] rounded-xl overflow-hidden cursor-crosshair">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="15" refY="3.5" orientation="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.1)" />
          </marker>
        </defs>

        {/* Links */}
        {links.map((link, i) => {
          const s = nodeMap[link.source];
          const t = nodeMap[link.target];
          if (!s || !t) return null;
          
          const isHighlighted = (hoveredNode && (link.source === hoveredNode || link.target === hoveredNode));
          const isActive = activeLink && activeLink.source === link.source && activeLink.target === link.target;
          const midX = (s.x + t.x) / 2;
          const midY = (s.y + t.y) / 2;
          
          return (
            <g key={`link-${i}`}>
              <line
                x1={s.x} y1={s.y}
                x2={t.x} y2={t.y}
                stroke={isActive ? 'rgba(249, 115, 22, 0.35)' : isHighlighted ? 'rgba(249, 115, 22, 0.4)' : 'rgba(255,255,255,0.05)'}
                strokeWidth={Math.min(6, 1 + link.weight / 5) + (isActive ? 0.5 : 0)}
                markerEnd="url(#arrowhead)"
              />
              {isActive && (
                <circle
                  cx={midX}
                  cy={midY}
                  r="3"
                  fill="rgba(249, 115, 22, 0.85)"
                  className="animate-pulse"
                />
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {positionedNodes.map((node) => {
          const isSelected = selectedAgent?.id === node.id;
          const isHovered = hoveredNode === node.id;
          const isPulsing = activityPulse.activeAgentId === node.id && !isSelected;
          const riskColor = node.risk > 70 ? '#ef4444' : node.risk > 40 ? '#eab308' : '#22c55e';

          return (
            <g 
              key={node.id} 
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => setSelectedAgent(node)}
              className="transition-all duration-200 cursor-pointer"
            >
              {isPulsing && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={18}
                  fill="transparent"
                  stroke="rgba(249, 115, 22, 0.12)"
                  strokeWidth="2"
                  className="animate-pulse"
                />
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r={isSelected ? 14 : isHovered ? 12 : 8}
                fill="#111"
                stroke={isSelected ? '#f97316' : riskColor}
                strokeWidth={isSelected ? 3 : 2}
              />
              {(isHovered || isSelected || nodes.length < 15) && (
                <text
                  x={node.x}
                  y={node.y + 20}
                  textAnchor="middle"
                  fill={isSelected ? 'white' : '#71717a'}
                  fontSize="10"
                  className="font-medium pointer-events-none select-none"
                >
                  {node.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <PageLayout
      title="Swarm Intelligence"
      subtitle="Visualize multi-agent communication and operational risk"
      breadcrumbs={['Operations', 'Swarm']}
      actions={
        <button onClick={fetchGraph} className="p-2 text-zinc-400 hover:text-white transition-colors">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Stats & Map */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Swarm Map */}
          <Card className="relative overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[rgba(255,255,255,0.04)] py-3">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-brand" />
                <span className="text-sm font-semibold">Swarm Communication Map</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="default">{data.total_agents} Agents</Badge>
                <Badge variant="outline">{data.total_links} Links</Badge>
                {demo && <Badge variant="outline">Demo: simulated activity</Badge>}
              </div>
            </CardHeader>
            <CardContent className="p-0 h-[600px] bg-[#0a0a0a]">
              {loading ? (
                <div className="flex items-center justify-center h-full text-sm text-zinc-500">
                  Analyzing swarm telemetry...
                </div>
              ) : (
                renderGraph()
              )}
              
              {/* Legend Overlay */}
              <div className="absolute bottom-4 left-4 p-3 rounded-lg bg-black/40 backdrop-blur-md border border-[rgba(255,255,255,0.06)] text-[10px] text-zinc-500 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#ef4444]" /> High Risk
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#eab308]" /> Moderate Risk
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#22c55e]" /> Low Risk
                </div>
                <div className="mt-2 pt-2 border-t border-white/5 opacity-60">
                  Click a node to drill down
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Swarm Health Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <StatCompact label="Active Swarms" value="1" color="text-white" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <StatCompact label="Swarm Latency" value="12ms" color="text-brand" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <StatCompact label="Safety Overhead" value="4.2%" color="text-blue-400" />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Agent Detail Panel */}
        <div className="space-y-6">
          <Card className="h-full">
            <CardHeader className="border-b border-[rgba(255,255,255,0.04)] py-4">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-zinc-400" />
                <span className="text-sm font-semibold">Agent Context</span>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {selectedAgent ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">{selectedAgent.name}</h3>
                    <code className="text-[10px] text-zinc-500 font-mono">{selectedAgent.id}</code>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" size="xs">{getRoleLabel(selectedAgent.id)}</Badge>
                      <Badge variant="outline" size="xs">Swarm: {data.swarm_id || 'all'}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-surface-tertiary border border-white/5">
                      <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Actions</div>
                      <div className="text-xl font-mono text-white">{selectedAgent.actions}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-tertiary border border-white/5">
                      <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Risk</div>
                      <div className={`text-xl font-mono ${selectedAgent.risk > 70 ? 'text-red-400' : 'text-green-400'}`}>
                        {selectedAgent.risk.toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Communication Partners</h4>
                    <div className="space-y-2">
                      {selectedPartners.slice(0, 5).map((p, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedAgent(getAgentDetails(p.partnerId) || { id: p.partnerId, name: p.partnerName, actions: 0, risk: 0 })}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors group text-left"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                            <span className="text-xs text-zinc-300">{p.partnerName}</span>
                          </div>
                          <span className="text-[10px] text-zinc-600 font-mono">{p.weight} msg</span>
                        </button>
                      ))}
                      {selectedPartners.length === 0 && (
                        <div className="text-xs text-zinc-600">No observed inter-agent messaging yet.</div>
                      )}
                    </div>
                  </div>

                  {/* Live-ish context */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Recent Activity</h4>
                      {agentContext.loading && (
                        <span className="text-[10px] text-zinc-600">Loading…</span>
                      )}
                    </div>

                    {agentContext.error && (
                      <div className="text-xs text-red-400">{agentContext.error}</div>
                    )}

                    <div className="space-y-2">
                      <div className="p-3 rounded-lg bg-surface-tertiary border border-white/5">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Recent Actions</div>
                        {agentContext.actions.slice(0, 4).map((a) => (
                          <div key={a.action_id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-b-0">
                            <div className="min-w-0">
                              <div className="text-xs text-zinc-300 truncate">{a.action_type || 'action'} <span className="text-zinc-600">·</span> {a.status || 'running'}</div>
                              <div className="text-[10px] text-zinc-600 font-mono">{formatTime(a.timestamp_start || a.created_at)}</div>
                            </div>
                            <div className="text-[10px] font-mono text-zinc-500">{(a.risk_score ?? a.risk ?? 0).toString()}%</div>
                          </div>
                        ))}
                        {agentContext.actions.length === 0 && (
                          <div className="text-xs text-zinc-600">No actions yet.</div>
                        )}
                      </div>

                      <div className="p-3 rounded-lg bg-surface-tertiary border border-white/5">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Pending Approvals</div>
                        {agentContext.pendingApprovals.slice(0, 3).map((a) => (
                          <div key={a.action_id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-b-0">
                            <div className="text-xs text-zinc-300 truncate">{a.action_type || 'action'}</div>
                            <span className="text-[10px] text-amber-300 font-mono">needs approval</span>
                          </div>
                        ))}
                        {agentContext.pendingApprovals.length === 0 && (
                          <div className="text-xs text-zinc-600">None.</div>
                        )}
                      </div>

                      <div className="p-3 rounded-lg bg-surface-tertiary border border-white/5">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Recent Messages</div>
                        {agentContext.messages.slice(0, 4).map((m) => (
                          <div key={m.id} className="py-1.5 border-b border-white/5 last:border-b-0">
                            <div className="text-xs text-zinc-300 truncate">{m.subject || '(no subject)'}</div>
                            <div className="text-[10px] text-zinc-600 font-mono">
                              {(m.from_agent_id || 'unknown')} → {(m.to_agent_id || 'broadcast')} · {formatTime(m.created_at)}
                            </div>
                          </div>
                        ))}
                        {agentContext.messages.length === 0 && (
                          <div className="text-xs text-zinc-600">No messages yet.</div>
                        )}
                      </div>

                      <div className="p-3 rounded-lg bg-surface-tertiary border border-white/5">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Guard Decisions</div>
                        {agentContext.guard.slice(0, 4).map((g, idx) => (
                          <div key={g.id || `${g.created_at}-${idx}`} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-b-0">
                            <div className="text-xs text-zinc-300 truncate">{g.policy_name || g.rule_name || 'Guard policy'}</div>
                            <span className={`text-[10px] font-mono ${g.decision === 'block' ? 'text-red-400' : g.decision === 'require_approval' ? 'text-amber-300' : g.decision === 'warn' ? 'text-yellow-300' : 'text-green-400'}`}>
                              {g.decision || 'allow'}
                            </span>
                          </div>
                        ))}
                        {agentContext.guard.length === 0 && (
                          <div className="text-xs text-zinc-600">No guard decisions yet.</div>
                        )}
                      </div>

                      <div className="p-3 rounded-lg bg-surface-tertiary border border-white/5">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Workflows</div>
                        {agentContext.workflows.slice(0, 3).map((w, idx) => (
                          <div key={w.id || w.workflow_id || `${w.name}-${idx}`} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-b-0">
                            <div className="text-xs text-zinc-300 truncate">{w.name || w.title || 'Workflow'}</div>
                            <span className="text-[10px] text-zinc-600 font-mono">{w.status || w.schedule || ''}</span>
                          </div>
                        ))}
                        {agentContext.workflows.length === 0 && (
                          <div className="text-xs text-zinc-600">No workflows.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <button
                      onClick={() => {
                        setGlobalAgentId?.(selectedAgent.id);
                        router.push('/workspace');
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-brand rounded-lg text-xs font-bold text-white hover:bg-brand-hover transition-colors"
                    >
                      Open Agent Workspace <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <Users size={32} className="mx-auto text-zinc-800 mb-4" />
                  <p className="text-xs text-zinc-500">Select an agent on the map to see its context within the swarm.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </PageLayout>
  );
}
