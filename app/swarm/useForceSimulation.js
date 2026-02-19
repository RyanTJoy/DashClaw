'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * HIGH-ENERGY FORCE SIMULATION (v4)
 * 
 * - Tuned for constant, visible organic movement.
 * - Reduced friction to prevent stopping.
 * - Stronger jitter forces.
 */
export function useForceSimulation({ nodes: initialNodes, links: initialLinks, width = 800, height = 600 }) {
  // We use a ref for the physics state to decouple it from React renders
  const state = useRef({
    nodes: [],
    links: [],
    nodeMap: new Map(),
  });

  // React state for rendering
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);

  // Initialization
  useEffect(() => {
    const s = state.current;
    
    // Index existing nodes to preserve positions/velocity
    const existing = new Map(s.nodes.map(n => [n.id, n]));
    
    const newNodes = initialNodes.map(node => {
      const prev = existing.get(node.id);
      return {
        ...node,
        // If it exists, keep position. If new, spawn in center with high velocity kick
        x: prev ? prev.x : width / 2 + (Math.random() - 0.5) * 50,
        y: prev ? prev.y : height / 2 + (Math.random() - 0.5) * 50,
        vx: prev ? prev.vx : (Math.random() - 0.5) * 50, // Big kick
        vy: prev ? prev.vy : (Math.random() - 0.5) * 50,
        fx: prev ? prev.fx : null,
        fy: prev ? prev.fy : null,
      };
    });

    s.nodeMap = new Map(newNodes.map(n => [n.id, n]));

    s.links = initialLinks.map(link => ({
      source: typeof link.source === 'object' ? link.source.id : link.source,
      target: typeof link.target === 'object' ? link.target.id : link.target,
      weight: link.weight
    })).filter(l => s.nodeMap.has(l.source) && s.nodeMap.has(l.target));

    s.nodes = newNodes;
    s.links = newLinks;
    
    // Initial render sync
    setNodes(newNodes.map(n => ({ ...n })));
    setLinks(newLinks);
  }, [initialNodes, initialLinks, width, height]);

  // The Physics Loop
  useEffect(() => {
    let frame;
    
    const tick = () => {
      const { nodes, links, nodeMap } = state.current;
      if (!nodes.length) return;

      const REPULSION = 80000;    // Extremely strong repulsion to force spread
      const LINK_SPRING = 0.005;  // Very loose elastic links
      const CENTER_GRAVITY = 0.001; // Weak gravity so they drift far
      const FRICTION = 0.99;      // Very low friction (almost frictionless) for constant motion
      const SPEED_CAP = 15;       // Allow higher speeds
      const JITTER = 2.5;         // Significant random walking force
      const WALL_BOUNCE = 0.8;    // Bouncy walls
      
      const t = Date.now() * 0.001;

      // 1. Repulsion (Push apart)
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let distSq = dx * dx + dy * dy;
          if (distSq === 0) { dx = 0.1; dy = 0.1; distSq = 0.02; } 
          
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

      // 2. Links (Pull together)
      for (const link of links) {
        const s = nodeMap.get(link.source);
        const t = nodeMap.get(link.target);
        if (!s || !t) continue;

        const dx = t.x - s.x;
        const dy = t.y - s.y;
        
        // Simple spring
        s.vx += dx * LINK_SPRING;
        s.vy += dy * LINK_SPRING;
        t.vx -= dx * LINK_SPRING;
        t.vy -= dy * LINK_SPRING;
      }

      // 3. Environment (Center + Jitter + Update)
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        // Fixed position (dragging)
        if (n.fx != null && n.fy != null) {
          n.x = n.fx;
          n.y = n.fy;
          n.vx = 0;
          n.vy = 0;
          continue;
        }

        // Center Gravity
        n.vx += (width / 2 - n.x) * CENTER_GRAVITY;
        n.vy += (height / 2 - n.y) * CENTER_GRAVITY;

        // Organic Walking (Random Impulse)
        n.vx += (Math.random() - 0.5) * JITTER;
        n.vy += (Math.random() - 0.5) * JITTER;

        // Large Scale Drift (Sine waves)
        n.vx += Math.sin(t + i) * 0.2;
        n.vy += Math.cos(t + i) * 0.2;

        // Velocity Cap
        const v = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (v > SPEED_CAP) {
          n.vx = (n.vx / v) * SPEED_CAP;
          n.vy = (n.vy / v) * SPEED_CAP;
        }

        // Move
        n.x += n.vx;
        n.y += n.vy;

        // Friction
        n.vx *= FRICTION;
        n.vy *= FRICTION;

        // Bouncy Boundaries
        const m = 50;
        if (n.x < m) { n.x = m; n.vx = Math.abs(n.vx) * WALL_BOUNCE; }
        if (n.x > width - m) { n.x = width - m; n.vx = -Math.abs(n.vx) * WALL_BOUNCE; }
        if (n.y < m) { n.y = m; n.vy = Math.abs(n.vy) * WALL_BOUNCE; }
        if (n.y > height - m) { n.y = height - m; n.vy = -Math.abs(n.vy) * WALL_BOUNCE; }
      }

      // Sync to React
      // We must create NEW objects to trigger re-renders
      setNodes(nodes.map(n => ({ ...n })));
      
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [width, height]);

  // External control for dragging
  const setNodeFixed = useCallback((id, x, y) => {
    const node = state.current.nodeMap.get(id);
    if (node) {
      node.fx = x;
      node.fy = y;
    }
  }, []);

  return { nodes, links, setNodeFixed };
}
