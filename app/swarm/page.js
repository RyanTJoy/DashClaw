'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Zap, ShieldAlert, MessageSquare, ArrowRight,
  Filter, RefreshCw, BarChart3, Maximize2, Activity
} from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatCompact } from '../components/ui/Stat';
import { EmptyState } from '../components/ui/EmptyState';

export default function SwarmIntelligencePage() {
  const [data, setData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);

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

  const getAgentDetails = (agentId) => {
    return data.nodes.find(n => n.id === agentId);
  };

  // Simple Circle Layout for the graph (since we want zero-dep visualization)
  const renderGraph = () => {
    if (data.nodes.length === 0) return <EmptyState icon={Users} title="No agents found" description="Connect agents to see the swarm map." />;

    const width = 800;
    const height = 600;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    // Position nodes in a circle
    const positionedNodes = data.nodes.map((node, i) => {
      const angle = (i / data.nodes.length) * 2 * Math.PI;
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });

    const nodeMap = Object.fromEntries(positionedNodes.map(n => [n.id, n]));

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full bg-[#0a0a0a] rounded-xl overflow-hidden cursor-crosshair">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="15" refY="3.5" orientation="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.1)" />
          </marker>
        </defs>

        {/* Links */}
        {data.links.map((link, i) => {
          const s = nodeMap[link.source];
          const t = nodeMap[link.target];
          if (!s || !t) return null;
          
          const isHighlighted = (hoveredNode && (link.source === hoveredNode || link.target === hoveredNode));
          
          return (
            <line
              key={`link-${i}`}
              x1={s.x} y1={s.y}
              x2={t.x} y2={t.y}
              stroke={isHighlighted ? 'rgba(249, 115, 22, 0.4)' : 'rgba(255,255,255,0.05)'}
              strokeWidth={Math.min(5, 1 + link.weight / 5)}
              markerEnd="url(#arrowhead)"
            />
          );
        })}

        {/* Nodes */}
        {positionedNodes.map((node) => {
          const isSelected = selectedAgent?.id === node.id;
          const isHovered = hoveredNode === node.id;
          const riskColor = node.risk > 70 ? '#ef4444' : node.risk > 40 ? '#eab308' : '#22c55e';

          return (
            <g 
              key={node.id} 
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => setSelectedAgent(node)}
              className="transition-all duration-200 cursor-pointer"
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={isSelected ? 14 : isHovered ? 12 : 8}
                fill="#111"
                stroke={isSelected ? '#f97316' : riskColor}
                strokeWidth={isSelected ? 3 : 2}
              />
              {(isHovered || isSelected || data.nodes.length < 15) && (
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
                      {data.links
                        .filter(l => l.source === selectedAgent.id || l.target === selectedAgent.id)
                        .slice(0, 5)
                        .map((link, i) => {
                          const partnerId = link.source === selectedAgent.id ? link.target : link.source;
                          const partner = getAgentDetails(partnerId);
                          return (
                            <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors group">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                                <span className="text-xs text-zinc-300">{partner?.name || partnerId}</span>
                              </div>
                              <span className="text-[10px] text-zinc-600 font-mono">{link.weight} msg</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <button className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-brand rounded-lg text-xs font-bold text-white hover:bg-brand-hover transition-colors">
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
