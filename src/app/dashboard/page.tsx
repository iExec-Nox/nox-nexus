'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ALL_OPERATORS } from '@/lib/constants';
import {
  useHandleData,
  useHandleFiltering,
  useNodeSelection,
  isEthAddress,
  isTxHash,
} from '@/lib/use-handle-data';
import { autoDetectTimeframe } from '@/lib/subgraph';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import dynamic from 'next/dynamic';
import GraphStats from '@/components/GraphStats';

const GraphCanvas = dynamic(() => import('@/components/GraphCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[var(--color-deep)]">
      <span className="text-sm text-[var(--color-text-muted)]">
        Initializing graph renderer...
      </span>
    </div>
  ),
});
import HandleDetailPanel from '@/components/HandleDetailPanel';
import LoadingOverlay from '@/components/LoadingOverlay';

export default function Home() {
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialSearch = searchParams.get('search') ?? '';
  const initialTimeframe = searchParams.get('timeframe');
  const hasExplicitTimeframe = initialTimeframe !== null;
  const parsedTimeframe =
    initialTimeframe === 'all'
      ? null
      : initialTimeframe
        ? Number(initialTimeframe) || 48
        : null;

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedOperators, setSelectedOperators] = useState<string[]>([
    ...ALL_OPERATORS,
  ]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [timeframeHours, setTimeframeHours] = useState<number | null>(
    parsedTimeframe
  );
  const [isAutoDetecting, setIsAutoDetecting] = useState(!hasExplicitTimeframe);
  const [highlightUnresolved, setHighlightUnresolved] = useState(false);
  const [txOnlyMode, setTxOnlyMode] = useState(true);

  // Auto-detect optimal timeframe on first visit (no ?timeframe in URL)
  useEffect(() => {
    if (hasExplicitTimeframe) return;
    let cancelled = false;
    autoDetectTimeframe().then((hours) => {
      if (cancelled) return;
      setTimeframeHours(hours);
      setIsAutoDetecting(false);
    });
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync search query and timeframe to URL
  // Note: searchParams is intentionally excluded from deps to avoid an
  // infinite loop (router.replace updates searchParams, which would re-trigger).
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const q = searchQuery.trim();
    if (q) {
      params.set('search', q);
    } else {
      params.delete('search');
    }
    if (timeframeHours === null) {
      params.set('timeframe', 'all');
    } else {
      params.set('timeframe', String(timeframeHours));
    }
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  }, [searchQuery, timeframeHours, router]);

  const {
    handleCount,
    isLoading,
    loadHandles,
    nodes,
    edges,
    operatorCounts,
    isLoadingStatuses,
    unresolvedCount,
    unresolvedNodeIds,
  } = useHandleData(timeframeHours, !isAutoDetecting);

  const {
    filteredNodes,
    filteredEdges,
    addressFilterIds,
    txFilterIds,
    focusNodeId,
    isChainLoading,
    isSearchActive,
  } = useHandleFiltering(
    nodes,
    edges,
    searchQuery,
    selectedOperators,
    txOnlyMode
  );

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
    if (!isTxHash(q)) {
      setTxOnlyMode(true);
    }
  }, [searchQuery, clearSelection]);

  const handleNodeClick = useCallback(
    async (nodeId: string) => {
      if (!isEthAddress(searchQuery.trim()) && !isTxHash(searchQuery.trim())) {
        setSearchQuery('');
      }
      await selectNode(nodeId);
    },
    [selectNode, searchQuery]
  );

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

  const handleReset = useCallback(() => {
    setSearchQuery('');
    setSelectedOperators([...ALL_OPERATORS]);
    setTimeframeHours(48);
    setTxOnlyMode(true);
    clearSelection();
  }, [clearSelection]);

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
        onReset={handleReset}
        handleCount={handleCount}
        isLoading={isLoading}
        onRefresh={loadHandles}
        isAddressSearch={addressFilterIds !== null}
        addressHandleCount={addressFilterIds?.size}
        isTxSearch={txFilterIds !== null}
        txHandleCount={txFilterIds?.size}
        txOnlyMode={txOnlyMode}
        onTxOnlyModeChange={setTxOnlyMode}
        timeframeHours={timeframeHours}
        onTimeframeChange={setTimeframeHours}
        isSearchActive={isSearchActive}
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
            searchQuery={
              addressFilterIds !== null || txFilterIds !== null
                ? ''
                : searchQuery
            }
            highlightedOperators={selectedOperators}
            focusNodeId={focusNodeId}
            unresolvedNodeIds={
              highlightUnresolved ? unresolvedNodeIds : undefined
            }
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

      {isAutoDetecting && (
        <LoadingOverlay message="Detecting optimal timeframe..." />
      )}
      {!isAutoDetecting && isLoading && (
        <LoadingOverlay message="Loading subgraph data..." />
      )}
      {isChainLoading && <LoadingOverlay message="Loading handle chain..." />}
    </div>
  );
}
