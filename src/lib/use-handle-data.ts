import { useState, useEffect, useCallback, useMemo } from 'react';
import type { GraphNode, GraphEdge } from '@/lib/types';
import { fetchHandleStatuses, type HandleStatusMap } from '@/lib/gateway';

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
  timeframeHours: number | null,
  enabled: boolean = true
) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [handleCount, setHandleCount] = useState(0);
  const [operatorCounts, setOperatorCounts] = useState<Record<string, number>>(
    {}
  );
  const [handleStatuses, setHandleStatuses] = useState<HandleStatusMap>({});
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadHandles = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      const timeframe =
        timeframeHours === null ? 'all' : String(timeframeHours);
      const res = await fetch(`/api/graph/${timeframe}`);
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
  }, [timeframeHours, enabled]);

  useEffect(() => {
    loadHandles();
  }, [loadHandles]);

  useEffect(() => {
    setHandleStatuses({});
    if (nodes.length === 0) return;
    const ids = nodes.map((n) => n.id);
    setIsLoadingStatuses(true);
    fetchHandleStatuses(ids)
      .then(setHandleStatuses)
      .finally(() => setIsLoadingStatuses(false));
  }, [nodes]);

  const unresolvedNodeIds = useMemo(
    () =>
      new Set(
        Object.entries(handleStatuses)
          .filter(([, resolved]) => resolved === false)
          .map(([id]) => id)
      ),
    [handleStatuses]
  );

  const unresolvedCount = useMemo(
    () => Object.values(handleStatuses).filter((r) => r === false).length,
    [handleStatuses]
  );

  return {
    handleCount,
    isLoading,
    loadHandles,
    nodes,
    edges,
    operatorCounts,
    isLoadingStatuses,
    unresolvedCount,
    unresolvedNodeIds,
  };
}
