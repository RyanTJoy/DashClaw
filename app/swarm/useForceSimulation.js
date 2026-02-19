'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * High-performance force simulation.
 * Optimized to prevent "freezing" and provide sustained organic motion.
 */
export function useForceSimulation({ nodes: initialNodes, links: initialLinks, width = 800, height = 600 }) {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const frameRef = useRef();
  
  // simulationRef holds the mutable state that the physics engine manipulates
  const simulationRef = useRef({
    nodes: [],
    links: [],
    initialized: false
  });

  // 1. Sync React nodes to Simulation nodes (only when the set of IDs changes)
  useEffect(() => {
    const sim = simulationRef.current;
    const nodeMap = new Map();
    
    // Index existing nodes to preserve positions/velocity
    const existingNodes = new Map(sim.nodes.map(n => [n.id, n]));
    
    const newNodes = initialNodes.map(node => {
      const existing = existingNodes.get(node.id);
      if (existing) {
        // Update metadata but keep physics state
        return { ...existing, ...node };
      }
      // New node: give it a random position and initial velocity "kick"
      return {
        ...node,
        x: width / 2 + (Math.random() - 0.5) * 200,
        y: height / 2 + (Math.random() - 0.5) * 200,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        fx: null,
        fy: null,
      };
    });

    newNodes.forEach(n => nodeMap.set(n.id, n));

    const newLinks = initialLinks.map(link => ({
      ...link,
      source: typeof link.source === 'object' ? link.source.id : link.source,
      target: typeof link.target === 'object' ? link.target.id : link.target,
    })).filter(l => nodeMap.has(l.source) && nodeMap.has(l.target));

    sim.nodes = newNodes;
    sim.links = newLinks;
    sim.initialized = true;
    
    // Force immediate state sync for the first frame
    setNodes([...newNodes]);
    setLinks([...newLinks]);
  }, [initialNodes, initialLinks, width, height]);

  // 2. The Physics Engine Tick
  const tick = useCallback(() => {
    const sim = simulationRef.current;
    if (!sim.nodes.length) return;

    // PHYSICS TUNING
    const REPULSION = 40000;   // Powerful push
    const LINK_SPRING = 0.02;  // Elastic links
    const CENTER_GRAVITY = 0.003; 
    const FRICTION = 0.98;     // Sustained drift
    const JITTER = 0.6;        // Brownian "walking" magnitude
    const NOISE_SCALE = 0.3;   // Fluid-like drift
    
    const time = Date.now() * 0.001;

    // a. Repulsion (Inverse Square)
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

    // b. Link Springs
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

    // c. Integration & Brownian Motion
    sim.nodes.forEach((node, idx) => {
      if (node.fx != null && node.fy != null) {
        node.x = node.fx;
        node.y = node.fy;
        node.vx = 0;
        node.vy = 0;
        return;
      }

      // Gravitational pull to center
      node.vx += (width / 2 - node.x) * CENTER_GRAVITY;
      node.vy += (height / 2 - node.y) * CENTER_GRAVITY;

      // Organic Walking (Jitter + Noise)
      node.vx += (Math.random() - 0.5) * JITTER;
      node.vy += (Math.random() - 0.5) * JITTER;
      node.vx += Math.sin(time + idx * 0.7) * NOISE_SCALE;
      node.vy += Math.cos(time * 0.8 + idx * 0.5) * NOISE_SCALE;

      // Apply velocity
      node.x += node.vx;
      node.y += node.vy;
      
      // Decay
      node.vx *= FRICTION;
      node.vy *= FRICTION;

      // Boundary Bounce
      const m = 40;
      if (node.x < m) { node.x = m; node.vx = Math.abs(node.vx); }
      if (node.x > width - m) { node.x = width - m; node.vx = -Math.abs(node.vx); }
      if (node.y < m) { node.y = m; node.vy = Math.abs(node.vy); }
      if (node.y > height - m) { node.y = height - m; node.vy = -Math.abs(node.vy); }
    });

    // We only trigger a React state update for the UI every 2 frames to save CPU
    // while keeping the simulation smooth.
    setNodes([...sim.nodes]);
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
