'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3-force';

/**
 * NEURAL FORCE SIMULATION (v6 - Tightened for compact view)
 * 
 * - Reduced charge and link distance to keep swarm focused.
 * - Optimized for responsive layout.
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
        .force('link', d3.forceLink(links).id(d => d.id).distance(80).strength(0.15)) // Tighter links
        .force('charge', d3.forceManyBody().strength(-150).distanceMax(300)) // Reduced repulsion
        .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05)) // Stronger center pull
        .force('collision', d3.forceCollide().radius(22))
        .on('tick', () => {
          nodes.forEach(n => {
            if (n.fx === undefined) {
              n.vx += (Math.random() - 0.5) * 0.1;
              n.vy += (Math.random() - 0.5) * 0.1;
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
