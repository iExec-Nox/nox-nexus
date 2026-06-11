import { NextRequest } from 'next/server';
import { fetchHandlesSince, fetchAllHandles } from '@/lib/handles-repo';
import { buildGraph } from '@/lib/graph-adapter';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import type { Handle } from '@/lib/types';

export const revalidate = 120;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ timeframe: string }> }
) {
  const { timeframe } = await params;
  const chainId =
    Number(request.nextUrl.searchParams.get('chainId')) || DEFAULT_CHAIN_ID;

  const t0 = performance.now();

  let handles: Handle[];
  if (timeframe === 'all') {
    handles = await fetchAllHandles(chainId);
  } else {
    const hours = Number(timeframe);
    if (!hours || hours <= 0) {
      return Response.json({ error: 'Invalid timeframe' }, { status: 400 });
    }
    const sinceTimestamp = Math.floor(Date.now() / 1000) - hours * 3600;
    handles = await fetchHandlesSince(chainId, sinceTimestamp);
  }

  const t1 = performance.now();

  const { nodes, edges } = buildGraph(handles);

  const t2 = performance.now();

  console.log(
    `[graph/${timeframe}] chain=${chainId} ${handles.length} handles, ${nodes.length} nodes, ${edges.length} edges | ` +
      `postgres: ${((t1 - t0) / 1000).toFixed(1)}s, ` +
      `build: ${((t2 - t1) / 1000).toFixed(1)}s, ` +
      `total: ${((t2 - t0) / 1000).toFixed(1)}s`
  );

  const operatorCounts: Record<string, number> = {};
  for (const node of nodes) {
    operatorCounts[node.operator] = (operatorCounts[node.operator] ?? 0) + 1;
  }

  // Resolution status now comes from Postgres (resolved_at), folded into the
  // graph payload so the client no longer needs a separate gateway round-trip.
  const statuses: Record<string, boolean> = {};
  for (const h of handles) {
    statuses[h.id] = h.resolved ?? false;
  }

  return Response.json({
    nodes,
    edges,
    operatorCounts,
    statuses,
    meta: {
      handleCount: handles.length,
      computedAt: Date.now(),
    },
  });
}
