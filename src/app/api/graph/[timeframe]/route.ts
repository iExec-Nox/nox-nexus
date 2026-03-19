import { NextRequest } from 'next/server';
import { fetchHandlesSince, fetchAllHandlesPaginated } from '@/lib/subgraph';
import { buildGraph } from '@/lib/graph-adapter';

export const revalidate = 120;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ timeframe: string }> }
) {
  const { timeframe } = await params;

  const t0 = performance.now();

  let handles;
  if (timeframe === 'all') {
    handles = await fetchAllHandlesPaginated();
  } else {
    const hours = Number(timeframe);
    if (!hours || hours <= 0) {
      return Response.json({ error: 'Invalid timeframe' }, { status: 400 });
    }
    const sinceTimestamp = Math.floor(Date.now() / 1000) - hours * 3600;
    handles = await fetchHandlesSince(sinceTimestamp);
  }

  const t1 = performance.now();

  const { nodes, edges } = buildGraph(handles);

  const t2 = performance.now();

  console.log(
    `[graph/${timeframe}] ${handles.length} handles, ${nodes.length} nodes, ${edges.length} edges | ` +
      `subgraph: ${((t1 - t0) / 1000).toFixed(1)}s, ` +
      `build: ${((t2 - t1) / 1000).toFixed(1)}s, ` +
      `total: ${((t2 - t0) / 1000).toFixed(1)}s`
  );

  const operatorCounts: Record<string, number> = {};
  for (const node of nodes) {
    operatorCounts[node.operator] = (operatorCounts[node.operator] ?? 0) + 1;
  }

  return Response.json({
    nodes,
    edges,
    operatorCounts,
    meta: {
      handleCount: handles.length,
      computedAt: Date.now(),
    },
  });
}
