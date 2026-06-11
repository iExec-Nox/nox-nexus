'use client';

import {
  Suspense,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ALL_OPERATORS, getChain } from '@/lib/constants';
import { isEthAddress, isTxHash } from '@/lib/search';
import { useHandleData } from '@/lib/use-handle-data';
import { useHandleFiltering } from '@/lib/use-handle-filtering';
import { useNodeSelection } from '@/lib/use-node-selection';
import { useTrace } from '@/lib/use-trace';
import { buildPrimitivesGraph } from '@/lib/trace-graph-adapter';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import GraphStats from '@/components/GraphStats';
import HandleDetailPanel from '@/components/HandleDetailPanel';
import type { TraceResult } from '@/lib/types';
import LoadingOverlay from '@/components/LoadingOverlay';

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

const TraceGraph = dynamic(() => import('@/components/TraceGraph'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[var(--color-deep)]">
      <span className="text-sm text-[var(--color-text-muted)]">
        Initializing graph renderer...
      </span>
    </div>
  ),
});

const DEFAULT_TIMEFRAME_HOURS = 48;

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
  const parsedTimeframe =
    initialTimeframe === 'all'
      ? null
      : initialTimeframe
        ? Number(initialTimeframe) || DEFAULT_TIMEFRAME_HOURS
        : DEFAULT_TIMEFRAME_HOURS;
  const initialChainId = getChain(Number(searchParams.get('chainId'))).chainId;

  const [chainId, setChainId] = useState<number>(initialChainId);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedOperators, setSelectedOperators] = useState<string[]>([
    ...ALL_OPERATORS,
  ]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [timeframeHours, setTimeframeHours] = useState<number | null>(
    parsedTimeframe
  );
  const [highlightUnresolved, setHighlightUnresolved] = useState(false);
  const [txOnlyMode, setTxOnlyMode] = useState(true);
  const [viewMode, setViewMode] = useState<'explorer' | 'primitives'>(
    'explorer'
  );

  // Sync search query and timeframe to URL
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
    params.set('chainId', String(chainId));
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  }, [searchQuery, timeframeHours, chainId, router]);

  const {
    handleCount,
    isLoading,
    loadHandles,
    nodes,
    edges,
    operatorCounts,
    handleStatuses,
    isLoadingStatuses,
    unresolvedCount,
    unresolvedNodeIds,
  } = useHandleData(timeframeHours, chainId, true);

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
    txOnlyMode,
    chainId
  );

  const {
    selectedHandle,
    selectedNodeId,
    selectedHandleResolved,
    isLoadingSelectedStatus,
    selectNode,
    clearSelection,
  } = useNodeSelection(chainId);

  // Inline trace (patient zero detection)
  const {
    ancestors: traceAncestors,
    queriedHandle: traceQueriedHandle,
    isQueriedPatientZero,
    queriedResolved: traceQueriedResolved,
    isTracing,
    trace,
  } = useTrace(chainId);

  const [tracedHandleId, setTracedHandleId] = useState<string | null>(null);

  const traceResult = useMemo<TraceResult | null>(() => {
    if (isTracing || !tracedHandleId) return null;
    const patientZeros = traceAncestors
      .filter((n) => n.isPatientZero)
      .map((n) => ({ id: n.handle.id, operator: n.handle.operator }));
    if (isQueriedPatientZero && traceQueriedHandle) {
      patientZeros.unshift({
        id: tracedHandleId,
        operator: traceQueriedHandle.operator,
      });
    }
    const isHealthy =
      (traceQueriedResolved ?? false) && patientZeros.length === 0;
    return { isHealthy, patientZeros };
  }, [
    isTracing,
    tracedHandleId,
    traceAncestors,
    isQueriedPatientZero,
    traceQueriedHandle,
    traceQueriedResolved,
  ]);

  const handleTrace = useCallback(
    (handleId: string) => {
      setTracedHandleId(handleId);
      trace(handleId);
    },
    [trace]
  );

  // Primitives graph from explorer data
  const primitivesGraph = useMemo(() => {
    if (viewMode !== 'primitives' || filteredNodes.length === 0) return null;
    return buildPrimitivesGraph(filteredNodes, filteredEdges, handleStatuses);
  }, [viewMode, filteredNodes, filteredEdges, handleStatuses]);

  const updateSearch = useCallback(
    (q: string) => {
      setSearchQuery(q);
      const trimmed = q.trim();
      if (isEthAddress(trimmed) || isTxHash(trimmed)) {
        clearSelection();
      }
      if (!isTxHash(trimmed)) {
        setTxOnlyMode(true);
      }
    },
    [clearSelection]
  );

  const handleNodeClick = useCallback(
    async (nodeId: string) => {
      setTracedHandleId(null);
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

  const handleChainChange = useCallback(
    (newChainId: number) => {
      if (newChainId === chainId) return;
      setChainId(newChainId);
      // Handle ids/graph are chain-specific; clear any active search/selection.
      setSearchQuery('');
      setTracedHandleId(null);
      clearSelection();
    },
    [chainId, clearSelection]
  );

  const handleReset = useCallback(() => {
    setSearchQuery('');
    setSelectedOperators([...ALL_OPERATORS]);
    setTimeframeHours(DEFAULT_TIMEFRAME_HOURS);
    setTxOnlyMode(true);
    setViewMode('explorer');
    setTracedHandleId(null);
    clearSelection();
  }, [clearSelection]);

  useEffect(() => {
    if (focusNodeId) {
      selectNode(focusNodeId);
    }
  }, [focusNodeId, selectNode]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        searchQuery={searchQuery}
        onSearchChange={updateSearch}
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
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        chainId={chainId}
        onChainChange={handleChainChange}
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
          {viewMode === 'explorer' ? (
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
          ) : primitivesGraph ? (
            <TraceGraph
              nodes={primitivesGraph.nodes}
              edges={primitivesGraph.edges}
              hasUnresolved={unresolvedCount > 0}
            />
          ) : null}

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
          onAddressSearch={updateSearch}
          isResolved={selectedHandleResolved}
          isLoadingStatus={isLoadingSelectedStatus}
          onTrace={handleTrace}
          traceResult={traceResult}
          isTracing={isTracing}
        />
      </div>

      {isLoading && <LoadingOverlay message="Loading subgraph data..." />}
      {isChainLoading && <LoadingOverlay message="Loading handle chain..." />}
    </div>
  );
}
