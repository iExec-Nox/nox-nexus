import { useState, useCallback } from 'react';
import type { Handle } from '@/lib/types';
import { fetchHandleById } from '@/lib/subgraph';
import { fetchHandlesByIds } from '@/lib/handles-client';

export function useNodeSelection(chainId: number) {
  const [selectedHandle, setSelectedHandle] = useState<Handle | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedHandleResolved, setSelectedHandleResolved] = useState<
    boolean | null
  >(null);
  const [isLoadingSelectedStatus, setIsLoadingSelectedStatus] = useState(false);

  const selectNode = useCallback(
    async (nodeId: string) => {
      setSelectedNodeId(nodeId);
      setSelectedHandleResolved(null);
      setIsLoadingSelectedStatus(true);
      try {
        // Detail fields (roles, plaintext, isPubliclyDecryptable) come from the
        // subgraph; the resolution status comes from Postgres.
        const [full, fromDb] = await Promise.all([
          fetchHandleById(chainId, nodeId),
          fetchHandlesByIds(chainId, [nodeId]),
        ]);
        setSelectedHandle(full);
        setSelectedHandleResolved(fromDb[0]?.resolved ?? false);
      } catch {
        setSelectedHandle(null);
        setSelectedHandleResolved(null);
      } finally {
        setIsLoadingSelectedStatus(false);
      }
    },
    [chainId]
  );

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
