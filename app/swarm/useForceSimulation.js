'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3-force';

/**
 * NEURAL FORCE SIMULATION (v7 - Locked & Stable)
 * 
 * - Stable selection: Clicking no longer triggers repulsion kicks.
 * - Bound constraints: Agents are physically incapable of leaving the viewport.
 * - Focused physics: Lower energy, higher stability.
 */
export function useForceSimulation({ nodes: initialNodes, links: initialLinks, width = 800, height = 600 }) {
  const simulation = useRef(null);
  const nodesRef = useRef([]);
  const linksRef = useRef([]);
  
  useEffect(() => {
    if (!initialNodes.length) return;

    const nodeMap = new Map(nodesRef.current.map(n => [n.id, n]));
    
    const nodes = initialNodes.map(node => {
      const prev = nodeMap.get(node.id);
      return {
        ...node,
        x: prev ? prev.x : width / 2 + (Math.random() - 0.5) * 50,
        y: prev ? prev.y : height / 2 + (Math.random() - 0.5) * 50,
        vx: prev ? prev.vx : 0,
        vy: prev ? prev.vy : 0,
      };
    });

    const links = initialLinks.map(link => ({
      ...link,
      source: typeof link.source === 'object' ? link.source.id : link.source,
      target: typeof link.target === 'object' ? link.target.id : link.target,
    })).filter(l => nodes.find(n => n.id === l.source) && nodes.find(n => n.id === l.target));

    nodesRef.current = nodes;
    linksRef.current = links;

    if (!simulation.current) {
      simulation.current = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100).strength(0.1))
        .force('charge', d3.forceManyBody().strength(0)) // Removed repulsion entirely
        .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
        .force('collision', d3.forceCollide().radius(35).strength(0.7)) // Increased collision to compensate for lack of charge
        .on('tick', () => {
          // 1. BOUNDARY CONSTRAINT (Strict containment)
          const margin = 40;
          nodes.forEach(n => {
            if (n.x < margin) n.x = margin;
            if (n.x > width - margin) n.x = width - margin;
            if (n.y < margin) n.y = margin;
            if (n.y > height - margin) n.y = height - margin;
          });
        });
      
      // Reduce default decay so it settles into a stable state faster
      simulation.current.alphaDecay(0.05);
    } else {
      simulation.current.nodes(nodes);
      simulation.current.force('link').links(links);
      // Minimal restart on data change, no explosion
      simulation.current.alpha(0.1).restart();
    }

    return () => {
      if (simulation.current) simulation.current.stop();
    };
  }, [initialNodes, initialLinks, width, height]);

  const wake = useCallback(() => {
    if (simulation.current) simulation.current.alpha(0.2).restart();
  }, []);

  const setNodeFixed = useCallback((id, x, y) => {
    const node = nodesRef.current.find(n => n.id === id);
    if (node) {
      if (x === null) {
        delete node.fx;
        delete node.fy;
        // Slower release restart
        if (simulation.current) simulation.current.alpha(0.15).restart();
      } else {
        node.fx = x;
        node.fy = y;
        // RESTART SIMULATION DURING DRAG: This fixes the "freeze" issue
        // We use a small alpha but restart to ensure ticks continue while moving.
        if (simulation.current) {
          simulation.current.alpha(0.3).restart();
        }
      }
    }
  }, []);

  return { nodesRef, linksRef, setNodeFixed, wake };
}
