'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3-force';

/**
 * NEURAL FORCE SIMULATION (v5 - D3-Force Powered)
 * 
 * - Stable, high-performance alpha-decay physics.
 * - Decoupled from React renders (operates on refs).
 * - Optimized for Canvas drawing.
 */
export function useForceSimulation({ nodes: initialNodes, links: initialLinks, width = 800, height = 600 }) {
  const simulation = useRef(null);
  const nodesRef = useRef([]);
  const linksRef = useRef([]);
  
  // We only sync initial data once, or when it significantly changes
  useEffect(() => {
    if (!initialNodes.length) return;

    // Preserve existing positions if they exist
    const nodeMap = new Map(nodesRef.current.map(n => [n.id, n]));
    
    const nodes = initialNodes.map(node => {
      const prev = nodeMap.get(node.id);
      return {
        ...node,
        x: prev ? prev.x : width / 2 + (Math.random() - 0.5) * 100,
        y: prev ? prev.y : height / 2 + (Math.random() - 0.5) * 100,
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

    // Initialize or restart simulation
    if (!simulation.current) {
      simulation.current = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(150).strength(0.1))
        .force('charge', d3.forceManyBody().strength(-300).distanceMax(500))
        .force('center', d3.forceCenter(width / 2, height / 2).strength(0.01))
        .force('collision', d3.forceCollide().radius(25))
        // Organic Drift Force (Custom)
        .on('tick', () => {
          // Add a tiny bit of random energy to keep it "alive"
          nodes.forEach(n => {
            if (n.fx === undefined) {
              n.vx += (Math.random() - 0.5) * 0.15;
              n.vy += (Math.random() - 0.5) * 0.15;
            }
          });
        });
    } else {
      simulation.current.nodes(nodes);
      simulation.current.force('link').links(links);
      simulation.current.alpha(0.3).restart();
    }

    return () => {
      if (simulation.current) simulation.current.stop();
    };
  }, [initialNodes, initialLinks, width, height]);

  // Alpha re-kick for interaction
  const wake = useCallback(() => {
    if (simulation.current) simulation.current.alpha(0.3).restart();
  }, []);

  const setNodeFixed = useCallback((id, x, y) => {
    const node = nodesRef.current.find(n => n.id === id);
    if (node) {
      if (x === null) {
        delete node.fx;
        delete node.fy;
        if (simulation.current) simulation.current.alpha(0.3).restart();
      } else {
        node.fx = x;
        node.fy = y;
        if (simulation.current) simulation.current.alpha(0.1).restart();
      }
    }
  }, []);

  return { nodesRef, linksRef, setNodeFixed, wake };
}
