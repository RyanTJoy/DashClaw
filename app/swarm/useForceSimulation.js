'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * HIGH-ENERGY FORCE SIMULATION
 * 
 * Specifically tuned for high-motion "walking" and organic jitter.
 * Uses object cloning to force React re-renders on every frame.
 */
export function useForceSimulation({ nodes: initialNodes, links: initialLinks, width = 800, height = 600 }) {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const frameRef = useRef();
  
  // simulationRef holds the "source of truth" for physics
  const simulationRef = useRef({
    nodes: [],
    links: [],
  });

  // 1. Sync React state to Simulation state
  useEffect(() => {
    const sim = simulationRef.current;
    
    // Maintain a map of existing nodes to preserve momentum
    const existingNodes = new Map(sim.nodes.map(n => [n.id, n]));
    
    const newNodes = initialNodes.map(node => {
      const existing = existingNodes.get(node.id);
      if (existing) {
        // Keep physics, update metadata
        return { ...existing, ...node };
      }
      // New node: spawn with a "kick"
      return {
        ...node,
        x: width / 2 + (Math.random() - 0.5) * 300,
        y: height / 2 + (Math.random() - 0.5) * 300,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        fx: null,
        fy: null,
      };
    });

    const nodeMap = new Map(newNodes.map(n => [n.id, n]));

    const newLinks = initialLinks.map(link => ({
      ...link,
      source: typeof link.source === 'object' ? link.source.id : link.source,
      target: typeof link.target === 'object' ? link.target.id : link.target,
    })).filter(l => nodeMap.has(l.source) && nodeMap.has(l.target));

    sim.nodes = newNodes;
    sim.links = newLinks;
    
    // Initial render
    setNodes(newNodes.map(n => ({ ...n })));
    setLinks([...newLinks]);
  }, [initialNodes, initialLinks, width, height]);

  // 2. The Physics Engine
  const tick = useCallback(() => {
    const sim = simulationRef.current;
    if (!sim.nodes.length) return;

    // PHYSICS CONSTANTS - CRANKED UP FOR VISIBLE MOVEMENT
    const REPULSION = 60000;    // Aggressive spacing
    const LINK_SPRING = 0.04;   // Snappy connections
    const CENTER_PULL = 0.005;  // Moderate center gravity
    const FRICTION = 0.97;      // Fluid coasting
    const JITTER = 1.2;         // Random walking impulse (Visible!)
    const DRIFT_FORCE = 0.5;    // Large scale organic swaying
    
    const time = Date.now() * 0.001;

    // a. Global Repulsion (Push everyone away)
    for (let i = 0; i < sim.nodes.length; i++) {
      const a = sim.nodes[i];
      for (let j = i + 1; j < sim.nodes.length; j++) {
        const b = sim.nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy || 1;
        const dist = Math.sqrt(distSq);
        const force = REPULSION / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    // b. Elastic Links
    sim.links.forEach(link => {
      const s = sim.nodes.find(n => n.id === link.source);
      const t = sim.nodes.find(n => n.id === link.target);
      if (!s || !t) return;

      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const strength = LINK_SPRING * (link.weight || 1);
      const fx = dx * strength;
      const fy = dy * strength;

      s.vx += fx;
      s.vy += fy;
      t.vx -= fx;
      t.vy -= fy;
    });

    // c. Movement & Noise
    sim.nodes.forEach((node, idx) => {
      // If manually dragging (fixed position)
      if (node.fx != null && node.fy != null) {
        node.x = node.fx;
        node.y = node.fy;
        node.vx = 0;
        node.vy = 0;
        return;
      }

      // Gravitational center pull
      node.vx += (width / 2 - node.x) * CENTER_PULL;
      node.vy += (height / 2 - node.y) * CENTER_PULL;

      // "Walking" Jitter
      node.vx += (Math.random() - 0.5) * JITTER;
      node.vy += (Math.random() - 0.5) * JITTER;

      // Large Organic Drift
      node.vx += Math.sin(time * 0.6 + idx) * DRIFT_FORCE;
      node.vy += Math.cos(time * 0.5 + idx) * DRIFT_FORCE;

      // Integration
      node.x += node.vx;
      node.y += node.vy;
      node.vx *= FRICTION;
      node.vy *= FRICTION;

      // Soft Wall Bounce
      const m = 50;
      if (node.x < m) { node.x = m; node.vx = Math.abs(node.vx) * 0.8; }
      if (node.x > width - m) { node.x = width - m; node.vx = -Math.abs(node.vx) * 0.8; }
      if (node.y < m) { node.y = m; node.vy = Math.abs(node.vy) * 0.8; }
      if (node.y > height - m) { node.y = height - m; node.vy = -Math.abs(node.vy) * 0.8; }
    });

    // CRITICAL: Clone objects to force React to update the SVG circles
    setNodes(sim.nodes.map(n => ({ ...n })));
    
    frameRef.current = requestAnimationFrame(tick);
  }, [width, height]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [tick]);

  const setNodeFixed = useCallback((id, x, y) => {
    const node = simulationRef.current.nodes.find(n => n.id === id);
    if (node) {
      node.fx = x;
      node.fy = y;
    }
  }, []);

  return { nodes, links, setNodeFixed };
}
