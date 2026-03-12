import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import noverlap from "graphology-layout-noverlap";
import { connectedComponents } from "graphology-components";

export type LayoutMode = "force" | "circular" | "grid" | "radial";

export const LAYOUT_OPTIONS: { value: LayoutMode; label: string }[] = [
  { value: "force", label: "Force-directed" },
  { value: "circular", label: "Circular" },
  { value: "grid", label: "Grid" },
  { value: "radial", label: "Radial" },
];

type PositionMap = Map<string, { x: number; y: number }>;

/**
 * Compute positions for each node in the graph according to the given layout mode.
 * Returns a map of nodeId -> {x, y}.
 */
export function computeLayout(graph: Graph, mode: LayoutMode): PositionMap {
  const components = connectedComponents(graph);
  components.sort((a, b) => b.length - a.length);

  const positions: PositionMap = new Map();
  const componentData: { nodes: string[]; radius: number }[] = [];

  for (const componentNodes of components) {
    if (componentNodes.length === 1) {
      positions.set(componentNodes[0], { x: 0, y: 0 });
      componentData.push({ nodes: componentNodes, radius: 30 });
      continue;
    }

    let compPositions: PositionMap;
    switch (mode) {
      case "circular":
        compPositions = layoutCircular(graph, componentNodes);
        break;
      case "grid":
        compPositions = layoutGrid(graph, componentNodes);
        break;
      case "radial":
        compPositions = layoutRadial(graph, componentNodes);
        break;
      case "force":
      default:
        compPositions = layoutForce(graph, componentNodes);
        break;
    }

    // Center the component at origin
    let cx = 0, cy = 0;
    compPositions.forEach((pos) => { cx += pos.x; cy += pos.y; });
    cx /= compPositions.size;
    cy /= compPositions.size;

    let maxRadius = 0;
    compPositions.forEach((pos, nodeId) => {
      const x = pos.x - cx;
      const y = pos.y - cy;
      positions.set(nodeId, { x, y });
      const dist = Math.sqrt(x * x + y * y);
      if (dist > maxRadius) maxRadius = dist;
    });

    componentData.push({ nodes: componentNodes, radius: maxRadius + 40 });
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
      const pos = positions.get(nodeId)!;
      positions.set(nodeId, { x: pos.x + offsetX, y: pos.y + offsetY });
    }
  }

  return positions;
}

// --- Layout implementations ---

function buildSubgraph(graph: Graph, componentNodes: string[]): Graph {
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
  return subgraph;
}

function layoutForce(graph: Graph, componentNodes: string[]): PositionMap {
  const subgraph = buildSubgraph(graph, componentNodes);

  const initSpread = Math.sqrt(componentNodes.length) * 40;
  componentNodes.forEach((nodeId) => {
    subgraph.setNodeAttribute(nodeId, "x", (Math.random() - 0.5) * initSpread);
    subgraph.setNodeAttribute(nodeId, "y", (Math.random() - 0.5) * initSpread);
  });

  forceAtlas2.assign(subgraph, {
    iterations: 600,
    settings: {
      gravity: 1.5,
      scalingRatio: 200,
      barnesHutOptimize: subgraph.order > 50,
      strongGravityMode: true,
      slowDown: 8,
      outboundAttractionDistribution: true,
      adjustSizes: true,
    },
  });

  // Scale based on average edge length
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
  const scale = Math.max(avgEdgeLen > 0 ? 120 / avgEdgeLen : 1, 1.5);

  // Apply noverlap
  const nGraph = new Graph();
  for (const nodeId of componentNodes) {
    const x = (subgraph.getNodeAttribute(nodeId, "x") as number) * scale;
    const y = (subgraph.getNodeAttribute(nodeId, "y") as number) * scale;
    nGraph.addNode(nodeId, { ...subgraph.getNodeAttributes(nodeId), x, y });
  }
  noverlap.assign(nGraph, {
    maxIterations: 300,
    settings: { margin: 15, ratio: 3 },
  });

  const positions: PositionMap = new Map();
  for (const nodeId of componentNodes) {
    positions.set(nodeId, {
      x: nGraph.getNodeAttribute(nodeId, "x") as number,
      y: nGraph.getNodeAttribute(nodeId, "y") as number,
    });
  }
  return positions;
}

function layoutCircular(graph: Graph, componentNodes: string[]): PositionMap {
  const subgraph = buildSubgraph(graph, componentNodes);
  const positions: PositionMap = new Map();

  // Sort by degree (most connected at top) for a more meaningful arrangement
  const sorted = [...componentNodes].sort(
    (a, b) => subgraph.degree(b) - subgraph.degree(a)
  );

  const radius = Math.max(sorted.length * 8, 80);
  sorted.forEach((nodeId, idx) => {
    const a = (idx / sorted.length) * 2 * Math.PI - Math.PI / 2;
    positions.set(nodeId, {
      x: Math.cos(a) * radius,
      y: Math.sin(a) * radius,
    });
  });

  return positions;
}

function layoutGrid(graph: Graph, componentNodes: string[]): PositionMap {
  const subgraph = buildSubgraph(graph, componentNodes);
  const positions: PositionMap = new Map();

  // Sort by degree for coherent grouping
  const sorted = [...componentNodes].sort(
    (a, b) => subgraph.degree(b) - subgraph.degree(a)
  );

  const cols = Math.ceil(Math.sqrt(sorted.length));
  const spacing = 50;

  sorted.forEach((nodeId, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    positions.set(nodeId, {
      x: col * spacing,
      y: row * spacing,
    });
  });

  return positions;
}

function layoutRadial(graph: Graph, componentNodes: string[]): PositionMap {
  const subgraph = buildSubgraph(graph, componentNodes);
  const positions: PositionMap = new Map();

  // Find the most connected node as center
  let centerNode = componentNodes[0];
  let maxDegree = 0;
  for (const nodeId of componentNodes) {
    const deg = subgraph.degree(nodeId);
    if (deg > maxDegree) {
      maxDegree = deg;
      centerNode = nodeId;
    }
  }

  // BFS from center to assign layers
  const layers: string[][] = [];
  const visited = new Set<string>();
  visited.add(centerNode);
  layers.push([centerNode]);

  let frontier = [centerNode];
  while (frontier.length > 0) {
    const nextFrontier: string[] = [];
    for (const node of frontier) {
      for (const neighbor of subgraph.neighbors(node)) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          nextFrontier.push(neighbor);
        }
      }
    }
    if (nextFrontier.length > 0) {
      layers.push(nextFrontier);
    }
    frontier = nextFrontier;
  }

  // Place center
  positions.set(centerNode, { x: 0, y: 0 });

  // Place each layer in concentric rings
  const ringSpacing = 80;
  for (let i = 1; i < layers.length; i++) {
    const layer = layers[i];
    const radius = i * ringSpacing;
    layer.forEach((nodeId, idx) => {
      const a = (idx / layer.length) * 2 * Math.PI - Math.PI / 2;
      positions.set(nodeId, {
        x: Math.cos(a) * radius,
        y: Math.sin(a) * radius,
      });
    });
  }

  return positions;
}
