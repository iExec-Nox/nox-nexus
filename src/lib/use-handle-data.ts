import { useState, useEffect, useCallback, useMemo } from 'react';
import type { GraphNode, GraphEdge, HandleStatusMap } from '@/lib/types';

interface GraphApiResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  operatorCounts: Record<string, number>;
  meta: {
    handleCount: number;
    computedAt: number;
  };
}

export function useHandleData(
  chainId: number,
  timeframeHours: number | null,
  enabled: boolean = true
) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [handleCount, setHandleCount] = useState(0);
  const [operatorCounts, setOperatorCounts] = useState<Record<string, number>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(true);

  const loadHandles = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      const timeframe =
        timeframeHours === null ? 'all' : String(timeframeHours);
      const res = await fetch(`/api/graph/${chainId}/${timeframe}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data: GraphApiResponse = await res.json();
      setNodes(data.nodes);
      setEdges(data.edges);
      setHandleCount(data.meta.handleCount);
      setOperatorCounts(data.operatorCounts);
    } catch (err) {
      console.error('Failed to fetch graph:', err);
    } finally {
      setIsLoading(false);
    }
  }, [chainId, timeframeHours, enabled]);

  useEffect(() => {
    setNodes([]);
    setEdges([]);
    setHandleCount(0);
    setOperatorCounts({});
    loadHandles();
  }, [loadHandles]);

  // Resolution statuses ship with the graph payload (resolved_at in the
  // observer database), no separate gateway round-trip needed.
  const handleStatuses = useMemo<HandleStatusMap>(() => {
    const map: HandleStatusMap = {};
    for (const node of nodes) map[node.id] = node.resolved;
    return map;
  }, [nodes]);

  const unresolvedNodeIds = useMemo(
    () => new Set(nodes.filter((n) => !n.resolved).map((n) => n.id)),
    [nodes]
  );

  return {
    handleCount,
    isLoading,
    loadHandles,
    nodes,
    edges,
    operatorCounts,
    handleStatuses,
    unresolvedCount: unresolvedNodeIds.size,
    unresolvedNodeIds,
  };
}
