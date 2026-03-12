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

    componentData.push({ nodes: componentNodes, radius: maxRadius + 80 });
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
      let spiralR = largestRadius + comp.radius + 200;
      for (let j = 1; j < i; j++) {
        spiralR += componentData[j].radius * 0.5 + 120;
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

  const nodeCount = componentNodes.length;

  forceAtlas2.assign(subgraph, {
    iterations: nodeCount < 200 ? 800 : nodeCount < 1000 ? 1200 : 2000,
    settings: {
      gravity: 0.5,
      scalingRatio: nodeCount < 200 ? 400 : nodeCount < 1000 ? 600 : 800,
      barnesHutOptimize: nodeCount > 50,
      barnesHutTheta: 0.5,
      strongGravityMode: false,
      slowDown: 5,
      outboundAttractionDistribution: true,
      adjustSizes: true,
      edgeWeightInfluence: 0.5,
    },
  });

  // Scale up so edges are clearly visible
  const spreadFactor = Math.max(Math.sqrt(nodeCount) * 2.5, 3);
  subgraph.forEachNode((node) => {
    const x = subgraph.getNodeAttribute(node, "x") as number;
    const y = subgraph.getNodeAttribute(node, "y") as number;
    subgraph.setNodeAttribute(node, "x", x * spreadFactor);
    subgraph.setNodeAttribute(node, "y", y * spreadFactor);
  });

  // Remove overlaps with generous margin
  noverlap.assign(subgraph, {
    maxIterations: 200,
    settings: { margin: 25, ratio: 2.5 },
  });

  const positions: PositionMap = new Map();
  for (const nodeId of componentNodes) {
    positions.set(nodeId, {
      x: subgraph.getNodeAttribute(nodeId, "x") as number,
      y: subgraph.getNodeAttribute(nodeId, "y") as number,
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
