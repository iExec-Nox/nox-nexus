"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import EdgeCurveProgram from "@sigma/edge-curve";
import forceAtlas2 from "graphology-layout-forceatlas2";
import noverlap from "graphology-layout-noverlap";
import { connectedComponents } from "graphology-components";
import type { GraphNode, GraphEdge } from "@/lib/types";
import { OPERATOR_COLORS } from "@/lib/constants";
import type { Settings } from "sigma/settings";
import type { NodeDisplayData, PartialButFor } from "sigma/types";

type LabelData = PartialButFor<
  NodeDisplayData,
  "x" | "y" | "size" | "label" | "color"
>;
import ZoomControls from "./ZoomControls";

function drawDarkLabel(
  context: CanvasRenderingContext2D,
  data: LabelData,
  settings: Settings
): void {
  if (!data.label) return;

  const size = settings.labelSize;
  const font = `${settings.labelFont}`;
  context.font = `500 ${size}px ${font}`;

  const textWidth = context.measureText(data.label).width;
  const px = 6;
  const py = 3;
  const radius = 4;
  const x = data.x + data.size + 4;
  const y = data.y - (size + py * 2) / 2;
  const w = textWidth + px * 2;
  const h = size + py * 2;

  context.beginPath();
  context.roundRect(x, y, w, h, radius);
  context.fillStyle = "rgba(10, 10, 18, 0.85)";
  context.fill();
  context.strokeStyle = "rgba(30, 30, 58, 0.6)";
  context.lineWidth = 0.5;
  context.stroke();

  context.fillStyle = "#c8d0dc";
  context.fillText(data.label, x + px, data.y + size / 3);
}

function drawDarkHover(
  context: CanvasRenderingContext2D,
  data: LabelData,
  settings: Settings
): void {
  const size = data.size;

  context.beginPath();
  context.arc(data.x, data.y, size + 3, 0, Math.PI * 2);
  context.fillStyle = `${data.color}40`;
  context.fill();

  context.beginPath();
  context.arc(data.x, data.y, size, 0, Math.PI * 2);
  context.fillStyle = data.color;
  context.fill();

  if (!data.label) return;

  const fontSize = settings.labelSize + 1;
  const font = `${settings.labelFont}`;
  context.font = `600 ${fontSize}px ${font}`;

  const textWidth = context.measureText(data.label).width;
  const px = 8;
  const py = 4;
  const radius = 5;
  const x = data.x + size + 5;
  const y = data.y - (fontSize + py * 2) / 2;
  const w = textWidth + px * 2;
  const h = fontSize + py * 2;

  context.beginPath();
  context.roundRect(x, y, w, h, radius);
  context.fillStyle = "rgba(10, 10, 18, 0.92)";
  context.fill();
  context.strokeStyle = `${data.color}60`;
  context.lineWidth = 1;
  context.stroke();

  context.fillStyle = "#e2e8f0";
  context.fillText(data.label, x + px, data.y + fontSize / 3);
}

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick: (nodeId: string) => void;
  onBackgroundClick: () => void;
  selectedNodeId: string | null;
  searchQuery: string;
  highlightedOperators: string[];
}

