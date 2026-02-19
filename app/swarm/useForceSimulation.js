'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * A tiny, zero-dependency force-directed simulation hook.
 * Uses basic Verlet integration for gravity, repulsion, and links.
 */
export function useForceSimulation({ nodes: initialNodes, links: initialLinks, width = 800, height = 600 }) {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const frameRef = useRef();
  const simulationRef = useRef({
    nodes: [],
    links: [],
  });

  // Initialize or update simulation data when props change
  useEffect(() => {
    const nodeMap = new Map();
    
    // Preserve existing positions if nodes update
    const existingNodes = new Map(simulationRef.current.nodes.map(n => [n.id, n]));

    const newNodes = initialNodes.map(node => {
      const existing = existingNodes.get(node.id);
      const n = {
        ...node,
        x: existing ? existing.x : width / 2 + (Math.random() - 0.5) * 100,
        y: existing ? existing.y : height / 2 + (Math.random() - 0.5) * 100,
        vx: existing ? existing.vx : 0,
        vy: existing ? existing.vy : 0,
      };
      nodeMap.set(node.id, n);
      return n;
    });

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

    const ALPHA = 0.05; // Cooling factor
    const CENTER_FORCE = 0.01;
    const REPULSION = 1500;
    const LINK_STRENGTH = 0.05;
    const FRICTION = 0.9;

    // 1. Repulsion (Every node pushes every other node)
    for (let i = 0; i < simNodes.length; i++) {
      const a = simNodes[i];
      for (let j = i + 1; j < simNodes.length; j++) {
        const b = simNodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distanceSq = dx * dx + dy * dy || 1;
        const force = REPULSION / distanceSq;
        const fx = (dx / Math.sqrt(distanceSq)) * force;
        const fy = (dy / Math.sqrt(distanceSq)) * force;
        
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    // 2. Link Force (Pull connected nodes together)
    simLinks.forEach(link => {
      const s = simNodes.find(n => n.id === link.source);
      const t = simNodes.find(n => n.id === link.target);
      if (!s || !t) return;

      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const strength = LINK_STRENGTH * (link.weight || 1);
      const fx = dx * strength;
      const fy = dy * strength;

      s.vx += fx;
      s.vy += fy;
      t.vx -= fx;
      t.vy -= fy;
    });

    // 3. Center Gravity & Update Positions
    simNodes.forEach(node => {
      // Pull to center
      node.vx += (width / 2 - node.x) * CENTER_FORCE;
      node.vy += (height / 2 - node.y) * CENTER_FORCE;

      // Apply velocity
      node.x += node.vx;
      node.y += node.vy;

      // Friction
      node.vx *= FRICTION;
      node.vy *= FRICTION;

      // Boundary constraints
      const margin = 40;
      if (node.x < margin) node.x = margin;
      if (node.x > width - margin) node.x = width - margin;
      if (node.y < margin) node.y = margin;
      if (node.y > height - margin) node.y = margin;
    });

    setNodes([...simNodes]);
    frameRef.current = requestAnimationFrame(tick);
  }, [width, height]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [tick]);

  return { nodes, links };
}
