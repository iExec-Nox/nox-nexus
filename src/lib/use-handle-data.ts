import { useState, useEffect, useCallback, useMemo } from 'react';
import type { GraphNode, GraphEdge, HandleStatusMap } from '@/lib/types';

interface GraphApiResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  operatorCounts: Record<string, number>;
  statuses: HandleStatusMap;
  meta: {
    handleCount: number;
    computedAt: number;
  };
}

export function useHandleData(
  timeframeHours: number | null,
  chainId: number,
  enabled: boolean = true
) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [handleCount, setHandleCount] = useState(0);
  const [operatorCounts, setOperatorCounts] = useState<Record<string, number>>(
    {}
  );
  const [handleStatuses, setHandleStatuses] = useState<HandleStatusMap>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadHandles = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      const timeframe =
        timeframeHours === null ? 'all' : String(timeframeHours);
      const res = await fetch(`/api/graph/${timeframe}?chainId=${chainId}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data: GraphApiResponse = await res.json();
      setNodes(data.nodes);
      setEdges(data.edges);
      setHandleCount(data.meta.handleCount);
      setOperatorCounts(data.operatorCounts);
      // Resolution status now arrives with the graph (sourced from Postgres),
      // so no separate gateway request is needed.
      setHandleStatuses(data.statuses ?? {});
    } catch (err) {
      console.error('Failed to fetch graph:', err);
    } finally {
      setIsLoading(false);
    }
  }, [timeframeHours, chainId, enabled]);

  useEffect(() => {
    loadHandles();
  }, [loadHandles]);

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
    handleStatuses,
    isLoadingStatuses: false,
    unresolvedCount,
    unresolvedNodeIds,
  };
}
