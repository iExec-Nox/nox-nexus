"use client";

import { useState, useEffect, useCallback } from "react";
import { ALL_OPERATORS } from "@/lib/constants";
import type { LayoutMode } from "@/lib/graph-layouts";
import {
  useHandleData,
  useHandleFiltering,
  useNodeSelection,
  isEthAddress,
  isTxHash,
} from "@/lib/use-handle-data";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOperators, setSelectedOperators] = useState<string[]>([
    ...ALL_OPERATORS,
  ]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("force");
  const [timeframeHours, setTimeframeHours] = useState<number | null>(48);
  const [highlightUnresolved, setHighlightUnresolved] = useState(false);

  const {
    handles,
    isLoading,
    loadHandles,
    nodes,
    edges,
    operatorCounts,
    isLoadingStatuses,
    unresolvedCount,
    unresolvedNodeIds,
  } = useHandleData(timeframeHours);

  const {
    filteredNodes,
    filteredEdges,
    addressFilterIds,
    txFilterIds,
    focusNodeId,
  } = useHandleFiltering(nodes, edges, handles, searchQuery, selectedOperators);

  const {
    selectedHandle,
    selectedNodeId,
    selectedHandleResolved,
    isLoadingSelectedStatus,
    selectNode,
    clearSelection,
  } = useNodeSelection();

  // Clear selection when search changes to address/tx mode
  useEffect(() => {
    const q = searchQuery.trim();
    if (isEthAddress(q) || isTxHash(q)) {
      clearSelection();
    }
  }, [searchQuery, clearSelection]);

  const handleNodeClick = useCallback(async (nodeId: string) => {
    if (!isEthAddress(searchQuery.trim()) && !isTxHash(searchQuery.trim())) {
      setSearchQuery("");
    }
    await selectNode(nodeId);
  }, [selectNode, searchQuery]);

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

  // When search focuses on a node, also select it
  useEffect(() => {
    if (focusNodeId) {
      selectNode(focusNodeId);
    }
  }, [focusNodeId, selectNode]);

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
        isTxSearch={txFilterIds !== null}
        txHandleCount={txFilterIds?.size}
        timeframeHours={timeframeHours}
        onTimeframeChange={setTimeframeHours}
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
          highlightUnresolved={highlightUnresolved}
          onToggleHighlightUnresolved={() => setHighlightUnresolved((p) => !p)}
          unresolvedCount={unresolvedCount}
          isLoadingStatuses={isLoadingStatuses}
        />

        <main className="relative flex-1">
          <GraphCanvas
            nodes={filteredNodes}
            edges={filteredEdges}
            onNodeClick={handleNodeClick}
            onBackgroundClick={clearSelection}
            selectedNodeId={selectedNodeId}
            searchQuery={addressFilterIds !== null || txFilterIds !== null ? "" : searchQuery}
            highlightedOperators={selectedOperators}
            focusNodeId={focusNodeId}
            layoutMode={layoutMode}
            onLayoutChange={setLayoutMode}
            unresolvedNodeIds={highlightUnresolved ? unresolvedNodeIds : undefined}
          />

          <div className="absolute bottom-4 left-4 z-10">
            <GraphStats
              nodeCount={filteredNodes.length}
              edgeCount={filteredEdges.length}
            />
          </div>
        </main>

        <HandleDetailPanel
          handle={selectedHandle}
          onClose={clearSelection}
          onHandleClick={handleNodeClick}
          onAddressSearch={setSearchQuery}
          isResolved={selectedHandleResolved}
          isLoadingStatus={isLoadingSelectedStatus}
        />
      </div>

      {isLoading && <LoadingOverlay message="Loading subgraph data..." />}
    </div>
  );
}
