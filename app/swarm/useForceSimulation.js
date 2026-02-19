'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * A zero-dependency force-directed simulation hook.
 * Uses Verlet integration for gravity, repulsion, and links.
 * 
 * Version 2.0: High-energy "walking" physics and sustained organic drift.
 */
export function useForceSimulation({ nodes: initialNodes, links: initialLinks, width = 800, height = 600 }) {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const frameRef = useRef();
  const simulationRef = useRef({
    nodes: [],
    links: [],
  });

  // Initialize or update simulation data
  useEffect(() => {
    const nodeMap = new Map();
    const existingNodes = new Map(simulationRef.current.nodes.map(n => [n.id, n]));

    const newNodes = initialNodes.map(node => {
      const existing = existingNodes.get(node.id);
      return {
        ...node,
        x: existing ? existing.x : width / 2 + (Math.random() - 0.5) * 400,
        y: existing ? existing.y : height / 2 + (Math.random() - 0.5) * 400,
        vx: existing ? existing.vx : (Math.random() - 0.5) * 2,
        vy: existing ? existing.vy : (Math.random() - 0.5) * 2,
        fx: existing ? existing.fx : null,
        fy: existing ? existing.fy : null,
      };
    });

    newNodes.forEach(n => nodeMap.set(n.id, n));

    const newLinks = initialLinks.map(link => ({
      ...link,
      source: typeof link.source === 'object' ? link.source.id : link.source,
      target: typeof link.target === 'object' ? link.target.id : link.target,
    })).filter(l => nodeMap.has(l.source) && nodeMap.has(l.target));

    simulationRef.current = { nodes: newNodes, links: newLinks };
    setNodes([...newNodes]);
    setLinks([...newLinks]);
  }, [initialNodes, initialLinks, width, height]);

  const tick = useCallback(() => {
    const { nodes: simNodes, links: simLinks } = simulationRef.current;
    if (!simNodes.length) return;

    const CENTER_FORCE = 0.002; // Very weak center pull to allow expansion
    const REPULSION = 30000; // Even stronger repulsion
    const LINK_STRENGTH = 0.01; // Weaker links for more "floaty" feel
    const FRICTION = 0.99; // Almost no friction for constant motion
    const JITTER = 0.4; // Stronger random "walking" impulse
    const BREATHING_FORCE = 0.4; 
    
    const time = Date.now() * 0.001;

    // 1. Repulsion
    for (let i = 0; i < simNodes.length; i++) {
      const a = simNodes[i];
      for (let j = i + 1; j < simNodes.length; j++) {
        const b = simNodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy || 1;
        const dist = Math.sqrt(distSq);
        
        // Repulsion force
        const force = REPULSION / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    // 2. Links (Spring force)
    simLinks.forEach(link => {
      const s = simNodes.find(n => n.id === link.source);
      const t = simNodes.find(n => n.id === link.target);
      if (!s || !t) return;

      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const strength = LINK_STRENGTH * (link.weight || 1);
      const fx = dx * strength;
      const fy = dy * strength;

      s.vx += fx;
      s.vy += fy;
      t.vx -= fx;
      t.vy -= fy;
    });

    // 3. Update Positions & Constraints
    simNodes.forEach((node, idx) => {
      if (node.fx != null && node.fy != null) {
        node.x = node.fx;
        node.y = node.fy;
        node.vx = 0;
        node.vy = 0;
        return;
      }

      // Center Gravity
      node.vx += (width / 2 - node.x) * CENTER_FORCE;
      node.vy += (height / 2 - node.y) * CENTER_FORCE;

      // "Walking" impulse (random jitter)
      node.vx += (Math.random() - 0.5) * JITTER;
      node.vy += (Math.random() - 0.5) * JITTER;

      // "Breathing" (large scale organic drift)
      node.vx += Math.sin(time * 0.5 + idx) * BREATHING_FORCE;
      node.vy += Math.cos(time * 0.4 + idx) * BREATHING_FORCE;

      // Apply
      node.x += node.vx;
      node.y += node.vy;
      
      // Friction (Velocity decay)
      node.vx *= FRICTION;
      node.vy *= FRICTION;

      // Soft boundaries (Bounce)
      const m = 60;
      if (node.x < m) { node.x = m; node.vx *= -1; }
      if (node.x > width - m) { node.x = width - m; node.vx *= -1; }
      if (node.y < m) { node.y = m; node.vy *= -1; }
      if (node.y > height - m) { node.y = height - m; node.vy *= -1; }
    });

    setNodes([...simNodes]);
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
