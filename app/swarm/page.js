'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Zap, ShieldAlert, MessageSquare, ArrowRight,
  Filter, RefreshCw, BarChart3, Maximize2, Activity, Terminal,
  MousePointer2, Search
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
  
  // Selection Logic: Click to select, Click BG to deselect
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  
  // Interaction State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragNodeId, setDragNodeId] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const [livePackets, setLivePackets] = useState([]);

  const containerRef = useRef(null);
  const svgRef = useRef(null);

  const { nodes, links, setNodeFixed } = useForceSimulation({
    nodes: graphData.nodes,
    links: graphData.links,
    width: 800,
    height: 600
  });

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

  // 1. HARD FIX: Scroll Zoom Lock (Native event to prevent page scroll)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onNativeWheel = (e) => {
      if (!isFocused) return;
      e.preventDefault(); // Stop page scroll
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(z => Math.max(0.2, Math.min(5, z * delta)));
    };

    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => el.removeEventListener('wheel', onNativeWheel);
  }, [isFocused]);

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

  // Demo packets
  useEffect(() => {
    if (!nodes.length || !demo) return;
    const interval = setInterval(() => {
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
      const link = links?.length ? pick(links) : null;
      if (link) triggerPacket(link.source, link.target);
    }, 2000);
    return () => clearInterval(interval);
  }, [nodes, links, demo, triggerPacket]);

  const getAgentDetails = (agentId) => {
    return nodes.find(n => n.id === agentId);
  };

  const formatTime = (ts) => {
    if (!ts) return '--';
    try {
      return new Date(ts).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
      });
    } catch { return ts; }
  };

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
    return links
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
  }, [links, nodes, selectedAgent?.id]);

  useEffect(() => {
    if (!selectedAgent?.id) {
      setAgentContext({ loading: false, error: null, actions: [], pendingApprovals: [], messages: [], guard: [], workflows: [] });
      return;
    }
    const agentId = selectedAgent.id;
    const ctrl = new AbortController();
    
    const load = async () => {
      setAgentContext((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const qs = (path) => `/api/${path}?agent_id=${encodeURIComponent(agentId)}&limit=6`;
        const responses = await Promise.all([
          fetch(qs('actions'), { signal: ctrl.signal }),
          fetch(qs('actions') + '&status=pending_approval', { signal: ctrl.signal }),
          fetch(qs('messages'), { signal: ctrl.signal }),
          fetch(qs('guard'), { signal: ctrl.signal }),
          fetch(qs('workflows'), { signal: ctrl.signal }),
        ]);

        const [actions, approvals, msgs, guard, workflows] = await Promise.all(
          responses.map(res => res.json().catch(() => null))
        );

        setAgentContext({
          loading: false, error: null,
          actions: actions?.actions || [],
          pendingApprovals: approvals?.actions || [],
          messages: msgs?.messages || [],
          guard: guard?.decisions || guard?.guard_decisions || [],
          workflows: workflows?.workflows || workflows?.items || [],
        });
      } catch (e) {
        if (e?.name === 'AbortError') return;
        setAgentContext(prev => ({ ...prev, loading: false, error: 'Context sync failed' }));
      }
    };

    void load();
    return () => ctrl.abort();
  }, [selectedAgent?.id]);

  // --- INTERACTION HANDLERS ---

  const handleMouseDown = (e) => {
    setIsFocused(true);
    // Pan if clicking background (svg or rect)
    if (e.target.tagName === 'svg' || e.target.id === 'swarm-bg') {
      setIsPanning(true);
      // DESELECTION ON BACKGROUND CLICK
      setSelectedAgent(null);
    }
  };

  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    
    if (isPanning) {
      setPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
    } else if (dragNodeId) {
      // Dragging logic
      const rect = svgRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (800 / rect.width);
      const y = (e.clientY - rect.top) * (600 / rect.height);
      const worldX = (x - 400 - pan.x) / zoom + 400;
      const worldY = (y - 300 - pan.y) / zoom + 300;
      setNodeFixed(dragNodeId, worldX, worldY);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (dragNodeId) {
      setNodeFixed(dragNodeId, null, null);
      setDragNodeId(null);
    }
  };

  const renderGraph = () => {
    if (nodes.length === 0 && !loading) return <EmptyState icon={Users} title="Empty Fleet" description="Connect agents to see the neural web." />;

    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

    return (
      <div 
        ref={containerRef}
        className={`w-full h-full relative group/graph ${!isFocused ? 'cursor-pointer' : 'cursor-move'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setIsFocused(false); }}
      >
        <svg 
          ref={svgRef}
          viewBox={`0 0 800 600`} 
          className={`w-full h-full bg-[#050505] rounded-xl overflow-hidden select-none transition-opacity duration-500 ${isFocused ? 'opacity-100' : 'opacity-70'}`}
        >
          <defs>
            <radialGradient id="nodeGlow">
              <stop offset="0%" stopColor="rgba(249, 115, 22, 0.4)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <filter id="neuralGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Hit area for panning/deselection */}
          <rect id="swarm-bg" x="0" y="0" width="800" height="600" fill="transparent" />

          <g style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '400px 300px' }}>
            {/* Links */}
            {links.map((link, i) => {
              const s = nodeMap[link.source];
              const t = nodeMap[link.target];
              if (!s || !t) return null;
              const isHighlight = selectedAgent && (link.source === selectedAgent.id || link.target === selectedAgent.id);
              return (
                <line key={`l-${i}`} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                  stroke={isHighlight ? 'rgba(249, 115, 22, 0.5)' : 'rgba(255,255,255,0.04)'}
                  strokeWidth={isHighlight ? 2 : 1}
                />
              );
            })}

            {/* Packets */}
            {livePackets.map(p => {
              const s = nodeMap[p.from];
              const t = nodeMap[p.to === 'broadcast' ? nodes[0]?.id : p.to];
              if (!s || !t) return null;
              return (
                <circle key={p.id} r="3" fill="#f97316" filter="url(#neuralGlow)">
                  <animateMotion dur="0.8s" path={`M${s.x},${s.y} L${t.x},${t.y}`} fill="freeze" />
                  <animate attributeName="opacity" values="1;0" dur="0.8s" fill="freeze" />
                </circle>
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const isSel = selectedAgent?.id === node.id;
              const isHov = hoveredNodeId === node.id;
              const rCol = node.risk > 70 ? '#ef4444' : node.risk > 40 ? '#eab308' : '#22c55e';

              return (
                <g key={node.id} 
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onMouseDown={(e) => { 
                    e.stopPropagation(); 
                    setDragNodeId(node.id); 
                    setNodeFixed(node.id, node.x, node.y);
                    // Click to Select
                    setSelectedAgent(node);
                  }}
                  className="cursor-pointer"
                >
                  {(isHov || isSel) && <circle cx={node.x} cy={node.y} r={30} fill="url(#nodeGlow)" />}
                  <circle cx={node.x} cy={node.y} r={isSel ? 12 : 6}
                    fill="#111" stroke={isSel ? '#f97316' : rCol} strokeWidth={isSel ? 3 : 2}
                  />
                  {(isHov || isSel || nodes.length < 10) && (
                    <g>
                      <rect x={node.x - 30} y={node.y + 14} width={60} height={14} rx={4} fill="rgba(0,0,0,0.8)" />
                      <text x={node.x} y={node.y + 24} textAnchor="middle" fill={isSel ? 'white' : '#a1a1aa'} fontSize="9" className="font-mono pointer-events-none select-none">
                        {node.name}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {!isFocused && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px] pointer-events-none">
            <div className="flex flex-col items-center gap-2">
              <MousePointer2 className="text-brand animate-bounce" size={24} />
              <div className="px-4 py-2 rounded-full bg-brand text-white text-xs font-bold uppercase tracking-widest shadow-2xl border border-white/20">
                Click to engage
              </div>
            </div>
          </div>
        )}

        <div className={`absolute top-4 right-4 flex flex-col gap-2 transition-all duration-300 ${isFocused ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}`}>
          <button onClick={() => setZoom(z => Math.min(5, z * 1.2))} className="w-8 h-8 rounded-lg bg-black/60 border border-white/10 text-white flex items-center justify-center hover:bg-brand/40">+</button>
          <button onClick={() => setZoom(z => Math.max(0.2, z * 0.8))} className="w-8 h-8 rounded-lg bg-black/60 border border-white/10 text-white flex items-center justify-center hover:bg-brand/40">-</button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="w-8 h-8 rounded-lg bg-black/60 border border-white/10 text-white flex items-center justify-center hover:bg-brand/40"><RefreshCw size={14} /></button>
        </div>
      </div>
    );
  };

  return (
    <PageLayout
      title="Swarm Intelligence"
      subtitle="Neural fleet topology: 50 agents synchronized in high-energy drift"
      breadcrumbs={['Operations', 'Swarm']}
      actions={<button onClick={fetchGraph} className="p-2 text-zinc-400 hover:text-white transition-colors"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <div className="lg:col-span-3 space-y-6">
          <Card className="relative overflow-hidden group border-brand/10 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 py-3">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-brand" />
                <span className="text-sm font-semibold">Real-Time Swarm Topology</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="default" className="font-mono bg-zinc-900 border-white/10">{nodes.length} SYNCHRONIZED</Badge>
                {demo && <Badge variant="outline" className="text-brand border-brand/30 bg-brand/5 animate-pulse">NEURAL ACTIVITY DETECTED</Badge>}
              </div>
            </CardHeader>
            <CardContent className="p-0 h-[500px]">{renderGraph()}</CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-surface-secondary/50 border-white/5 shadow-lg"><CardContent className="pt-4 pb-4"><StatCompact label="Neural Links" value={links.length} color="text-white" /></CardContent></Card>
            <Card className="bg-surface-secondary/50 border-white/5 shadow-lg"><CardContent className="pt-4 pb-4"><StatCompact label="Drift Entropy" value="0.04" color="text-brand" /></CardContent></Card>
            <Card className="bg-surface-secondary/50 border-white/5 shadow-lg"><CardContent className="pt-4 pb-4"><StatCompact label="Active Goals" value={demo ? "3" : "1"} color="text-blue-400" /></CardContent></Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="h-full border-brand/5 shadow-xl">
            <CardHeader className="border-b border-white/5 py-4">
              <div className="flex items-center gap-2"><Activity size={16} className="text-zinc-400" /><span className="text-sm font-semibold">Agent Telemetry</span></div>
            </CardHeader>
            <CardContent className="pt-6">
              {selectedAgent ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">{selectedAgent.name}</h3>
                    <code className="text-[10px] text-zinc-500 font-mono break-all">{selectedAgent.id}</code>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" size="xs" className="bg-white/5 uppercase tracking-tighter">{getRoleLabel(selectedAgent.id)}</Badge>
                      <Badge variant="outline" size="xs" className="bg-white/5">SWARM: {graphData.swarm_id || 'all'}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-surface-tertiary border border-white/5">
                      <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Actions</div>
                      <div className="text-xl font-mono text-white">{selectedAgent.actions}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-tertiary border border-white/5">
                      <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Avg Risk</div>
                      <div className={`text-xl font-mono ${selectedAgent.risk > 70 ? 'text-red-400' : 'text-green-400'}`}>{selectedAgent.risk.toFixed(0)}%</div>
                    </div>
                  </div>

                  {selectedPartners.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Neural Partners</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPartners.slice(0, 4).map((p, i) => (
                          <button key={i} onClick={() => setSelectedAgent(getAgentDetails(p.partnerId) || p)} className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10 hover:border-brand/50 transition-all text-[10px] text-zinc-300">{p.partnerName}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar border-t border-white/5 pt-4">
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Latest Neural Loops</h4>
                      {agentContext.actions.slice(0, 3).map((a) => (
                        <div key={a.action_id} className="p-2 rounded bg-surface-tertiary border border-white/5 flex justify-between items-center group/item">
                          <div className="min-w-0"><div className="text-[11px] text-zinc-300 truncate font-mono">{a.action_type}</div></div>
                          <div className={`text-[10px] font-mono ${a.status === 'failed' ? 'text-red-400' : 'text-zinc-600'}`}>{a.status?.substring(0, 4)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <button onClick={() => { setGlobalAgentId?.(selectedAgent.id); router.push('/workspace'); }} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-brand rounded-lg text-xs font-bold text-white hover:bg-brand-hover shadow-lg transition-all active:scale-95">Open Neural Workspace <ArrowRight size={14} /></button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center border border-white/5"><Search className="text-zinc-700" size={20} /></div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed max-w-[180px]">Select an agent on the map to intercept and inspect its live telemetry stream.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="h-80"><SwarmActivityLog /></div>
    </PageLayout>
  );
}
