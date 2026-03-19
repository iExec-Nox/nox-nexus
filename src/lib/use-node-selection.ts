import { useState, useCallback } from 'react';
import type { Handle } from '@/lib/types';
import { fetchHandleById } from '@/lib/subgraph';
import { fetchSingleHandleStatus } from '@/lib/gateway';

export function useNodeSelection() {
  const [selectedHandle, setSelectedHandle] = useState<Handle | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedHandleResolved, setSelectedHandleResolved] = useState<
    boolean | null
  >(null);
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
