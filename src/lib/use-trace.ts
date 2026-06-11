import { useState, useCallback, useRef } from 'react';
import type { Handle } from '@/lib/types';
import { fetchHandlesByIds } from '@/lib/handles-client';

const INITIAL_DEPTH = 3;
const LOAD_MORE_DEPTH = 3;
const MAX_TRACE_DEPTH = 30;

export interface TraceNode {
  handle: Handle;
  depth: number;
  isResolved: boolean;
  isPatientZero: boolean;
}

interface BfsState {
  frontier: string[];
  visited: Set<string>;
  depth: number;
  traced: TraceNode[];
}

function computePatientZeros(
  traced: TraceNode[],
  queriedHandle: Handle,
  queriedResolved: boolean
) {
  const resolvedIds = new Set(
    traced.filter((n) => n.isResolved).map((n) => n.handle.id)
  );

  for (const node of traced) {
    if (!node.isResolved) {
      const parents = node.handle.parentHandles;
      node.isPatientZero =
        parents.length === 0 || parents.every((p) => resolvedIds.has(p.id));
    }
  }

  const isQueriedPatientZero =
    !queriedResolved &&
    (queriedHandle.parentHandles.length === 0 ||
      queriedHandle.parentHandles.every((p) => resolvedIds.has(p.id)));

  return isQueriedPatientZero;
}

async function bfsStep(
  state: BfsState,
  maxDepth: number,
  chainId: number
): Promise<{ traced: TraceNode[]; newState: BfsState }> {
  const { visited, traced } = state;
  let { frontier, depth } = state;
  const newTraced = [...traced];

  while (frontier.length > 0 && depth <= maxDepth) {
    const handles = await fetchHandlesByIds(chainId, frontier);

    const nextFrontier: string[] = [];

    for (const h of handles) {
      const isResolved = h.resolved ?? false;
      newTraced.push({
        handle: h,
        depth,
        isResolved,
        isPatientZero: false,
      });

      for (const p of h.parentHandles) {
        if (!visited.has(p.id)) {
          visited.add(p.id);
          nextFrontier.push(p.id);
        }
      }
    }

    frontier = nextFrontier;
    depth++;
  }

  return {
    traced: newTraced,
    newState: { frontier, visited, depth, traced: newTraced },
  };
}

export function useTrace(chainId: number) {
  const [queriedHandle, setQueriedHandle] = useState<Handle | null>(null);
  const [queriedResolved, setQueriedResolved] = useState<boolean | null>(null);
  const [isQueriedPatientZero, setIsQueriedPatientZero] = useState(false);
  const [ancestors, setAncestors] = useState<TraceNode[]>([]);
  const [isTracing, setIsTracing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bfsStateRef = useRef<BfsState | null>(null);
  const queriedHandleRef = useRef<Handle | null>(null);
  const queriedResolvedRef = useRef<boolean>(false);

  const trace = useCallback(
    async (handleId: string) => {
      setIsTracing(true);
      setError(null);
      setQueriedHandle(null);
      setQueriedResolved(null);
      setIsQueriedPatientZero(false);
      setAncestors([]);
      setHasMore(false);
      bfsStateRef.current = null;

      try {
        const seed = await fetchHandlesByIds(chainId, [handleId]);
        const handle = seed[0] ?? null;
        const resolved = handle?.resolved ?? false;

        if (!handle) {
          setError('Handle not found');
          return;
        }

        setQueriedHandle(handle);
        setQueriedResolved(resolved);
        queriedHandleRef.current = handle;
        queriedResolvedRef.current = resolved;

        const visited = new Set<string>([handleId]);
        const frontier = handle.parentHandles
          .map((p) => p.id)
          .filter((id) => !visited.has(id));
        frontier.forEach((id) => visited.add(id));

        const initialState: BfsState = {
          frontier,
          visited,
          depth: 1,
          traced: [],
        };

        const { traced, newState } = await bfsStep(
          initialState,
          INITIAL_DEPTH,
          chainId
        );

        const isQPZ = computePatientZeros(traced, handle, resolved);
        setIsQueriedPatientZero(isQPZ);
        setAncestors([...traced]);
        bfsStateRef.current = newState;
        setHasMore(
          newState.frontier.length > 0 && newState.depth <= MAX_TRACE_DEPTH
        );
      } catch {
        setError('Failed to trace handle');
      } finally {
        setIsTracing(false);
      }
    },
    [chainId]
  );

  const loadMore = useCallback(async () => {
    const state = bfsStateRef.current;
    const handle = queriedHandleRef.current;
    if (!state || !handle || state.frontier.length === 0) return;

    setIsLoadingMore(true);
    try {
      const targetDepth = state.depth + LOAD_MORE_DEPTH;
      const { traced, newState } = await bfsStep(
        state,
        Math.min(targetDepth, MAX_TRACE_DEPTH),
        chainId
      );

      const isQPZ = computePatientZeros(
        traced,
        handle,
        queriedResolvedRef.current
      );
      setIsQueriedPatientZero(isQPZ);
      setAncestors([...traced]);
      bfsStateRef.current = newState;
      setHasMore(
        newState.frontier.length > 0 && newState.depth <= MAX_TRACE_DEPTH
      );
    } catch {
      // silent
    } finally {
      setIsLoadingMore(false);
    }
  }, [chainId]);

  const reset = useCallback(() => {
    setQueriedHandle(null);
    setQueriedResolved(null);
    setIsQueriedPatientZero(false);
    setAncestors([]);
    setHasMore(false);
    setError(null);
    bfsStateRef.current = null;
  }, []);

  return {
    queriedHandle,
    queriedResolved,
    isQueriedPatientZero,
    ancestors,
    isTracing,
    isLoadingMore,
    hasMore,
    error,
    trace,
    loadMore,
    reset,
  };
}
