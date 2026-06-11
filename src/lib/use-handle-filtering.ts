import { useState, useEffect, useMemo, useRef } from 'react';
import type { Handle, GraphNode, GraphEdge } from '@/lib/types';
import { fetchHandleById, fetchHandleIdsByAccount } from '@/lib/subgraph';
import { fetchHandlesByTxHash, fetchHandleChain } from '@/lib/handles-client';
import { buildGraph } from '@/lib/graph-adapter';
import { isEthAddress, isTxHash } from '@/lib/search';

export function useHandleFiltering(
  allNodes: GraphNode[],
  allEdges: GraphEdge[],
  searchQuery: string,
  selectedOperators: string[],
  txOnlyMode: boolean,
  chainId: number
) {
  const [addressFilterIds, setAddressFilterIds] = useState<Set<string> | null>(
    null
  );
  const [txFilterIds, setTxFilterIds] = useState<Set<string> | null>(null);
  const [chainHandles, setChainHandles] = useState<Handle[] | null>(null);
  const [isChainLoading, setIsChainLoading] = useState(false);

  // Ref so the effect only re-runs on searchQuery change, not allNodes
  const allNodesRef = useRef(allNodes);
  allNodesRef.current = allNodes;

  // Detect search type and fetch chain from subgraph
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
          setTxFilterIds(null);
          const ids = await fetchHandleIdsByAccount(chainId, q);
          if (cancelled) return;
          setAddressFilterIds(new Set(ids));
          if (ids.length === 0) {
            setChainHandles([]);
            return;
          }
          const chain = await fetchHandleChain(chainId, ids);
          if (!cancelled) setChainHandles(chain);
        } else if (isTxHash(q)) {
          setAddressFilterIds(null);
          const handle = await fetchHandleById(chainId, q);
          if (cancelled) return;
          if (handle) {
            setTxFilterIds(null);
            const chain = await fetchHandleChain(chainId, [handle.id]);
            if (!cancelled) setChainHandles(chain);
          } else {
            const txHandles = await fetchHandlesByTxHash(chainId, q);
            if (cancelled) return;
            const ids = txHandles.map((h) => h.id);
            setTxFilterIds(new Set(ids));
            if (ids.length === 0) {
              setChainHandles([]);
              return;
            }
            if (txOnlyMode) {
              setChainHandles(txHandles);
            } else {
              const chain = await fetchHandleChain(chainId, ids);
              if (!cancelled) setChainHandles(chain);
            }
          }
        } else {
          setAddressFilterIds(null);
          setTxFilterIds(null);
          const currentNodes = allNodesRef.current;
          const qLower = q.toLowerCase();
          const matches = currentNodes.filter((n) =>
            n.id.toLowerCase().includes(qLower)
          );
          let seedId: string | null = null;
          if (matches.length === 1) {
            seedId = matches[0].id;
          } else {
            const exact = currentNodes.find(
              (n) => n.id.toLowerCase() === qLower
            );
            if (exact) seedId = exact.id;
          }
          if (!seedId) {
            setChainHandles(null);
            return;
          }
          const chain = await fetchHandleChain(chainId, [seedId]);
          if (!cancelled) setChainHandles(chain);
        }
      } catch {
        if (!cancelled) setChainHandles(null);
      } finally {
        if (!cancelled) setIsChainLoading(false);
      }
    };

    if (isEthAddress(q) || isTxHash(q)) {
      doSearch();
      return () => {
        cancelled = true;
      };
    }

    const timer = setTimeout(doSearch, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, txOnlyMode, chainId]);

  const chainGraph = useMemo(() => {
    if (!chainHandles) return null;
    return buildGraph(chainHandles);
  }, [chainHandles]);

  const activeNodes = chainGraph ? chainGraph.nodes : allNodes;
  const activeEdges = chainGraph ? chainGraph.edges : allEdges;

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
    if (
      result.length === prev.length &&
      result.every((e, i) => e.id === prev[i].id)
    ) {
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