function truncateHandle(id: string): string {
  if (id.length <= 12) return id;
  const clean = id.startsWith("0x") ? id.slice(2) : id;
  if (clean.length <= 10) return id;
  return `0x${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

const DIM_COLOR = "#2a2a3a";
const DIM_EDGE_COLOR = "#1a1a28";

export default function GraphCanvas({
  nodes,
  edges,
  onNodeClick,
  onBackgroundClick,
  selectedNodeId,
  searchQuery,
  highlightedOperators,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const hoveredNodeRef = useRef<string | null>(null);
  const draggedNodeRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const [sigmaInstance, setSigmaInstance] = useState<Sigma | null>(null);
  const [mounted, setMounted] = useState(false);

  // Store filter state in refs so reducers can read current values
  // without needing to be replaced via setSetting()
  const selectedNodeIdRef = useRef<string | null>(selectedNodeId);
  const searchQueryRef = useRef<string>(searchQuery);
  const highlightedOperatorsRef = useRef<string[]>(highlightedOperators);

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
            size: edge.size ?? 1,
            color: edge.color ?? "#1a1a2e",
            type: "curve",
          });
        }
      }
    }

    return graph;
  }, [nodes, edges]);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;

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
      defaultEdgeType: "curve",
      edgeProgramClasses: {
        curve: EdgeCurveProgram,
      },
      defaultDrawNodeLabel: drawDarkLabel,
      defaultDrawNodeHover: drawDarkHover,
      labelFont: "JetBrains Mono, monospace",
      labelSize: 11,
      labelDensity: 0.03,
      labelGridCellSize: 250,
      labelColor: { color: "#c8d0dc" },
      defaultEdgeColor: "#1a1a2e",
      defaultNodeColor: "#6b7280",
      renderLabels: false,
      labelRenderedSizeThreshold: 6,
      nodeReducer: (node, data) => {
        const res = { ...data };
        const hovered = hoveredNodeRef.current;
        const currentSelectedNodeId = selectedNodeIdRef.current;
        const currentSearchQuery = searchQueryRef.current;
        const currentHighlightedOperators = highlightedOperatorsRef.current;

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

        if (hovered) {
          if (node === hovered || graph.areNeighbors(node, hovered)) {
            res.highlighted = true;
          } else {
            res.color = DIM_COLOR;
            res.label = "";
          }
          return res;
        }

        if (currentSelectedNodeId) {
          if (isSelected) {
            res.highlighted = true;
            res.size = (data.size ?? 6) * 1.5;
          } else if (isSelectedNeighbor) {
            res.highlighted = true;
          } else {
            res.color = DIM_COLOR;
            res.label = "";
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
          if (src !== hovered && tgt !== hovered) {
            res.color = DIM_EDGE_COLOR;
            res.hidden = true;
          }
          return res;
        }

        if (currentSelectedNodeId) {
          if (src !== currentSelectedNodeId && tgt !== currentSelectedNodeId) {
            res.color = DIM_EDGE_COLOR;
            res.hidden = true;
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
            res.hidden = true;
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

    // Detect connected components and lay out each one independently
    const components = connectedComponents(graph);
    components.sort((a, b) => b.length - a.length);

    const componentData: { nodes: string[]; radius: number }[] = [];

    for (const componentNodes of components) {
      if (componentNodes.length === 1) {
        graph.setNodeAttribute(componentNodes[0], "x", 0);
        graph.setNodeAttribute(componentNodes[0], "y", 0);
        componentData.push({ nodes: componentNodes, radius: 30 });
        continue;
      }

      // Build subgraph
      const subgraph = new Graph();
      for (const nodeId of componentNodes) {
        subgraph.addNode(nodeId, { ...graph.getNodeAttributes(nodeId) });
      }
      const nodeSet = new Set(componentNodes);
      graph.forEachEdge((edgeKey, attrs, source, target) => {
        if (nodeSet.has(source) && nodeSet.has(target)) {
          subgraph.addEdgeWithKey(edgeKey, source, target, { ...attrs });
        }
      });

      // Seed initial positions in a circle for better convergence
      const initRadius = Math.sqrt(componentNodes.length) * 50;
      componentNodes.forEach((nodeId, idx) => {
        const a = (idx / componentNodes.length) * 2 * Math.PI;
        subgraph.setNodeAttribute(nodeId, "x", Math.cos(a) * initRadius);
        subgraph.setNodeAttribute(nodeId, "y", Math.sin(a) * initRadius);
      });

      forceAtlas2.assign(subgraph, {
        iterations: 400,
        settings: {
          gravity: 0.5,
          scalingRatio: 400,
          barnesHutOptimize: subgraph.order > 50,
          strongGravityMode: false,
          slowDown: 5,
          outboundAttractionDistribution: true,
          adjustSizes: true,
        },
      });

      // Center the component at origin
      let cx = 0, cy = 0;
      for (const nodeId of componentNodes) {
        cx += subgraph.getNodeAttribute(nodeId, "x") as number;
        cy += subgraph.getNodeAttribute(nodeId, "y") as number;
      }
      cx /= componentNodes.length;
      cy /= componentNodes.length;

      // Scale based on average edge length to guarantee visible links
      let totalEdgeLen = 0;
      let edgeCount = 0;
      subgraph.forEachEdge((_e, _a, src, tgt) => {
        const sx = subgraph.getNodeAttribute(src, "x") as number;
        const sy = subgraph.getNodeAttribute(src, "y") as number;
        const tx = subgraph.getNodeAttribute(tgt, "x") as number;
        const ty = subgraph.getNodeAttribute(tgt, "y") as number;
        totalEdgeLen += Math.sqrt((sx - tx) ** 2 + (sy - ty) ** 2);
        edgeCount++;
      });
      const avgEdgeLen = edgeCount > 0 ? totalEdgeLen / edgeCount : 1;
      // Target: average edge should be ~120px so links are clearly visible
      const scale = Math.max(avgEdgeLen > 0 ? 120 / avgEdgeLen : 1, 1.5);

      for (const nodeId of componentNodes) {
        graph.setNodeAttribute(nodeId, "x",
          ((subgraph.getNodeAttribute(nodeId, "x") as number) - cx) * scale
        );
        graph.setNodeAttribute(nodeId, "y",
          ((subgraph.getNodeAttribute(nodeId, "y") as number) - cy) * scale
        );
      }

      // Per-component noverlap for effective overlap removal
      const nGraph = new Graph();
      for (const nodeId of componentNodes) {
        nGraph.addNode(nodeId, { ...graph.getNodeAttributes(nodeId) });
      }
      noverlap.assign(nGraph, {
        maxIterations: 300,
        settings: { margin: 15, ratio: 3 },
      });
      for (const nodeId of componentNodes) {
        graph.setNodeAttribute(nodeId, "x", nGraph.getNodeAttribute(nodeId, "x") as number);
        graph.setNodeAttribute(nodeId, "y", nGraph.getNodeAttribute(nodeId, "y") as number);
      }

      // Compute bounding radius
      let finalRadius = 0;
      for (const nodeId of componentNodes) {
        const x = graph.getNodeAttribute(nodeId, "x") as number;
        const y = graph.getNodeAttribute(nodeId, "y") as number;
        const dist = Math.sqrt(x * x + y * y);
        if (dist > finalRadius) finalRadius = dist;
      }
      componentData.push({ nodes: componentNodes, radius: finalRadius + 40 });
    }

    // Arrange components in a spiral layout (golden angle)
    let angle = 0;
    const largestRadius = componentData[0]?.radius ?? 100;

    for (let i = 0; i < componentData.length; i++) {
      const comp = componentData[i];

      let offsetX: number, offsetY: number;
      if (i === 0) {
        offsetX = 0;
        offsetY = 0;
      } else {
        let spiralR = largestRadius + comp.radius + 120;
        for (let j = 1; j < i; j++) {
          spiralR += componentData[j].radius * 0.4 + 80;
        }
        offsetX = Math.cos(angle) * spiralR;
        offsetY = Math.sin(angle) * spiralR;
        angle += Math.PI * (3 - Math.sqrt(5));
      }

      for (const nodeId of comp.nodes) {
        graph.setNodeAttribute(nodeId, "x",
          (graph.getNodeAttribute(nodeId, "x") as number) + offsetX
        );
        graph.setNodeAttribute(nodeId, "y",
          (graph.getNodeAttribute(nodeId, "y") as number) + offsetY
        );
      }
    }

    renderer.refresh();

    return () => {
      if (sigmaRef.current) {
        sigmaRef.current.kill();
        sigmaRef.current = null;
        graphRef.current = null;
      }
      setSigmaInstance(null);
    };
  }, [mounted, nodes, edges, buildGraphInstance]);

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

  if (!mounted) {
    return (
      <div className="relative w-full h-full bg-[#0a0a12]">
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
      <ZoomControls sigma={sigmaInstance} />
    </div>
  );
}
