import { GraphQLClient, gql } from 'graphql-request';
import { HASURA_URL } from './chains';
import type { Handle, HandleRef } from './types';

const client = new GraphQLClient(HASURA_URL);

interface HandleRowRef {
  handle_id: string;
  operator: string;
}

interface HandleRow {
  handle_id: string;
  operator: string;
  tx_hash: string | null;
  block_timestamp: string | null;
  resolved_at: string | null;
  parentLinks: { parentHandle: HandleRowRef | null }[];
  childLinks: { childHandle: HandleRowRef | null }[];
}

interface HandlesResponse {
  handles: HandleRow[];
}

const HANDLE_FIELDS = gql`
  fragment HandleFields on handles {
    handle_id
    operator
    tx_hash
    block_timestamp
    resolved_at
    parentLinks {
      parentHandle {
        handle_id
        operator
      }
    }
    childLinks {
      childHandle {
        handle_id
        operator
      }
    }
  }
`;

const HANDLES_QUERY = gql`
  ${HANDLE_FIELDS}
  query FetchHandles($chainId: Int!, $cursor: String!, $limit: Int!) {
    handles(
      where: { chain_id: { _eq: $chainId }, handle_id: { _gt: $cursor } }
      order_by: { handle_id: asc }
      limit: $limit
    ) {
      ...HandleFields
    }
  }
`;

const HANDLES_SINCE_QUERY = gql`
  ${HANDLE_FIELDS}
  query FetchHandlesSince(
    $chainId: Int!
    $since: timestamptz!
    $cursor: String!
    $limit: Int!
  ) {
    handles(
      where: {
        chain_id: { _eq: $chainId }
        handle_id: { _gt: $cursor }
        _or: [
          { block_timestamp: { _gte: $since } }
          { block_timestamp: { _is_null: true } }
        ]
      }
      order_by: { handle_id: asc }
      limit: $limit
    ) {
      ...HandleFields
    }
  }
`;

const HANDLES_BY_IDS_QUERY = gql`
  ${HANDLE_FIELDS}
  query FetchHandlesByIds($ids: [String!]!) {
    handles(where: { handle_id: { _in: $ids } }) {
      ...HandleFields
    }
  }
`;

const HANDLES_BY_TX_HASH_QUERY = gql`
  ${HANDLE_FIELDS}
  query FetchHandlesByTxHash($chainId: Int!, $txHash: String!) {
    handles(where: { chain_id: { _eq: $chainId }, tx_hash: { _eq: $txHash } }) {
      ...HandleFields
    }
  }
`;

const HANDLE_BY_ID_QUERY = gql`
  ${HANDLE_FIELDS}
  query FetchHandleById($id: String!) {
    handles_by_pk(handle_id: $id) {
      ...HandleFields
    }
  }
`;

/**
 * The observer database stores operators in snake_case when they arrive via
 * NATS and in PascalCase when they arrive via the subgraph (e.g. both
 * 'safe_add' and 'SafeAdd' exist). Normalize everything to PascalCase, which
 * is what OPERATOR_COLORS / OPERATOR_LABELS are keyed on.
 */
