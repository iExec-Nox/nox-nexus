'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import { Graph } from '@cosmos.gl/graph';
import type { GraphNode, GraphEdge } from '@/lib/types';
import { OPERATOR_COLORS } from '@/lib/constants';
import { hexToRgba, getOperatorColor, mixWithRed } from '@/lib/utils';
import ZoomControls from './ZoomControls';

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick: (nodeId: string) => void;
  onBackgroundClick: () => void;
  selectedNodeId: string | null;
  searchQuery: string;
  highlightedOperators: string[];
  focusNodeId: string | null;
  unresolvedNodeIds?: Set<string>;
}

const DIM_RGBA: [number, number, number, number] = [0.13, 0.13, 0.15, 0.3];

export default function GraphCanvas({
  nodes,
  edges,
  onNodeClick,
  onBackgroundClick,
  selectedNodeId,
  searchQuery,
  highlightedOperators,
  focusNodeId,
  unresolvedNodeIds,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const onNodeClickRef = useRef(onNodeClick);
  const onBackgroundClickRef = useRef(onBackgroundClick);

  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
  }, [onNodeClick]);
  useEffect(() => {
    onBackgroundClickRef.current = onBackgroundClick;
  }, [onBackgroundClick]);

  // Build index: nodeId -> array index
  const nodeIndex = useMemo(() => {
    const map = new Map<string, number>();
    nodes.forEach((n, i) => map.set(n.id, i));
    return map;
  }, [nodes]);

  // Initialize cosmos.gl graph
  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    const graph = new Graph(containerRef.current, {
      backgroundColor: '#14141b',
      spaceSize: 2048,
      simulationFriction: 0.85,
      simulationGravity: 0.1,
      simulationRepulsion: 2.0,
      simulationCenter: 1.0,
      simulationLinkSpring: 0.5,
      simulationLinkDistance: 15,
      simulationDecay: 5000,
      curvedLinks: true,
      linkArrows: true,
      linkArrowsSizeScale: 4,
      fitViewOnInit: false,
      enableDrag: true,
      hoveredPointCursor: 'pointer',
      renderHoveredPointRing: true,
      hoveredPointRingColor: 'rgba(255, 255, 255, 0.4)',
      onSimulationStart: () => setIsSimulating(true),
      onSimulationEnd: () => setIsSimulating(false),
      onClick: (pointIndex) => {
        if (
          pointIndex !== undefined &&
          pointIndex >= 0 &&
          pointIndex < nodes.length
        ) {
          onNodeClickRef.current(nodes[pointIndex].id);
        } else {
          onBackgroundClickRef.current();
        }
      },
    });

    // Spread nodes in a circle matching expected final layout size
    const positions = new Float32Array(nodes.length * 2);
    const spread = Math.sqrt(nodes.length) * 15;
    for (let i = 0; i < nodes.length; i++) {
      const angle = (i / nodes.length) * Math.PI * 2;
      const r = Math.random() * spread;
      positions[i * 2] = Math.cos(angle) * r;
      positions[i * 2 + 1] = Math.sin(angle) * r;
    }
    graph.setPointPositions(positions);

    // Set colors
    const colors = new Float32Array(nodes.length * 4);
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      let hex = getOperatorColor(node.operator);
      if (unresolvedNodeIds?.has(node.id)) {
        hex = mixWithRed(hex, 0.5);
      }
      const rgba = hexToRgba(hex);
      colors[i * 4] = rgba[0];
      colors[i * 4 + 1] = rgba[1];
      colors[i * 4 + 2] = rgba[2];
      colors[i * 4 + 3] = rgba[3];
    }
    graph.setPointColors(colors);

    // Set sizes
    const sizes = new Float32Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      sizes[i] = nodes[i].size;
    }
    graph.setPointSizes(sizes);

    // Set links
    const links = new Float32Array(edges.length * 2);
    let linkCount = 0;
    for (const edge of edges) {
      const srcIdx = nodeIndex.get(edge.source);
      const tgtIdx = nodeIndex.get(edge.target);
      if (srcIdx !== undefined && tgtIdx !== undefined) {
        links[linkCount * 2] = srcIdx;
        links[linkCount * 2 + 1] = tgtIdx;
        linkCount++;
      }
    }
    graph.setLinks(links.slice(0, linkCount * 2));

    graph.render();
    graphRef.current = graph;

    return () => {
      graph.destroy();
      graphRef.current = null;
    };
  }, [nodes, edges, nodeIndex, unresolvedNodeIds]);

  // Update colors on selection/search/filter changes
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || nodes.length === 0) return;

    const hasFilters =
      selectedNodeId !== null ||
      searchQuery !== '' ||
      highlightedOperators.length < Object.keys(OPERATOR_COLORS).length;

    const colors = new Float32Array(nodes.length * 4);

    // Build neighbor set for selected node
    let selectedNeighbors: Set<number> | null = null;
    if (selectedNodeId) {
      const selectedIdx = nodeIndex.get(selectedNodeId);
      if (selectedIdx !== undefined) {
        selectedNeighbors = new Set<number>();
        selectedNeighbors.add(selectedIdx);
        for (const edge of edges) {
          const srcIdx = nodeIndex.get(edge.source);
          const tgtIdx = nodeIndex.get(edge.target);
          if (srcIdx === selectedIdx && tgtIdx !== undefined) {
            selectedNeighbors.add(tgtIdx);
          }
          if (tgtIdx === selectedIdx && srcIdx !== undefined) {
            selectedNeighbors.add(srcIdx);
          }
        }
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      let hex = getOperatorColor(node.operator);

      if (unresolvedNodeIds?.has(node.id)) {
        hex = mixWithRed(hex, 0.5);
      }

      let rgba = hexToRgba(hex);

      if (hasFilters) {
        let visible = true;

        if (selectedNeighbors) {
          visible = selectedNeighbors.has(i);
        } else {
          if (searchQuery) {
            visible =
              visible &&
              node.id.toLowerCase().includes(searchQuery.toLowerCase());
          }
          if (highlightedOperators.length > 0) {
            visible = visible && highlightedOperators.includes(node.operator);
          }
        }

        if (!visible) rgba = DIM_RGBA;
      }

      colors[i * 4] = rgba[0];
      colors[i * 4 + 1] = rgba[1];
      colors[i * 4 + 2] = rgba[2];
      colors[i * 4 + 3] = rgba[3];
    }

    graph.setPointColors(colors);
    graph.render();
  }, [
    selectedNodeId,
    searchQuery,
    highlightedOperators,
    nodes,
    edges,
    nodeIndex,
    unresolvedNodeIds,
  ]);

  // Zoom to focused node
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !focusNodeId) return;
    const idx = nodeIndex.get(focusNodeId);
    if (idx !== undefined) {
      const positions = graph.getPointPositions();
      if (positions && positions.length > idx * 2 + 1) {
        graph.zoomToPointByIndex(idx, 600);
      }
    }
  }, [focusNodeId, nodeIndex]);

  if (nodes.length === 0) {
    return (
      <div className="relative w-full h-full graph-bg">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-gray-500 text-sm">No data</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full graph-bg">
      <div ref={containerRef} className="w-full h-full" />
      {isSimulating && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full bg-[var(--color-deep)]/80 backdrop-blur-md border border-[var(--color-border)] px-4 py-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
          <span className="text-[11px] text-[var(--color-text-muted)]">
            Positioning nodes...
          </span>
        </div>
      )}
      <ZoomControls graph={graphRef} />
    </div>
  );
}
