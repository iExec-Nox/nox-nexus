import type { Handle } from './types';

// Client-side wrappers around the /api/handles endpoint, which reads handle data
// (relationships + resolution status) from the nox-observer Postgres database.
// These replace the bulk subgraph queries that previously ran in the browser.

async function postHandles(body: {
  chainId: number;
  action: 'chain' | 'byIds' | 'byTxHash';
  ids?: string[];
  txHash?: string;
}): Promise<Handle[]> {
  const res = await fetch('/api/handles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`/api/handles error: ${res.status}`);
  const data: { handles: Handle[] } = await res.json();
  return data.handles;
}

export function fetchHandleChain(
  chainId: number,
  seedIds: string[]
): Promise<Handle[]> {
  return postHandles({ chainId, action: 'chain', ids: seedIds });
}

export function fetchHandlesByIds(
  chainId: number,
  ids: string[]
): Promise<Handle[]> {
  return postHandles({ chainId, action: 'byIds', ids });
}

export function fetchHandlesByTxHash(
  chainId: number,
  txHash: string
): Promise<Handle[]> {
  return postHandles({ chainId, action: 'byTxHash', txHash });
}
