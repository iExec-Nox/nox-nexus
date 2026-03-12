import type { Handle, GraphNode, GraphEdge } from "./types";
import {
  OPERATOR_COLORS,
  NODE_SIZE_BASE,
  NODE_SIZE_PER_CONNECTION,
  NODE_SIZE_MAX,
} from "./constants";

function getOperatorColor(operator: string): string {
  return OPERATOR_COLORS[operator] ?? OPERATOR_COLORS["Default"] ?? "#64748b";
}

function formatLabel(id: string): string {
  if (id.length <= 13) return id;
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
}

function computeNodeSize(connectionCount: number): number {
  // sqrt scale: visually, circle area grows linearly with connections
  const size = NODE_SIZE_BASE + Math.sqrt(connectionCount) * NODE_SIZE_PER_CONNECTION * 2;
  return Math.min(size, NODE_SIZE_MAX);
}

export function buildGraph(handles: Handle[]): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const nodeMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  // First pass: count connections for each handle
  const connectionCounts = new Map<string, number>();
  for (const handle of handles) {
    const parentCount = handle.parentHandles?.length ?? 0;
    const childCount = handle.childHandles?.length ?? 0;
    connectionCounts.set(handle.id, parentCount + childCount);
  }

  // Second pass: build nodes
  for (const handle of handles) {
    const connectionCount = connectionCounts.get(handle.id) ?? 0;
    const operator = handle.operator || "EncryptedInput";
    const color = getOperatorColor(operator);

    const node: GraphNode = {
      id: handle.id,
      label: formatLabel(handle.id),
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      size: computeNodeSize(connectionCount),
      color,
      operator,
      isPubliclyDecryptable: handle.isPubliclyDecryptable,
      connectionCount,
    };

    nodeMap.set(handle.id, node);
  }

  // Third pass: build edges from parent -> handle relationships
  const edgeSet = new Set<string>();

  for (const handle of handles) {
    if (!handle.parentHandles) continue;

    for (const parent of handle.parentHandles) {
      const edgeId = `${parent.id}->${handle.id}`;

      if (edgeSet.has(edgeId)) continue;
      edgeSet.add(edgeId);

      const sourceNode = nodeMap.get(parent.id);
      const sourceColor = sourceNode
        ? sourceNode.color
        : getOperatorColor(parent.operator ?? "Default");

      const edge: GraphEdge = {
        id: edgeId,
        source: parent.id,
        target: handle.id,
        color: `${sourceColor}55`,
        size: 0.2,
      };

      edges.push(edge);
    }
  }

  const nodes = Array.from(nodeMap.values());

  return { nodes, edges };
}
