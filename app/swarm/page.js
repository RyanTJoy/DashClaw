'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Zap, ShieldAlert, MessageSquare, ArrowRight,
  Filter, RefreshCw, BarChart3, Maximize2, Activity, Terminal
} from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatCompact } from '../components/ui/Stat';
import { EmptyState } from '../components/ui/EmptyState';
import { useAgentFilter } from '../lib/AgentFilterContext';
import { isDemoMode } from '../lib/isDemoMode';
import { useRealtime } from '../hooks/useRealtime';
import { useForceSimulation } from './useForceSimulation';
import SwarmActivityLog from '../components/SwarmActivityLog';

export default function SwarmIntelligencePage() {
  const router = useRouter();
  const { setAgentId: setGlobalAgentId } = useAgentFilter();
  const demo = isDemoMode();

  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [livePackets, setLivePackets] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragNodeId, setDragNodeId] = useState(null);

  const { nodes, links, setNodeFixed } = useForceSimulation({
    nodes: graphData.nodes,
    links: graphData.links,
    width: 800,
    height: 600
  });

  const svgRef = useRef(null);

  const handleMouseDown = (e) => {
    if (e.target.tagName === 'svg' || e.target.tagName === 'rect') {
      setIsPanning(true);
    }
  };

  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (800 / rect.width);
    const y = (e.clientY - rect.top) * (600 / rect.height);

    if (isPanning) {
      setPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
    } else if (dragNodeId) {
      // Adjust x/y based on zoom and pan
      const transformedX = (x - 400 - pan.x) / zoom + 400;
      const transformedY = (y - 300 - pan.y) / zoom + 300;
      setNodeFixed(dragNodeId, transformedX, transformedY);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (dragNodeId) {
      setNodeFixed(dragNodeId, null, null);
      setDragNodeId(null);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.2, Math.min(5, prev * delta)));
  };

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

  const triggerPacket = useCallback((fromId, toId) => {
    if (!fromId || !toId) return;
    const packetId = Math.random().toString(36).substring(7);
    setLivePackets(prev => [...prev, { id: packetId, from: fromId, to: toId }]);
    setTimeout(() => {
      setLivePackets(prev => prev.filter(p => p.id !== packetId));
    }, 1000);
  }, []);

  useRealtime((event, payload) => {
    if (event === 'message.created') {
      triggerPacket(payload.from_agent_id, payload.to_agent_id || 'broadcast');
    }

    if (!selectedAgent?.id) return;

    if (event === 'action.created' && payload.agent_id === selectedAgent.id) {
      setAgentContext(prev => ({
        ...prev,
        actions: [{
          action_id: payload.action_id,
          action_type: payload.action_type,
          status: payload.status === 'running' ? 'in-progress' : payload.status,
          timestamp_start: payload.timestamp_start,
          risk_score: payload.risk_score
        }, ...prev.actions].slice(0, 6),
        pendingApprovals: payload.status === 'pending_approval'
          ? [payload, ...prev.pendingApprovals].slice(0, 6)
          : prev.pendingApprovals
      }));
    }

    if (event === 'message.created' && (payload.from_agent_id === selectedAgent.id || payload.to_agent_id === selectedAgent.id)) {
      setAgentContext(prev => ({
        ...prev,
        messages: [payload, ...prev.messages].slice(0, 6)
      }));
    }

    if (event === 'guard.decision.created' && payload.decision.agent_id === selectedAgent.id) {
      setAgentContext(prev => ({
        ...prev,
        guard: [payload.decision, ...prev.guard].slice(0, 6)
      }));
    }
  });

  const fetchGraph = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/swarm/graph');
      if (!res.ok) throw new Error('Failed to load swarm data');
      const json = await res.json();
      setGraphData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
    const interval = setInterval(fetchGraph, 30000);
    return () => clearInterval(interval);
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

      if (demo && link) {
        triggerPacket(link.source, link.target);
      }
    }, demo ? 1800 : 3000);

    return () => clearInterval(interval);
  }, [nodes, links, demo, triggerPacket]);

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
          safeJson(approvalsJson),
          safeJson(msgsRes),
          safeJson(guardRes),
          safeJson(wfJson),
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

  const renderGraph = () => {
    if (nodes.length === 0) return <EmptyState icon={Users} title="No agents found" description="Connect agents to see the swarm map." />;

    const width = 800;
    const height = 600;
    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

    return (
      <div 
        className="w-full h-full relative" 
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg 
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-full bg-[#0a0a0a] rounded-xl overflow-hidden cursor-move select-none"
        >
          <defs>
            <radialGradient id="nodeGradient">
              <stop offset="0%" stopColor="rgba(249, 115, 22, 0.4)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Transformation Group */}
          <g style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center' }}>
            {/* Links */}
            {links.map((link, i) => {
              const s = nodeMap[link.source];
              const t = nodeMap[link.target];
              if (!s || !t) return null;
              
              const isHighlighted = (hoveredNode && (link.source === hoveredNode || link.target === hoveredNode));
              const isActive = activityPulse.activeLink && activityPulse.activeLink.source === link.source && activityPulse.activeLink.target === link.target;
              
              return (
                <line
                  key={`link-${i}`}
                  x1={s.x} y1={s.y}
                  x2={t.x} y2={t.y}
                  stroke={isActive ? 'rgba(249, 115, 22, 0.6)' : isHighlighted ? 'rgba(249, 115, 22, 0.3)' : 'rgba(255,255,255,0.05)'}
                  strokeWidth={isActive ? 2 : 1}
                  className="transition-all duration-500"
                />
              );
            })}

            {/* Data Packets */}
            {livePackets.map(packet => {
              const s = nodeMap[packet.from];
              const t = nodeMap[packet.to === 'broadcast' ? nodes[0]?.id : packet.to];
              if (!s || !t) return null;

              return (
                <circle key={packet.id} r="3" fill="#f97316" filter="url(#glow)">
                  <animateMotion
                    dur="0.8s"
                    path={`M${s.x},${s.y} L${t.x},${t.y}`}
                    fill="freeze"
                  />
                  <animate attributeName="opacity" values="1;0" dur="0.8s" fill="freeze" />
                </circle>
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedAgent?.id === node.id;
              const isHovered = hoveredNode === node.id;
              const riskColor = node.risk > 70 ? '#ef4444' : node.risk > 40 ? '#eab308' : '#22c55e';

              return (
                <g 
                  key={node.id} 
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onMouseDown={(e) => { e.stopPropagation(); setDragNodeId(node.id); }}
                  onClick={() => setSelectedAgent(node)}
                  className="transition-all duration-300 cursor-pointer"
                >
                  {isHovered && (
                    <circle cx={node.x} cy={node.y} r={25} fill="url(#nodeGradient)" />
                  )}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? 12 : isHovered ? 10 : 6}
                    fill="#111"
                    stroke={isSelected ? '#f97316' : riskColor}
                    strokeWidth={isSelected ? 3 : 2}
                    className="transition-all duration-300"
                  />
                  {(isHovered || isSelected || nodes.length < 12) && (
                    <g>
                      <rect 
                        x={node.x - 40} y={node.y + 12} width={80} height={16} 
                        rx={4} fill="rgba(0,0,0,0.6)" backdropBlur="sm" 
                      />
                      <text
                        x={node.x}
                        y={node.y + 23}
                        textAnchor="middle"
                        fill={isSelected ? 'white' : '#a1a1aa'}
                        fontSize="9"
                        className="font-medium pointer-events-none select-none"
                      >
                        {node.name}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Zoom Controls Overlay */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button 
            onClick={() => setZoom(z => Math.min(5, z * 1.2))}
            className="w-8 h-8 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-brand/20 transition-colors"
          >
            +
          </button>
          <button 
            onClick={() => setZoom(z => Math.max(0.2, z * 0.8))}
            className="w-8 h-8 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-brand/20 transition-colors"
          >
            -
          </button>
          <button 
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="w-8 h-8 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-brand/20 transition-colors"
            title="Reset view"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <PageLayout
      title="Swarm Intelligence"
      subtitle="Living operational graph of multi-agent communication and behavior"
      breadcrumbs={['Operations', 'Swarm']}
      actions={
        <button onClick={fetchGraph} className="p-2 text-zinc-400 hover:text-white transition-colors">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        
        {/* Left Column: Stats & Map */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Swarm Map */}
          <Card className="relative overflow-hidden group border-brand/5">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[rgba(255,255,255,0.04)] py-3">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-brand" />
                <span className="text-sm font-semibold">Live Swarm Map</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="default">{nodes.length} Agents</Badge>
                <Badge variant="outline">{links.length} Neural Links</Badge>
                {demo && <Badge variant="outline" className="text-brand border-brand/20">Demo: Neural Activity</Badge>}
              </div>
            </CardHeader>
            <CardContent className="p-0 h-[500px] bg-[#050505]">
              {loading && !nodes.length ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                  <div className="text-sm text-zinc-500 font-mono uppercase tracking-widest">Synchronizing swarm...</div>
                </div>
              ) : (
                renderGraph()
              )}
              
              {/* Legend Overlay */}
              <div className="absolute bottom-4 left-4 p-3 rounded-lg bg-black/60 backdrop-blur-md border border-white/5 text-[10px] text-zinc-500 space-y-1.5 shadow-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#ef4444]" /> Critical Risk
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#eab308]" /> Elevated Risk
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#22c55e]" /> Nominal Operation
                </div>
                <div className="mt-2 pt-2 border-t border-white/5 opacity-60 font-mono">
                  FORCE-DIRECTED TOPOLOGY ACTIVE
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Swarm Health Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-surface-secondary/50 border-white/5">
              <CardContent className="pt-4 pb-4">
                <StatCompact label="Active Goals" value={demo ? "3" : "1"} color="text-white" />
              </CardContent>
            </Card>
            <Card className="bg-surface-secondary/50 border-white/5">
              <CardContent className="pt-4 pb-4">
                <StatCompact label="Neural Latency" value="12ms" color="text-brand" />
              </CardContent>
            </Card>
            <Card className="bg-surface-secondary/50 border-white/5">
              <CardContent className="pt-4 pb-4">
                <StatCompact label="Governance Load" value="4.2%" color="text-blue-400" />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Agent Detail Panel */}
        <div className="space-y-6">
          <Card className="h-full border-brand/5">
            <CardHeader className="border-b border-[rgba(255,255,255,0.04)] py-4">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-zinc-400" />
                <span className="text-sm font-semibold">Agent Core Context</span>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {selectedAgent ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">{selectedAgent.name}</h3>
                    <code className="text-[10px] text-zinc-500 font-mono">{selectedAgent.id}</code>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" size="xs" className="bg-white/5">{getRoleLabel(selectedAgent.id)}</Badge>
                      <Badge variant="outline" size="xs" className="bg-white/5">Swarm: {graphData.swarm_id || 'all'}</Badge>
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

                  {/* Compact Partners */}
                  {selectedPartners.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Neural Partners</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedPartners.slice(0, 4).map((p, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedAgent(getAgentDetails(p.partnerId) || { id: p.partnerId, name: p.partnerName, actions: 0, risk: 0 })}
                            className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5 hover:border-brand/30 transition-all text-[10px] text-zinc-300"
                          >
                            <div className="w-1 h-1 rounded-full bg-brand" />
                            {p.partnerName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Live-ish context */}
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {agentContext.pendingApprovals.length > 0 && (
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="text-[10px] text-amber-400 uppercase font-bold mb-2 flex items-center gap-1.5">
                          <ShieldAlert size={10} /> Pending Approvals
                        </div>
                        {agentContext.pendingApprovals.map((a) => (
                          <div key={a.action_id} className="text-xs text-amber-200/80 mb-1 last:mb-0">
                            {a.action_type}: {a.declared_goal?.substring(0, 30)}...
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Recent Cycles</h4>
                      {agentContext.actions.slice(0, 3).map((a) => (
                        <div key={a.action_id} className="p-2 rounded bg-surface-tertiary border border-white/5 flex justify-between items-center">
                          <div className="min-w-0">
                            <div className="text-[11px] text-zinc-300 truncate">{a.action_type}</div>
                            <div className="text-[9px] text-zinc-600 font-mono">{formatTime(a.timestamp_start)}</div>
                          </div>
                          <div className={`text-[10px] font-mono ${a.status === 'failed' ? 'text-red-400' : 'text-zinc-500'}`}>
                            {a.status?.substring(0, 4)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <button
                      onClick={() => {
                        setGlobalAgentId?.(selectedAgent.id);
                        router.push('/workspace');
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-brand/10 border border-brand/20 rounded-lg text-xs font-bold text-brand hover:bg-brand hover:text-white transition-all"
                    >
                      Enter Neural Workspace <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <Users size={32} className="mx-auto text-zinc-800 mb-4" />
                  <p className="text-xs text-zinc-500">Select a neural node to engage.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Panel: Live Swarm Log */}
      <div className="h-80">
        <SwarmActivityLog />
      </div>
    </PageLayout>
  );
}
