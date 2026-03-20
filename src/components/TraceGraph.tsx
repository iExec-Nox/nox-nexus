'use client';

import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Graph } from '@cosmos.gl/graph';
import { Loader2, CircleCheck } from 'lucide-react';
import type { TraceOpNode, TraceEdge } from '@/lib/trace-graph-adapter';
import { OPERATOR_LABELS } from '@/lib/constants';
import { hexToRgba, getOperatorColor } from '@/lib/utils';
import EdgeTooltip from './EdgeTooltip';
import ZoomControls from './ZoomControls';

interface TraceGraphProps {
  nodes: TraceOpNode[];
  edges: TraceEdge[];
  queriedResolved?: boolean | null;
  hasUnresolved?: boolean;
  isTracing?: boolean;
}

export default function TraceGraph({
  nodes,
  edges,
  queriedResolved,
  hasUnresolved,
  isTracing,
}: TraceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<TraceEdge | null>(null);
  const [hoveredNode, setHoveredNode] = useState<TraceOpNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isSimulating, setIsSimulating] = useState(false);

  const edgesRef = useRef(edges);
  const nodesRef = useRef(nodes);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const hoveredEdgeRef = useRef<TraceEdge | null>(null);
  const hoveredNodeRef = useRef<TraceOpNode | null>(null);

  const onLinkMouseOver = useCallback((linkIndex: number) => {
    const edge = edgesRef.current[linkIndex] ?? null;
    hoveredEdgeRef.current = edge;
    hoveredNodeRef.current = null;
    setHoveredEdge(edge);
    setHoveredNode(null);
  }, []);

  const onLinkMouseOut = useCallback(() => {
    hoveredEdgeRef.current = null;
    setHoveredEdge(null);
  }, []);

  const onPointMouseOver = useCallback((pointIndex: number) => {
    const node = nodesRef.current[pointIndex] ?? null;
    hoveredNodeRef.current = node;
    hoveredEdgeRef.current = null;
    setHoveredNode(node);
    setHoveredEdge(null);
  }, []);

  const onPointMouseOut = useCallback(() => {
    hoveredNodeRef.current = null;
    setHoveredNode(null);
  }, []);

  const onMouseMove = useCallback(
    (_: unknown, __: unknown, event: MouseEvent) => {
      if (hoveredEdgeRef.current || hoveredNodeRef.current) {
        setMousePos({ x: event.clientX, y: event.clientY });
      }
    },
    []
  );

  // Build node index
  const nodeIndex = useMemo(() => {
    const map = new Map<string, number>();
    nodes.forEach((n, i) => map.set(n.id, i));
    return map;
  }, [nodes]);

  // cosmos.gl lifecycle
  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    const graph = new Graph(containerRef.current, {
      backgroundColor: '#14141b',
      spaceSize: 2048,
      simulationFriction: 0.85,
      simulationGravity: 0.25,
      simulationRepulsion: 1.5,
      simulationCenter: 1.0,
      simulationLinkSpring: 1.2,
      simulationLinkDistance: 20,
      simulationDecay: 2000,
      curvedLinks: true,
      curvedLinkWeight: 0.8,
      linkArrows: true,
      linkArrowsSizeScale: 2,
      fitViewOnInit: false,
      enableDrag: true,
      hoveredPointCursor: 'pointer',
      renderHoveredPointRing: true,
      hoveredPointRingColor: 'rgba(255, 255, 255, 0.4)',
      renderLinks: true,
      onSimulationStart: () => setIsSimulating(true),
      onSimulationEnd: () => setIsSimulating(false),
      onLinkMouseOver,
      onLinkMouseOut,
      onPointMouseOver,
      onPointMouseOut,
      onMouseMove,
    });

    // Initial positions in a circle
    const positions = new Float32Array(nodes.length * 2);
    const spread = Math.sqrt(nodes.length) * 20;
    for (let i = 0; i < nodes.length; i++) {
      const angle = (i / nodes.length) * Math.PI * 2;
      const r = Math.random() * spread;
      positions[i * 2] = Math.cos(angle) * r;
      positions[i * 2 + 1] = Math.sin(angle) * r;
    }
    graph.setPointPositions(positions);

    // Colors
    const colors = new Float32Array(nodes.length * 4);
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const hex = getOperatorColor(node.operator);
      const rgba = hexToRgba(hex);
      colors[i * 4] = rgba[0];
      colors[i * 4 + 1] = rgba[1];
      colors[i * 4 + 2] = rgba[2];
      colors[i * 4 + 3] = rgba[3];
    }
    graph.setPointColors(colors);

    // Sizes
    const sizes = new Float32Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      sizes[i] = nodes[i].isQueried ? 12 : nodes[i].isPatientZero ? 8 : 5;
    }
    graph.setPointSizes(sizes);

    // Links
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

    // Link colors (brighter for visibility)
    const linkColors = new Float32Array(edges.length * 4);
    for (let i = 0; i < edges.length; i++) {
      const resolved = edges[i].isResolved;
      if (resolved) {
        linkColors[i * 4] = 16 / 255;
        linkColors[i * 4 + 1] = 185 / 255;
        linkColors[i * 4 + 2] = 129 / 255;
        linkColors[i * 4 + 3] = 0.7;
      } else {
        linkColors[i * 4] = 245 / 255;
        linkColors[i * 4 + 1] = 158 / 255;
        linkColors[i * 4 + 2] = 11 / 255;
        linkColors[i * 4 + 3] = 0.8;
      }
    }
    graph.setLinkColors(linkColors);

    // Link widths (thicker for trace visibility)
    const linkWidths = new Float32Array(edges.length);
    for (let i = 0; i < edges.length; i++) {
      linkWidths[i] = edges[i].isResolved ? 1.5 : 2.5;
    }
    graph.setLinkWidths(linkWidths);

    // Link arrows
    const linkArrows = new Array(edges.length).fill(true);
    graph.setLinkArrows(linkArrows);

    graph.render();
    graphRef.current = graph;

    return () => {
      graph.destroy();
      graphRef.current = null;
    };
  }, [
    nodes,
    edges,
    nodeIndex,
    onLinkMouseOver,
    onLinkMouseOut,
    onPointMouseOver,
    onPointMouseOut,
    onMouseMove,
  ]);

  if (nodes.length === 0 && !isTracing) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-[var(--color-text-muted)]">
          No trace data
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full graph-bg">
      <div ref={containerRef} className="w-full h-full" />

      {/* Simulation indicator */}
      {isSimulating && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full bg-[var(--color-deep)]/80 backdrop-blur-md border border-[var(--color-border)] px-4 py-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
          <span className="text-[11px] text-[var(--color-text-muted)]">
            Positioning nodes...
          </span>
        </div>
      )}

      {/* Resolved banner */}
      {queriedResolved && !hasUnresolved && !isTracing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5">
          <CircleCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[11px] font-medium text-emerald-400">
            All resolved
          </span>
        </div>
      )}

      {/* Tracing overlay */}
      {isTracing && nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent)]" />
            <span className="text-sm text-[var(--color-text-muted)]">
              Tracing...
            </span>
          </div>
        </div>
      )}

      <ZoomControls graph={graphRef} />
      <EdgeTooltip edge={hoveredEdge} x={mousePos.x} y={mousePos.y} />
      {hoveredNode && (
        <div
          className="pointer-events-none fixed z-[200] rounded-lg border border-[var(--color-border)] bg-[var(--color-deep)]/95 backdrop-blur-xl shadow-xl px-3 py-2"
          style={{ left: mousePos.x + 16, top: mousePos.y - 8 }}
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: getOperatorColor(hoveredNode.operator),
              }}
            />
            <span
              className="text-sm font-semibold"
              style={{
                color: getOperatorColor(hoveredNode.operator),
              }}
            >
              {OPERATOR_LABELS[hoveredNode.operator] ?? hoveredNode.operator}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
