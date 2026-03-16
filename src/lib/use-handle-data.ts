import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { Handle, GraphNode, GraphEdge } from "@/lib/types";
import {
  fetchAllHandlesPaginated,
  fetchHandlesSince,
  fetchHandleById,
  fetchHandleIdsByAccount,
  fetchHandlesByTxHash,
  fetchHandleChain,
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
  browseNodes: GraphNode[],
  browseEdges: GraphEdge[],
  searchQuery: string,
  selectedOperators: string[],
  txOnlyMode: boolean,
) {
  const [addressFilterIds, setAddressFilterIds] = useState<Set<string> | null>(null);
  const [txFilterIds, setTxFilterIds] = useState<Set<string> | null>(null);
  const [chainHandles, setChainHandles] = useState<Handle[] | null>(null);
  const [isChainLoading, setIsChainLoading] = useState(false);

  // Ref so the effect only re-runs on searchQuery change, not browseNodes
  const browseNodesRef = useRef(browseNodes);
  browseNodesRef.current = browseNodes;

  // Single effect: detect search type, fetch chain from subgraph
  useEffect(() => {
    const q = searchQuery.trim();

    if (!q || q.length < 6) {
      setChainHandles(null);
      setAddressFilterIds(null);
      setTxFilterIds(null);
      setIsChainLoading(false);
      return;
    }

    let cancelled = false;

    const doSearch = async () => {
      setIsChainLoading(true);
      try {
        if (isEthAddress(q)) {
          // Address search: fetch account handle IDs → expand chain
          setTxFilterIds(null);
          const ids = await fetchHandleIdsByAccount(q);
          if (cancelled) return;
          setAddressFilterIds(new Set(ids));
          if (ids.length === 0) { setChainHandles([]); return; }
          const chain = await fetchHandleChain(ids);
          if (!cancelled) setChainHandles(chain);
        } else if (isTxHash(q)) {
          // 0x + 64 hex: could be handle ID or tx hash
          setAddressFilterIds(null);
          const handle = await fetchHandleById(q);
          if (cancelled) return;
          if (handle) {
            // It's a known handle ID
            setTxFilterIds(null);
            const chain = await fetchHandleChain([handle.id]);
            if (!cancelled) setChainHandles(chain);
          } else {
            // Not a handle, treat as tx hash
            const txHandles = await fetchHandlesByTxHash(q);
            if (cancelled) return;
            const ids = txHandles.map((h) => h.id);
            setTxFilterIds(new Set(ids));
            if (ids.length === 0) { setChainHandles([]); return; }
            if (txOnlyMode) {
              setChainHandles(txHandles);
            } else {
              const chain = await fetchHandleChain(ids);
              if (!cancelled) setChainHandles(chain);
            }
          }
        } else {
          // Partial handle search: match against loaded browse nodes (via ref)
          setAddressFilterIds(null);
          setTxFilterIds(null);
          const currentNodes = browseNodesRef.current;
          const qLower = q.toLowerCase();
          const matches = currentNodes.filter((n) => n.id.toLowerCase().includes(qLower));
          let seedId: string | null = null;
          if (matches.length === 1) {
            seedId = matches[0].id;
          } else {
            const exact = currentNodes.find((n) => n.id.toLowerCase() === qLower);
            if (exact) seedId = exact.id;
          }
          if (!seedId) { setChainHandles(null); return; }
          const chain = await fetchHandleChain([seedId]);
          if (!cancelled) setChainHandles(chain);
        }
      } catch {
        if (!cancelled) setChainHandles(null);
      } finally {
        if (!cancelled) setIsChainLoading(false);
      }
    };

    // Immediate for exact matches (address/tx/handle), debounce for partial
    if (isEthAddress(q) || isTxHash(q)) {
      doSearch();
      return () => { cancelled = true; };
    }

    const timer = setTimeout(doSearch, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQuery, txOnlyMode]);

  // Build graph from chain-fetched handles
  const chainGraph = useMemo(() => {
    if (!chainHandles) return null;
    return buildGraph(chainHandles);
  }, [chainHandles]);

  // When search is active, use chain data; otherwise use browse data
  const activeNodes = chainGraph ? chainGraph.nodes : browseNodes;
  const activeEdges = chainGraph ? chainGraph.edges : browseEdges;

  const prevFilteredNodeIdsRef = useRef<string[]>([]);
  const prevFilteredNodesRef = useRef<GraphNode[]>([]);
  const prevFilteredEdgesRef = useRef<GraphEdge[]>([]);

  const filteredNodes = useMemo(() => {
    const result = activeNodes.filter((n) =>
      selectedOperators.includes(n.operator)
    );

    const ids = result.map((n) => n.id);
    const prev = prevFilteredNodeIdsRef.current;
    if (ids.length === prev.length && ids.every((id, i) => id === prev[i])) {
      return prevFilteredNodesRef.current;
    }
    prevFilteredNodeIdsRef.current = ids;
    prevFilteredNodesRef.current = result;
    return result;
  }, [activeNodes, selectedOperators]);

  const filteredNodeIds = useMemo(
    () => new Set(filteredNodes.map((n) => n.id)),
    [filteredNodes]
  );

  const filteredEdges = useMemo(() => {
    const result = activeEdges.filter(
      (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
    );

    const prev = prevFilteredEdgesRef.current;
    if (result.length === prev.length && result.every((e, i) => e.id === prev[i].id)) {
      return prev;
    }
    prevFilteredEdgesRef.current = result;
    return result;
  }, [activeEdges, filteredNodeIds]);

  const focusNodeId = useMemo(() => {
    if (!searchQuery || searchQuery.length < 6) return null;
    const q = searchQuery.toLowerCase();
    const matches = filteredNodes.filter((n) => n.id.toLowerCase().includes(q));
    if (matches.length === 1) return matches[0].id;
    const exact = filteredNodes.find((n) => n.id.toLowerCase() === q);
    if (exact) return exact.id;
    return null;
  }, [searchQuery, filteredNodes]);

  const isSearchActive = chainGraph !== null;

  return {
    filteredNodes,
    filteredEdges,
    addressFilterIds,
    txFilterIds,
    focusNodeId,
    isChainLoading,
    isSearchActive,
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
