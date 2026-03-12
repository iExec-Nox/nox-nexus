"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { Handle, GraphNode, GraphEdge } from "@/lib/types";
import { ALL_OPERATORS } from "@/lib/constants";
import {
  fetchAllHandlesPaginated,
  fetchHandleById,
  fetchHandleIdsByAdmin,
} from "@/lib/subgraph";
import { buildGraph } from "@/lib/graph-adapter";
import {
  fetchHandleStatuses,
  fetchSingleHandleStatus,
  type HandleStatusMap,
} from "@/lib/gateway";
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

  const { nodes, edges } = useMemo(() => buildGraph(handles), [handles]);

  const filteredNodes = useMemo(
    () =>
      nodes.filter((n) => {
        if (!selectedOperators.includes(n.operator)) return false;
        if (showUnresolvedOnly && handleStatuses[n.id] !== false) return false;
        return true;
      }),
    [nodes, selectedOperators, showUnresolvedOnly, handleStatuses]
  );

  const filteredNodeIds = useMemo(
    () => new Set(filteredNodes.map((n) => n.id)),
    [filteredNodes]
  );

  const filteredEdges = useMemo(
    () =>
      edges.filter(
        (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
      ),
    [edges, filteredNodeIds]
  );

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
    setSearchQuery("");
    await selectNode(nodeId);
  }, [selectNode]);

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
            searchQuery={searchQuery}
            highlightedOperators={selectedOperators}
            focusNodeId={focusNodeId}
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
          isResolved={selectedHandleResolved}
          isLoadingStatus={isLoadingSelectedStatus}
        />
      </div>

      {isLoading && <LoadingOverlay message="Loading subgraph data..." />}
    </div>
  );
}
