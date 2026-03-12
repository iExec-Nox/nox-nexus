"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import { createEdgeCurveProgram } from "@sigma/edge-curve";
import type { GraphNode, GraphEdge } from "@/lib/types";
import { OPERATOR_COLORS } from "@/lib/constants";
import { computeLayout, type LayoutMode } from "@/lib/graph-layouts";
import {
  drawDarkLabel,
  drawDarkHover,
  truncateHandle,
  mixWithRed,
  DIM_COLOR,
  DIM_EDGE_COLOR,
} from "@/lib/graph-rendering";
import ZoomControls from "./ZoomControls";
import LayoutSelector from "./LayoutSelector";

const EdgeCurvedArrowProgram = createEdgeCurveProgram({
  arrowHead: {
    extremity: "target",
    lengthToThicknessRatio: 5,
    widenessToThicknessRatio: 4,
  },
});

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick: (nodeId: string) => void;
  onBackgroundClick: () => void;
  selectedNodeId: string | null;
  searchQuery: string;
  highlightedOperators: string[];
  focusNodeId: string | null;
  layoutMode: LayoutMode;
  onLayoutChange: (mode: LayoutMode) => void;
  unresolvedNodeIds?: Set<string>;
}

export default function GraphCanvas({
  nodes,
  edges,
  onNodeClick,
  onBackgroundClick,
  selectedNodeId,
  searchQuery,
  highlightedOperators,
  focusNodeId,
  layoutMode,
  onLayoutChange,
  unresolvedNodeIds,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const hoveredNodeRef = useRef<string | null>(null);
  const draggedNodeRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const pendingFocusRef = useRef<string | null>(null);
  const layoutReadyRef = useRef(false);
  const [sigmaInstance, setSigmaInstance] = useState<Sigma | null>(null);
  const [mounted, setMounted] = useState(false);

  // Store filter state in refs so reducers can read current values
  // without needing to be replaced via setSetting()
  const selectedNodeIdRef = useRef<string | null>(selectedNodeId);
  const searchQueryRef = useRef<string>(searchQuery);
  const highlightedOperatorsRef = useRef<string[]>(highlightedOperators);
  const unresolvedNodeIdsRef = useRef<Set<string> | null>(unresolvedNodeIds ?? null);

  // Store callbacks in refs to avoid tearing down Sigma on callback changes
  const onNodeClickRef = useRef(onNodeClick);
  const onBackgroundClickRef = useRef(onBackgroundClick);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep callback refs up to date
  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
  }, [onNodeClick]);

  useEffect(() => {
    onBackgroundClickRef.current = onBackgroundClick;
  }, [onBackgroundClick]);

  // Focus camera on a node (must be called when layout is stable)
  const focusCameraOnNode = useCallback((nodeId: string) => {
    const r = sigmaRef.current;
    const g = graphRef.current;
    if (!r || !g || !g.hasNode(nodeId)) return;

    const graphX = g.getNodeAttribute(nodeId, "x") as number;
    const graphY = g.getNodeAttribute(nodeId, "y") as number;
    const viewportCoords = r.graphToViewport({ x: graphX, y: graphY });
    const framedCoords = r.viewportToFramedGraph(viewportCoords);

    r.getCamera().animate(
      { x: framedCoords.x, y: framedCoords.y, ratio: 0.3 },
      { duration: 600 }
    );
  }, []);

  const buildGraphInstance = useCallback(() => {
    const graph = new Graph();

    for (const node of nodes) {
      const color =
        OPERATOR_COLORS[node.operator as keyof typeof OPERATOR_COLORS] ??
        "#6b7280";
      graph.addNode(node.id, {
        label: truncateHandle(node.id),
        size: node.size ?? 2,
        color,
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        operator: node.operator,
      });
    }

    for (const edge of edges) {
      if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
        if (!graph.hasEdge(edge.id)) {
          graph.addEdgeWithKey(edge.id, edge.source, edge.target, {
            size: edge.size ?? 0.5,
            color: edge.color ?? "#1e2044",
            type: "curvedArrow",
          });
        }
      }
    }

    return graph;
  }, [nodes, edges]);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;

    layoutReadyRef.current = false;

    if (sigmaRef.current) {
      sigmaRef.current.kill();
      sigmaRef.current = null;
      graphRef.current = null;
    }

    if (nodes.length === 0) {
      setSigmaInstance(null);
      return;
    }

    const graph = buildGraphInstance();
    graphRef.current = graph;

    const renderer = new Sigma(graph, containerRef.current, {
      defaultEdgeType: "curvedArrow",
      edgeProgramClasses: {
        curvedArrow: EdgeCurvedArrowProgram,
      },
      defaultDrawNodeLabel: drawDarkLabel,
      defaultDrawNodeHover: drawDarkHover,
      labelFont: "JetBrains Mono, monospace",
      labelSize: 11,
      labelDensity: 0.02,
      labelGridCellSize: 400,
      labelColor: { color: "#d3d3d8" },
      defaultEdgeColor: "#1e2044",
      defaultNodeColor: "#6b7280",
      renderLabels: false,
      labelRenderedSizeThreshold: 6,
      nodeReducer: (node, data) => {
        const res = { ...data };
        const hovered = hoveredNodeRef.current;
        const currentSelectedNodeId = selectedNodeIdRef.current;
        const currentSearchQuery = searchQueryRef.current;
        const currentHighlightedOperators = highlightedOperatorsRef.current;
        const currentUnresolved = unresolvedNodeIdsRef.current;
        const isUnresolved = currentUnresolved?.has(node) ?? false;

        const nodeAttrs = graph.getNodeAttributes(node);
        const operatorMatch =
          currentHighlightedOperators.length === 0 ||
          currentHighlightedOperators.includes(nodeAttrs.operator as string);

        const searchMatch =
          currentSearchQuery === "" ||
          node.toLowerCase().startsWith(currentSearchQuery.toLowerCase()) ||
          node.toLowerCase().includes(currentSearchQuery.toLowerCase());

        const isSelected = currentSelectedNodeId === node;
        const isSelectedNeighbor =
          currentSelectedNodeId !== null &&
          graph.hasNode(currentSelectedNodeId) &&
          graph.areNeighbors(node, currentSelectedNodeId);

        // Unresolved nodes: amber tint + slightly smaller
        if (isUnresolved) {
          res.color = mixWithRed(data.color ?? "#6b7280", 0.5);
          res.size = (data.size ?? 2) * 0.75;
        }

        if (hovered) {
          if (node === hovered || graph.areNeighbors(node, hovered)) {
            res.highlighted = true;
          } else {
            res.color = DIM_COLOR;
            res.label = "";
            res.size = (data.size ?? 2) * 0.6;
          }
          return res;
        }

        if (currentSelectedNodeId) {
          if (isSelected) {
            res.highlighted = true;
            res.size = (data.size ?? 6) * 1.5;
          } else if (isSelectedNeighbor) {
            // Keep visible and slightly larger, but no label to avoid overlap
            res.size = (data.size ?? 2) * 1.2;
          } else {
            res.color = DIM_COLOR;
            res.label = "";
            res.size = (data.size ?? 2) * 0.6;
          }
          return res;
        }

        if (currentSearchQuery || currentHighlightedOperators.length > 0) {
          if (!(searchMatch && operatorMatch)) {
            res.color = DIM_COLOR;
            res.label = "";
          }
          return res;
        }

        return res;
      },
      edgeReducer: (edge, data) => {
        const res = { ...data };
        const hovered = hoveredNodeRef.current;
        const currentSelectedNodeId = selectedNodeIdRef.current;
        const currentSearchQuery = searchQueryRef.current;
        const currentHighlightedOperators = highlightedOperatorsRef.current;

        const src = graph.source(edge);
        const tgt = graph.target(edge);

        if (hovered) {
          if (src === hovered || tgt === hovered) {
            const baseColor = (res.color ?? "").replace(/[0-9a-f]{2}$/i, "");
            res.color = baseColor || res.color;
            res.size = 1;
          } else {
            res.color = DIM_EDGE_COLOR;
          }
          return res;
        }

        if (currentSelectedNodeId) {
          if (src === currentSelectedNodeId || tgt === currentSelectedNodeId) {
            // Boost connected edges: remove alpha suffix, increase size
            const baseColor = (res.color ?? "").replace(/[0-9a-f]{2}$/i, "");
            res.color = baseColor || res.color;
            res.size = 1;
          } else {
            res.color = DIM_EDGE_COLOR;
          }
          return res;
        }

        if (currentSearchQuery || currentHighlightedOperators.length > 0) {
          const srcAttrs = graph.getNodeAttributes(src);
          const tgtAttrs = graph.getNodeAttributes(tgt);

          const srcOperatorMatch =
            currentHighlightedOperators.length === 0 ||
            currentHighlightedOperators.includes(srcAttrs.operator as string);
          const tgtOperatorMatch =
            currentHighlightedOperators.length === 0 ||
            currentHighlightedOperators.includes(tgtAttrs.operator as string);

          const srcSearchMatch =
            currentSearchQuery === "" ||
            src.toLowerCase().includes(currentSearchQuery.toLowerCase());
          const tgtSearchMatch =
            currentSearchQuery === "" ||
            tgt.toLowerCase().includes(currentSearchQuery.toLowerCase());

          if (
            !(srcSearchMatch && srcOperatorMatch) ||
            !(tgtSearchMatch && tgtOperatorMatch)
          ) {
            res.color = DIM_EDGE_COLOR;
          }
        }

        return res;
      },
    });

    sigmaRef.current = renderer;
    setSigmaInstance(renderer);

    renderer.on("enterNode", ({ node }) => {
      hoveredNodeRef.current = node;
      renderer.refresh();
    });

    renderer.on("leaveNode", () => {
      hoveredNodeRef.current = null;
      renderer.refresh();
    });

    renderer.on("clickNode", ({ node }) => {
      onNodeClickRef.current(node);
    });

    renderer.on("clickStage", () => {
      onBackgroundClickRef.current();
    });

    // --- Drag & Drop ---
    renderer.on("downNode", (e) => {
      isDraggingRef.current = true;
      draggedNodeRef.current = e.node;
      // Disable camera drag while we drag a node
      renderer.getCamera().disable();
    });

    renderer.getMouseCaptor().on("mousemovebody", (e) => {
      if (!isDraggingRef.current || !draggedNodeRef.current) return;
      // Map viewport coords to graph coords
      const pos = renderer.viewportToGraph(e);
      graph.setNodeAttribute(draggedNodeRef.current, "x", pos.x);
      graph.setNodeAttribute(draggedNodeRef.current, "y", pos.y);
      // Prevent sigma from showing hover while dragging
      e.preventSigmaDefault();
      e.original.preventDefault();
      e.original.stopPropagation();
    });

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        draggedNodeRef.current = null;
        renderer.getCamera().enable();
      }
    };
    renderer.getMouseCaptor().on("mouseup", handleMouseUp);
    renderer.getMouseCaptor().on("mousedown", () => {
      // If clicking on stage (not a node), ensure drag state is clean
      if (hoveredNodeRef.current === null) {
        isDraggingRef.current = false;
        draggedNodeRef.current = null;
      }
    });

    // Compute layout positions
    const finalPositions = computeLayout(graph, layoutMode);

    const nodeCount = graph.order;

    // For small graphs, set positions directly without animation
    if (nodeCount < 50) {
      graph.forEachNode((node) => {
        const pos = finalPositions.get(node);
        if (pos) {
          graph.setNodeAttribute(node, "x", pos.x);
          graph.setNodeAttribute(node, "y", pos.y);
        }
      });

      // Boost node sizes for very small graphs so they're clearly visible
      if (nodeCount < 10) {
        graph.forEachNode((node) => {
          const currentSize = graph.getNodeAttribute(node, "size") as number;
          graph.setNodeAttribute(node, "size", Math.max(currentSize * 2.5, 6));
        });
      }

      // Compute bounding box with padding
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      finalPositions.forEach((pos) => {
        if (pos.x < minX) minX = pos.x;
        if (pos.x > maxX) maxX = pos.x;
        if (pos.y < minY) minY = pos.y;
        if (pos.y > maxY) maxY = pos.y;
      });
      const span = Math.max(maxX - minX, maxY - minY, 80);
      // More padding for tiny graphs to cluster nodes in center
      const pad = nodeCount < 10 ? span * 1.5 : span * 0.3;
      renderer.setCustomBBox({
        x: [minX - pad, maxX + pad],
        y: [minY - pad, maxY + pad],
      });

      renderer.refresh();
      renderer.getCamera().setState({ x: 0.5, y: 0.5, ratio: 1, angle: 0 });

      // Layout is ready immediately for small graphs
      layoutReadyRef.current = true;
      if (pendingFocusRef.current) {
        const id = pendingFocusRef.current;
        pendingFocusRef.current = null;
        // Small delay to let sigma process the refresh
        setTimeout(() => focusCameraOnNode(id), 50);
      }
    } else {
      // --- Animated settling for large graphs ---
      // Compute graph center and bounding box
      let gcx = 0, gcy = 0;
      finalPositions.forEach((pos) => { gcx += pos.x; gcy += pos.y; });
      gcx /= finalPositions.size || 1;
      gcy /= finalPositions.size || 1;

      let minFX = Infinity, maxFX = -Infinity, minFY = Infinity, maxFY = -Infinity;
      finalPositions.forEach((pos) => {
        if (pos.x < minFX) minFX = pos.x;
        if (pos.x > maxFX) maxFX = pos.x;
        if (pos.y < minFY) minFY = pos.y;
        if (pos.y > maxFY) maxFY = pos.y;
      });
      const graphSpan = Math.max(maxFX - minFX, maxFY - minFY, 500);

      // Start nodes scattered across the full graph area for gentle convergence
      graph.forEachNode((node) => {
        graph.setNodeAttribute(node, "x", gcx + (Math.random() - 0.5) * graphSpan * 0.8);
        graph.setNodeAttribute(node, "y", gcy + (Math.random() - 0.5) * graphSpan * 0.8);
      });

      renderer.refresh();

      // Animate from scrambled to final positions
      const ANIM_DURATION = 4000;
      const startTime = performance.now();

      function easeOutQuart(t: number): number {
        return 1 - Math.pow(1 - t, 4);
      }

      const startPositions = new Map<string, { x: number; y: number }>();
      graph.forEachNode((node) => {
        startPositions.set(node, {
          x: graph.getNodeAttribute(node, "x") as number,
          y: graph.getNodeAttribute(node, "y") as number,
        });
      });

      function animateStep() {
        const elapsed = performance.now() - startTime;
        const rawT = Math.min(elapsed / ANIM_DURATION, 1);
        const t = easeOutQuart(rawT);

        graph.forEachNode((node) => {
          const start = startPositions.get(node)!;
          const end = finalPositions.get(node)!;
          if (start && end) {
            graph.setNodeAttribute(node, "x", start.x + (end.x - start.x) * t);
            graph.setNodeAttribute(node, "y", start.y + (end.y - start.y) * t);
          }
        });

        if (rawT < 1) {
          animFrameRef.current = requestAnimationFrame(animateStep);
        } else {
          animFrameRef.current = null;
          // Layout animation complete: process pending focus
          layoutReadyRef.current = true;
          if (pendingFocusRef.current) {
            const id = pendingFocusRef.current;
            pendingFocusRef.current = null;
            setTimeout(() => focusCameraOnNode(id), 50);
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(animateStep);
    }

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (sigmaRef.current) {
        sigmaRef.current.kill();
        sigmaRef.current = null;
        graphRef.current = null;
      }
      setSigmaInstance(null);
    };
  }, [mounted, nodes, edges, buildGraphInstance, layoutMode, focusCameraOnNode]);

  // Update unresolved ref and refresh (no graph rebuild needed)
  useEffect(() => {
    unresolvedNodeIdsRef.current = unresolvedNodeIds ?? null;
    const renderer = sigmaRef.current;
    if (renderer) renderer.refresh();
  }, [unresolvedNodeIds]);

  // Update refs and trigger a lightweight refresh when filter state changes.
  // The reducers already read from these refs, so no need to replace them.
  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
    searchQueryRef.current = searchQuery;
    highlightedOperatorsRef.current = highlightedOperators;

    const renderer = sigmaRef.current;
    if (renderer) {
      renderer.refresh();
    }
  }, [selectedNodeId, searchQuery, highlightedOperators]);

  // Animate camera to focus on a specific node
  useEffect(() => {
    if (!focusNodeId) {
      pendingFocusRef.current = null;
      return;
    }

    if (layoutReadyRef.current) {
      // Layout is stable: focus immediately (small delay for sigma refresh)
      const timeoutId = setTimeout(() => focusCameraOnNode(focusNodeId), 50);
      return () => clearTimeout(timeoutId);
    } else {
      // Layout animation in progress: defer until it completes
      pendingFocusRef.current = focusNodeId;
    }
  }, [focusNodeId, focusCameraOnNode]);

  if (!mounted) {
    return (
      <div className="relative w-full h-full bg-[#14141b]">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-gray-500 text-sm font-[family-name:var(--font-geist-mono)]">
            Loading graph...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full graph-bg">
      <div ref={containerRef} className="w-full h-full" />
      <LayoutSelector layoutMode={layoutMode} onLayoutChange={onLayoutChange} />
      <ZoomControls sigma={sigmaInstance} />
    </div>
  );
}
