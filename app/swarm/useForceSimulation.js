'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * ROBUST FORCE SIMULATION (v3)
 * 
 * - Decoupled from React render cycle for physics calculations.
 * - Forces React updates via requestAnimationFrame loop.
 * - Explicitly handles "fixed" nodes for dragging.
 */
export function useForceSimulation({ nodes: initialNodes, links: initialLinks, width = 800, height = 600 }) {
  // We use a ref to store the actual physics state to avoid stale closures
  const state = useRef({
    nodes: [],
    links: [],
    nodeMap: new Map(),
  });

  // React state for rendering
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);

  // Initialization: Sync props to ref
  useEffect(() => {
    const s = state.current;
    
    // Index existing nodes to keep positions
    const existing = new Map(s.nodes.map(n => [n.id, n]));

    s.nodes = initialNodes.map(node => {
      const prev = existing.get(node.id);
      return {
        ...node,
        x: prev ? prev.x : width / 2 + (Math.random() - 0.5) * 200,
        y: prev ? prev.y : height / 2 + (Math.random() - 0.5) * 200,
        vx: prev ? prev.vx : (Math.random() - 0.5) * 2,
        vy: prev ? prev.vy : (Math.random() - 0.5) * 2,
        // Important: preserve fixed state if it exists
        fx: prev ? prev.fx : null,
        fy: prev ? prev.fy : null,
      };
    });

    s.nodeMap = new Map(s.nodes.map(n => [n.id, n]));

    s.links = initialLinks.map(link => ({
      source: typeof link.source === 'object' ? link.source.id : link.source,
      target: typeof link.target === 'object' ? link.target.id : link.target,
      weight: link.weight
    })).filter(l => s.nodeMap.has(l.source) && s.nodeMap.has(l.target));

    setNodes(s.nodes.map(n => ({...n}))); 
    setLinks(s.links);
  }, [initialNodes, initialLinks, width, height]);

  // The Physics Loop
  useEffect(() => {
    let frame;
    
    const tick = () => {
      const { nodes, links, nodeMap } = state.current;
      if (!nodes.length) return;

      const REPULSION = 1000;
      const CENTER_GRAVITY = 0.0005;
      const LINK_STRENGTH = 0.005;
      const FRICTION = 0.96;
      const SPEED_LIMIT = 8;
      const WALL_BOUNCE = 0.5;
      const JITTER = 0.05;

      const t = Date.now() * 0.001;

      // 1. Repulsion (Push apart)
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let distSq = dx * dx + dy * dy;
          if (distSq === 0) { dx = 0.1; dy = 0.1; distSq = 0.02; } // Prevent div by zero
          
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
        // const dist = Math.sqrt(dx * dx + dy * dy);
        // Hooke's Law: pull towards distance 0
        const strength = LINK_STRENGTH * (link.weight || 1);
        
        s.vx += dx * strength;
        s.vy += dy * strength;
        t.vx -= dx * strength;
        t.vy -= dy * strength;
      }

      // 3. Environment (Center + Noise + Update)
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

        // Organic Jitter (The "Walking" effect)
        n.vx += (Math.random() - 0.5) * JITTER;
        n.vy += (Math.random() - 0.5) * JITTER;

        // Velocity Cap
        const v = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (v > SPEED_LIMIT) {
          n.vx = (n.vx / v) * SPEED_LIMIT;
          n.vy = (n.vy / v) * SPEED_LIMIT;
        }

        // Move
        n.x += n.vx;
        n.y += n.vy;

        // Friction
        n.vx *= FRICTION;
        n.vy *= FRICTION;

        // Boundaries
        const m = 20;
        if (n.x < m) { n.x = m; n.vx = Math.abs(n.vx) * WALL_BOUNCE; }
        if (n.x > width - m) { n.x = width - m; n.vx = -Math.abs(n.vx) * WALL_BOUNCE; }
        if (n.y < m) { n.y = m; n.vy = Math.abs(n.vy) * WALL_BOUNCE; }
        if (n.y > height - m) { n.y = height - m; n.vy = -Math.abs(n.vy) * WALL_BOUNCE; }
      }

      // Sync to React
      setNodes(nodes.map(n => ({...n})));
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