export function normalizeOperator(operator: string): string {
  if (!operator.includes('_') && /^[A-Z]/.test(operator)) return operator;
  return operator
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function toRef(ref: HandleRowRef): HandleRef {
  return { id: ref.handle_id, operator: normalizeOperator(ref.operator) };
}

// Link endpoints can be null: handle_parents rows are inserted without
// enforced foreign keys, so a link can reference a handle that is not
// observed yet. Skip those until the endpoint catches up.
function toHandle(row: HandleRow): Handle {
  return {
    id: row.handle_id,
    operator: normalizeOperator(row.operator),
    blockTimestamp: row.block_timestamp,
    transactionHash: row.tx_hash,
    isResolved: row.resolved_at !== null,
    parentHandles: row.parentLinks
      .map((l) => l.parentHandle)
      .filter((p): p is HandleRowRef => p !== null)
      .map(toRef),
    childHandles: row.childLinks
      .map((l) => l.childHandle)
      .filter((c): c is HandleRowRef => c !== null)
      .map(toRef),
  };
}

const PAGE_SIZE = 5000;

async function fetchPaginated(
  query: string,
  variables: Record<string, unknown>
): Promise<Handle[]> {
  const allHandles: Handle[] = [];
  let cursor = '';

  while (true) {
    const data = await client.request<HandlesResponse>(query, {
      ...variables,
      cursor,
      limit: PAGE_SIZE,
    });

    allHandles.push(...data.handles.map(toHandle));
    if (data.handles.length < PAGE_SIZE) break;
    cursor = data.handles[data.handles.length - 1].handle_id;
  }

  return allHandles;
}

export async function fetchAllHandlesPaginated(
  chainId: number
): Promise<Handle[]> {
  return fetchPaginated(HANDLES_QUERY, { chainId });
}

// Handles with a NULL block_timestamp arrived via NATS and are not indexed
// by the subgraph poller yet; they are the most recent activity, so every
// timeframe includes them.
export async function fetchHandlesSince(
  chainId: number,
  sinceTimestamp: number
): Promise<Handle[]> {
  const handles = await fetchPaginated(HANDLES_SINCE_QUERY, {
    chainId,
    since: new Date(sinceTimestamp * 1000).toISOString(),
  });

  // One-hop closure: a handle inside the window can be linked to handles
  // outside it (older parents, or NULL-timestamp handles whose relatives are
  // timestamped). Pull those in so every in-window handle renders with its
  // edges instead of appearing as a disconnected dot. Edges of the pulled-in
  // handles pointing further out are dropped client-side.
  const inSet = new Set(handles.map((h) => h.id));
  const missing = new Set<string>();
  for (const h of handles) {
    for (const p of h.parentHandles) if (!inSet.has(p.id)) missing.add(p.id);
    for (const c of h.childHandles) if (!inSet.has(c.id)) missing.add(c.id);
  }
  if (missing.size === 0) return handles;

  const linked = await fetchHandlesByIds([...missing]);
  return [...handles, ...linked];
}

const ID_BATCH_SIZE = 500;

export async function fetchHandlesByIds(ids: string[]): Promise<Handle[]> {
  const allHandles: Handle[] = [];

  for (let i = 0; i < ids.length; i += ID_BATCH_SIZE) {
    const data = await client.request<HandlesResponse>(HANDLES_BY_IDS_QUERY, {
      ids: ids.slice(i, i + ID_BATCH_SIZE),
    });
    allHandles.push(...data.handles.map(toHandle));
  }

  return allHandles;
}

export async function fetchHandlesByTxHash(
  chainId: number,
  txHash: string
): Promise<Handle[]> {
  const data = await client.request<HandlesResponse>(HANDLES_BY_TX_HASH_QUERY, {
    chainId,
    txHash: txHash.toLowerCase(),
  });
  return data.handles.map(toHandle);
}

export async function fetchHandleById(id: string): Promise<Handle | null> {
  const data = await client.request<{ handles_by_pk: HandleRow | null }>(
    HANDLE_BY_ID_QUERY,
    { id: id.toLowerCase() }
  );
  return data.handles_by_pk ? toHandle(data.handles_by_pk) : null;
}

// --------------- Handle chain ---------------

const MAX_CHAIN_DEPTH = 20;

export async function fetchHandleChain(seedIds: string[]): Promise<Handle[]> {
  const fetched = new Map<string, Handle>();
  let toFetch = [...new Set(seedIds)];
  let depth = 0;

  while (toFetch.length > 0 && depth < MAX_CHAIN_DEPTH) {
    const handles = await fetchHandlesByIds(toFetch);
    for (const h of handles) fetched.set(h.id, h);

    const nextIds = new Set<string>();
    for (const h of handles) {
      for (const p of h.parentHandles) {
        if (!fetched.has(p.id)) nextIds.add(p.id);
      }
      for (const c of h.childHandles) {
        if (!fetched.has(c.id)) nextIds.add(c.id);
      }
    }

    toFetch = [...nextIds];
    depth++;
  }

  return Array.from(fetched.values());
}
