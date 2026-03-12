"use client";

import { useState, useEffect, useCallback, useMemo, useRef, type MutableRefObject } from "react";
import type { Handle, GraphNode, GraphEdge } from "@/lib/types";
import { ALL_OPERATORS } from "@/lib/constants";
import {
  fetchAllHandlesPaginated,
  fetchHandleById,
  fetchHandleIdsByAccount,
} from "@/lib/subgraph";
import { buildGraph } from "@/lib/graph-adapter";
import {
  fetchHandleStatuses,
  fetchSingleHandleStatus,
  type HandleStatusMap,
} from "@/lib/gateway";
import type { LayoutMode } from "@/lib/graph-layouts";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import dynamic from "next/dynamic";
import GraphStats from "@/components/GraphStats";

const GraphCanvas = dynamic(() => import("@/components/GraphCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[var(--color-deep)]">
      <span className="text-sm text-[var(--color-text-muted)]">
        Initializing graph renderer...
      </span>
    </div>
  ),
});
import HandleDetailPanel from "@/components/HandleDetailPanel";
import LoadingOverlay from "@/components/LoadingOverlay";

export default function Home() {
  const [handles, setHandles] = useState<Handle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOperators, setSelectedOperators] = useState<string[]>([
    ...ALL_OPERATORS,
  ]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedHandle, setSelectedHandle] = useState<Handle | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [handleStatuses, setHandleStatuses] = useState<HandleStatusMap>({});
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(false);
  const [selectedHandleResolved, setSelectedHandleResolved] = useState<
    boolean | null
  >(null);
  const [isLoadingSelectedStatus, setIsLoadingSelectedStatus] = useState(false);
  const [addressFilterIds, setAddressFilterIds] = useState<Set<string> | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("force");
  const [isLoadingAddressFilter, setIsLoadingAddressFilter] = useState(false);

  const isEthAddress = useCallback(
    (q: string) => /^0x[0-9a-fA-F]{40}$/.test(q.trim()),
    []
  );

  const loadHandles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllHandlesPaginated();
      setHandles(data);
    } catch (err) {
      console.error("Failed to fetch handles:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHandles();
  }, [loadHandles]);

  useEffect(() => {
    if (handles.length === 0) return;
    const ids = handles.map((h) => h.id);
    setIsLoadingStatuses(true);
    fetchHandleStatuses(ids)
      .then(setHandleStatuses)
      .finally(() => setIsLoadingStatuses(false));
  }, [handles]);

  // Fetch handle IDs when an Ethereum address is entered in search
  useEffect(() => {
    const q = searchQuery.trim();
    if (!isEthAddress(q)) {
      setAddressFilterIds(null);
      return;
    }
    // Clear previous handle selection when switching to address search
    setSelectedNodeId(null);
    setSelectedHandle(null);
    let cancelled = false;
    setIsLoadingAddressFilter(true);
    fetchHandleIdsByAccount(q)
      .then((ids) => {
        if (!cancelled) setAddressFilterIds(new Set(ids));
      })
      .catch(() => {
        if (!cancelled) setAddressFilterIds(new Set());
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAddressFilter(false);
      });
    return () => { cancelled = true; };
  }, [searchQuery, isEthAddress]);

  const { nodes, edges } = useMemo(() => buildGraph(handles), [handles]);

  const prevFilteredNodeIdsRef = useRef<string[]>([]);
  const prevFilteredNodesRef = useRef<GraphNode[]>([]);
  const prevFilteredEdgesRef = useRef<GraphEdge[]>([]);

  const filteredNodes = useMemo(() => {
    const result = nodes.filter((n) => {
      if (!selectedOperators.includes(n.operator)) return false;
      if (showUnresolvedOnly && handleStatuses[n.id] !== false) return false;
      if (addressFilterIds !== null && !addressFilterIds.has(n.id)) return false;
      return true;
    });

    // Stabilize reference: return previous array if IDs are identical
    const ids = result.map((n) => n.id);
    const prev = prevFilteredNodeIdsRef.current;
    if (
      ids.length === prev.length &&
      ids.every((id, i) => id === prev[i])
    ) {
      return prevFilteredNodesRef.current;
    }
    prevFilteredNodeIdsRef.current = ids;
    prevFilteredNodesRef.current = result;
    return result;
  }, [nodes, selectedOperators, showUnresolvedOnly, handleStatuses, addressFilterIds]);

  const filteredNodeIds = useMemo(
    () => new Set(filteredNodes.map((n) => n.id)),
    [filteredNodes]
  );

  const filteredEdges = useMemo(() => {
    const result = edges.filter(
      (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
    );

    // Stabilize reference
    const prev = prevFilteredEdgesRef.current;
    if (
      result.length === prev.length &&
      result.every((e, i) => e.id === prev[i].id)
    ) {
      return prev;
    }
    prevFilteredEdgesRef.current = result;
    return result;
  }, [edges, filteredNodeIds]);

  const operatorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const node of nodes) {
      counts[node.operator] = (counts[node.operator] ?? 0) + 1;
    }
    return counts;
  }, [nodes]);

  const unresolvedCount = useMemo(
    () =>
      Object.values(handleStatuses).filter((resolved) => resolved === false)
        .length,
    [handleStatuses]
  );

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

  const handleNodeClick = useCallback(async (nodeId: string) => {
    if (!isEthAddress(searchQuery.trim())) {
      setSearchQuery("");
    }
    await selectNode(nodeId);
  }, [selectNode, searchQuery, isEthAddress]);

  const handleBackgroundClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedHandle(null);
  }, []);

  const handleOperatorToggle = useCallback((op: string) => {
    setSelectedOperators((prev) =>
      prev.includes(op) ? prev.filter((o) => o !== op) : [...prev, op]
    );
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelectedOperators([...ALL_OPERATORS]);
  }, []);

  const handleToggleNone = useCallback(() => {
    setSelectedOperators([]);
  }, []);

  // Detect when search matches exactly one node to focus on it
  const focusNodeId = useMemo(() => {
    if (!searchQuery || searchQuery.length < 6) return null;
    const q = searchQuery.toLowerCase();
    const matches = filteredNodes.filter((n) => n.id.toLowerCase().includes(q));
    if (matches.length === 1) return matches[0].id;
    // Also check exact match
    const exact = filteredNodes.find((n) => n.id.toLowerCase() === q);
    if (exact) return exact.id;
    return null;
  }, [searchQuery, filteredNodes]);

  // When search focuses on a node, also select it (without clearing search)
  useEffect(() => {
    if (focusNodeId) {
      selectNode(focusNodeId);
    }
  }, [focusNodeId, selectNode]);

  const handleDetailClick = useCallback(
    async (id: string) => {
      await handleNodeClick(id);
    },
    [handleNodeClick]
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        handleCount={handles.length}
        isLoading={isLoading}
        onRefresh={loadHandles}
        isAddressSearch={addressFilterIds !== null}
        addressHandleCount={addressFilterIds?.size}
      />

      <div className="relative flex flex-1 overflow-hidden">
        <Sidebar
          operatorCounts={operatorCounts}
          selectedOperators={selectedOperators}
          onOperatorToggle={handleOperatorToggle}
          onToggleAll={handleToggleAll}
          onToggleNone={handleToggleNone}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
          showUnresolvedOnly={showUnresolvedOnly}
          onToggleUnresolved={() => setShowUnresolvedOnly((p) => !p)}
          unresolvedCount={unresolvedCount}
          isLoadingStatuses={isLoadingStatuses}
        />

        <main className="relative flex-1">
          <GraphCanvas
            nodes={filteredNodes}
            edges={filteredEdges}
            onNodeClick={handleNodeClick}
            onBackgroundClick={handleBackgroundClick}
            selectedNodeId={selectedNodeId}
            searchQuery={addressFilterIds !== null ? "" : searchQuery}
            highlightedOperators={selectedOperators}
            focusNodeId={focusNodeId}
            layoutMode={layoutMode}
            onLayoutChange={setLayoutMode}
          />

          <div className="absolute bottom-4 left-4 z-10">
            <GraphStats
              nodeCount={filteredNodes.length}
              edgeCount={filteredEdges.length}
              operatorCounts={operatorCounts}
            />
          </div>
        </main>

        <HandleDetailPanel
          handle={selectedHandle}
          onClose={handleBackgroundClick}
          onHandleClick={handleDetailClick}
          onAddressSearch={setSearchQuery}
          isResolved={selectedHandleResolved}
          isLoadingStatus={isLoadingSelectedStatus}
        />
      </div>

      {isLoading && <LoadingOverlay message="Loading subgraph data..." />}
    </div>
  );
}
