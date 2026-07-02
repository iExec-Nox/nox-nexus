import { useState, useCallback, useRef } from 'react';
import type { Handle } from '@/lib/types';
import { fetchHandleById } from '@/lib/hasura';
import { fetchHandleEnrichment } from '@/lib/subgraph';

export function useNodeSelection(chainId: number) {
  const [selectedHandle, setSelectedHandle] = useState<Handle | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedHandleResolved, setSelectedHandleResolved] = useState<
    boolean | null
  >(null);
  const [isLoadingSelectedStatus, setIsLoadingSelectedStatus] = useState(false);

  // Guards against a slow request overwriting a newer selection
  const requestIdRef = useRef(0);

  const selectNode = useCallback(
    async (nodeId: string) => {
      const requestId = ++requestIdRef.current;
      setSelectedNodeId(nodeId);
      setSelectedHandleResolved(null);
      setIsLoadingSelectedStatus(true);
      try {
        const handle = await fetchHandleById(nodeId);
        if (requestId !== requestIdRef.current) return;
        setSelectedHandle(handle);
        setSelectedHandleResolved(handle?.isResolved ?? null);
        setIsLoadingSelectedStatus(false);

        if (!handle) return;

        // ACL data lives in the subgraph only; enrich after the fact so the
        // panel still works when the subgraph is unavailable.
        try {
          const enrichment = await fetchHandleEnrichment(chainId, nodeId);
          if (requestId !== requestIdRef.current) return;
          if (enrichment) setSelectedHandle({ ...handle, ...enrichment });
        } catch {
          // keep the base handle
        }
      } catch {
        if (requestId !== requestIdRef.current) return;
        setSelectedHandle(null);
        setSelectedHandleResolved(null);
        setIsLoadingSelectedStatus(false);
      }
    },
    [chainId]
  );

  const clearSelection = useCallback(() => {
    requestIdRef.current++;
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
