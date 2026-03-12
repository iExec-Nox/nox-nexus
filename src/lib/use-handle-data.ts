import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { Handle, GraphNode, GraphEdge } from "@/lib/types";
import {
  fetchAllHandlesPaginated,
  fetchHandlesSince,
  fetchHandleById,
  fetchHandleIdsByAccount,
} from "@/lib/subgraph";
import { buildGraph } from "@/lib/graph-adapter";
import {
  fetchHandleStatuses,
  fetchSingleHandleStatus,
  type HandleStatusMap,
} from "@/lib/gateway";

const isEthAddress = (q: string) => /^0x[0-9a-fA-F]{40}$/.test(q.trim());
const isTxHash = (q: string) => /^0x[0-9a-fA-F]{64}$/.test(q.trim());

export function useHandleData(timeframeHours: number | null) {
  const [handles, setHandles] = useState<Handle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [handleStatuses, setHandleStatuses] = useState<HandleStatusMap>({});
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);

  const loadHandles = useCallback(async () => {
    setIsLoading(true);
    try {
      let data: Handle[];
      if (timeframeHours !== null) {
        const sinceTimestamp = Math.floor(Date.now() / 1000) - timeframeHours * 3600;
        data = await fetchHandlesSince(sinceTimestamp);
      } else {
        data = await fetchAllHandlesPaginated();
      }
      setHandles(data);
    } catch (err) {
      console.error("Failed to fetch handles:", err);
    } finally {
      setIsLoading(false);
    }
  }, [timeframeHours]);

  useEffect(() => {
    loadHandles();
  }, [loadHandles]);

  useEffect(() => {
    setHandleStatuses({});
    if (handles.length === 0) return;
    const ids = handles.map((h) => h.id);
    setIsLoadingStatuses(true);
    fetchHandleStatuses(ids)
      .then(setHandleStatuses)
      .finally(() => setIsLoadingStatuses(false));
  }, [handles]);

  const { nodes, edges } = useMemo(() => buildGraph(handles), [handles]);

  const operatorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const node of nodes) {
      counts[node.operator] = (counts[node.operator] ?? 0) + 1;
    }
    return counts;
  }, [nodes]);

  const unresolvedCount = useMemo(
    () => Object.values(handleStatuses).filter((r) => r === false).length,
    [handleStatuses]
  );

  const unresolvedNodeIds = useMemo(
    () =>
      new Set(
        Object.entries(handleStatuses)
          .filter(([, resolved]) => resolved === false)
          .map(([id]) => id)
      ),
    [handleStatuses]
  );

  return {
    handles,
    isLoading,
    loadHandles,
    nodes,
    edges,
    operatorCounts,
    handleStatuses,
    isLoadingStatuses,
    unresolvedCount,
    unresolvedNodeIds,
  };
}

export function useHandleFiltering(
  nodes: GraphNode[],
  edges: GraphEdge[],
  handles: Handle[],
  searchQuery: string,
  selectedOperators: string[],
) {
  const [addressFilterIds, setAddressFilterIds] = useState<Set<string> | null>(null);
  const [txFilterIds, setTxFilterIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!isEthAddress(q)) {
      setAddressFilterIds(null);
      return;
    }
    let cancelled = false;
    fetchHandleIdsByAccount(q)
      .then((ids) => { if (!cancelled) setAddressFilterIds(new Set(ids)); })
      .catch(() => { if (!cancelled) setAddressFilterIds(new Set()); });
    return () => { cancelled = true; };
  }, [searchQuery]);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!isTxHash(q)) {
      setTxFilterIds(null);
      return;
    }
    // If the query matches an existing handle ID, don't treat it as a tx hash
    // (handle IDs and tx hashes have the same format: 0x + 64 hex chars)
    const isKnownHandle = handles.some((h) => h.id.toLowerCase() === q);
    if (isKnownHandle) {
      setTxFilterIds(null);
      return;
    }
    const ids = new Set(
      handles.filter((h) => h.transactionHash?.toLowerCase() === q).map((h) => h.id)
    );
    setTxFilterIds(ids);
  }, [searchQuery, handles]);

  const prevFilteredNodeIdsRef = useRef<string[]>([]);
  const prevFilteredNodesRef = useRef<GraphNode[]>([]);
  const prevFilteredEdgesRef = useRef<GraphEdge[]>([]);

  const filteredNodes = useMemo(() => {
    const result = nodes.filter((n) => {
      if (!selectedOperators.includes(n.operator)) return false;
      if (addressFilterIds !== null && !addressFilterIds.has(n.id)) return false;
      if (txFilterIds !== null && !txFilterIds.has(n.id)) return false;
      return true;
    });

    const ids = result.map((n) => n.id);
    const prev = prevFilteredNodeIdsRef.current;
    if (ids.length === prev.length && ids.every((id, i) => id === prev[i])) {
      return prevFilteredNodesRef.current;
    }
    prevFilteredNodeIdsRef.current = ids;
    prevFilteredNodesRef.current = result;
    return result;
  }, [nodes, selectedOperators, addressFilterIds, txFilterIds]);

  const filteredNodeIds = useMemo(
    () => new Set(filteredNodes.map((n) => n.id)),
    [filteredNodes]
  );

  const filteredEdges = useMemo(() => {
    const result = edges.filter(
      (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
    );

    const prev = prevFilteredEdgesRef.current;
    if (result.length === prev.length && result.every((e, i) => e.id === prev[i].id)) {
      return prev;
    }
    prevFilteredEdgesRef.current = result;
    return result;
  }, [edges, filteredNodeIds]);

  const focusNodeId = useMemo(() => {
    if (!searchQuery || searchQuery.length < 6) return null;
    const q = searchQuery.toLowerCase();
    const matches = filteredNodes.filter((n) => n.id.toLowerCase().includes(q));
    if (matches.length === 1) return matches[0].id;
    const exact = filteredNodes.find((n) => n.id.toLowerCase() === q);
    if (exact) return exact.id;
    return null;
  }, [searchQuery, filteredNodes]);

  return {
    filteredNodes,
    filteredEdges,
    addressFilterIds,
    txFilterIds,
    focusNodeId,
  };
}

export function useNodeSelection() {
  const [selectedHandle, setSelectedHandle] = useState<Handle | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedHandleResolved, setSelectedHandleResolved] = useState<boolean | null>(null);
  const [isLoadingSelectedStatus, setIsLoadingSelectedStatus] = useState(false);

  const selectNode = useCallback(async (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setSelectedHandleResolved(null);
    setIsLoadingSelectedStatus(true);
    try {
      const [full, resolved] = await Promise.all([
        fetchHandleById(nodeId),
        fetchSingleHandleStatus(nodeId),
      ]);
      setSelectedHandle(full);
      setSelectedHandleResolved(resolved);
    } catch {
      setSelectedHandle(null);
      setSelectedHandleResolved(null);
    } finally {
      setIsLoadingSelectedStatus(false);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedHandle(null);
  }, []);

  return {
    selectedHandle,
    selectedNodeId,
    selectedHandleResolved,
    isLoadingSelectedStatus,
    selectNode,
    clearSelection,
  };
}

export { isEthAddress, isTxHash };
