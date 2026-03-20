import type { Handle, GraphNode, GraphEdge } from './types';
import type { TraceNode } from './use-trace';
import type { HandleStatusMap } from './gateway';

export interface TraceOpNode {
  id: string;
  operator: string;
  isResolved: boolean;
  isPatientZero: boolean;
  isQueried: boolean;
}

export interface TraceEdge {
  source: string;
  target: string;
  handleId: string;
  handle: Handle;
  isResolved: boolean;
}

export function buildTraceGraph(
  queriedHandle: Handle,
  queriedResolved: boolean | null,
  isQueriedPatientZero: boolean,
  ancestors: TraceNode[]
): { nodes: TraceOpNode[]; edges: TraceEdge[] } {
  const nodeMap = new Map<string, TraceOpNode>();
  const edges: TraceEdge[] = [];
  const edgeSet = new Set<string>();

  // Build resolution map for edge status
  const resolvedMap = new Map<string, boolean>();
  resolvedMap.set(queriedHandle.id, queriedResolved ?? false);
  for (const a of ancestors) {
    resolvedMap.set(a.handle.id, a.isResolved);
  }

  // Add queried handle as node
  nodeMap.set(queriedHandle.id, {
    id: queriedHandle.id,
    operator: queriedHandle.operator,
    isResolved: queriedResolved ?? false,
    isPatientZero: isQueriedPatientZero,
    isQueried: true,
  });

  // Add ancestors as nodes
  for (const a of ancestors) {
    nodeMap.set(a.handle.id, {
      id: a.handle.id,
      operator: a.handle.operator,
      isResolved: a.isResolved,
      isPatientZero: a.isPatientZero,
      isQueried: false,
    });
  }

  // Build edges: for each handle, connect parent → child
  const allHandles = [queriedHandle, ...ancestors.map((a) => a.handle)];
  for (const handle of allHandles) {
    for (const parent of handle.parentHandles) {
      if (!nodeMap.has(parent.id)) continue;
      const edgeKey = `${parent.id}->${handle.id}`;
      if (edgeSet.has(edgeKey)) continue;
      edgeSet.add(edgeKey);

      edges.push({
        source: parent.id,
        target: handle.id,
        handleId: handle.id,
        handle,
        isResolved: resolvedMap.get(handle.id) ?? false,
      });
    }
  }

  return { nodes: Array.from(nodeMap.values()), edges };
}

const EMPTY_HANDLES: Handle[] = [];
const EMPTY_ROLES: Handle['roles'] = [];

export function buildPrimitivesGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  statuses: HandleStatusMap
): { nodes: TraceOpNode[]; edges: TraceEdge[] } {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const opNodes: TraceOpNode[] = nodes.map((n) => ({
    id: n.id,
    operator: n.operator,
    isResolved: statuses[n.id] ?? true,
    isPatientZero: false,
    isQueried: false,
  }));

  const traceEdges: TraceEdge[] = edges.map((e) => {
    const target = nodeMap.get(e.target);
    return {
      source: e.source,
      target: e.target,
      handleId: e.target,
      handle: {
        id: e.target,
        operator: target?.operator ?? '',
        isPubliclyDecryptable: target?.isPubliclyDecryptable ?? false,
        plaintext: null,
        blockTimestamp: null,
        transactionHash: null,
        parentHandles: EMPTY_HANDLES,
        childHandles: EMPTY_HANDLES,
        roles: EMPTY_ROLES,
      } as Handle,
      isResolved: statuses[e.target] ?? true,
    };
  });

  return { nodes: opNodes, edges: traceEdges };
}
