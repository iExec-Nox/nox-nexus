import { GraphQLClient, gql } from 'graphql-request';
import { SUBGRAPH_URL } from './constants';
import type {
  Handle,
  SubgraphHandleResponse,
  SubgraphHandlesResponse,
} from './types';

const client = new GraphQLClient(SUBGRAPH_URL);

const HANDLES_QUERY = gql`
  query FetchHandles($first: Int!, $skip: Int!) {
    handles(first: $first, skip: $skip, orderBy: id) {
      id
      isPubliclyDecryptable
      plaintext
      operator
      blockTimestamp
      transactionHash
      parentHandles {
        id
        operator
      }
      childHandles {
        id
        operator
      }
    }
  }
`;

const HANDLE_BY_ID_QUERY = gql`
  query FetchHandleById($id: Bytes!) {
    handle(id: $id) {
      id
      isPubliclyDecryptable
      plaintext
      operator
      blockTimestamp
      transactionHash
      parentHandles {
        id
        operator
      }
      childHandles {
        id
        operator
      }
      roles {
        id
        account
        role
        grantedBy
        blockNumber
        blockTimestamp
        transactionHash
      }
    }
  }
`;

const HANDLES_SINCE_QUERY = gql`
  query FetchHandlesSince($timestampGte: BigInt!, $first: Int!, $skip: Int!) {
    handles(
      first: $first
      skip: $skip
      orderBy: blockTimestamp
      orderDirection: desc
      where: { blockTimestamp_gte: $timestampGte }
    ) {
      id
      isPubliclyDecryptable
      plaintext
      operator
      blockTimestamp
      transactionHash
      parentHandles {
        id
        operator
      }
      childHandles {
        id
        operator
      }
    }
  }
`;

const HANDLES_BY_IDS_QUERY = gql`
  query FetchHandlesByIds($ids: [Bytes!]!, $first: Int!, $skip: Int!) {
    handles(first: $first, skip: $skip, where: { id_in: $ids }) {
      id
      isPubliclyDecryptable
      plaintext
      operator
      blockTimestamp
      transactionHash
      parentHandles {
        id
        operator
      }
      childHandles {
        id
        operator
      }
    }
  }
`;

const HANDLES_BY_ACCOUNT_QUERY = gql`
  query FetchHandlesByAccount($account: Bytes!, $first: Int!, $skip: Int!) {
    handleRoles(
      first: $first
      skip: $skip
      where: { account: $account, role_in: [ADMIN, VIEWER] }
    ) {
      handle {
        id
      }
    }
  }
`;

const HANDLES_BY_TX_HASH_QUERY = gql`
  query FetchHandlesByTxHash($txHash: Bytes!, $first: Int!, $skip: Int!) {
    handles(first: $first, skip: $skip, where: { transactionHash: $txHash }) {
      id
      isPubliclyDecryptable
      plaintext
      operator
      blockTimestamp
      transactionHash
      parentHandles {
        id
        operator
      }
      childHandles {
        id
        operator
      }
    }
  }
`;

const PAGE_SIZE = 1000;

async function fetchHandles(
  first: number = PAGE_SIZE,
  skip: number = 0
): Promise<Handle[]> {
  const data = await client.request<SubgraphHandlesResponse>(HANDLES_QUERY, {
    first,
    skip,
  });
  return data.handles;
}

export async function fetchAllHandlesPaginated(): Promise<Handle[]> {
  const allHandles: Handle[] = [];
  let skip = 0;

  while (true) {
    const batch = await fetchHandles(PAGE_SIZE, skip);
    allHandles.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }

    skip += PAGE_SIZE;
  }

  return allHandles;
}

const ID_BATCH_SIZE = 100; // subgraph _in filter limit

export async function fetchHandlesByIds(ids: string[]): Promise<Handle[]> {
  const allHandles: Handle[] = [];

  for (let i = 0; i < ids.length; i += ID_BATCH_SIZE) {
    const batchIds = ids.slice(i, i + ID_BATCH_SIZE);
    let batchSkip = 0;

    while (true) {
      const data = await client.request<SubgraphHandlesResponse>(
        HANDLES_BY_IDS_QUERY,
        {
          ids: batchIds,
          first: PAGE_SIZE,
          skip: batchSkip,
        }
      );

      allHandles.push(...data.handles);
      if (data.handles.length < PAGE_SIZE) break;
      batchSkip += PAGE_SIZE;
    }
  }

  return allHandles;
}

export async function fetchHandlesSince(
  sinceTimestamp: number
): Promise<Handle[]> {
  const allHandles: Handle[] = [];
  let skip = 0;

  while (true) {
    const data = await client.request<SubgraphHandlesResponse>(
      HANDLES_SINCE_QUERY,
      {
        timestampGte: sinceTimestamp.toString(),
        first: PAGE_SIZE,
        skip,
      }
    );

    allHandles.push(...data.handles);
    if (data.handles.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return allHandles;
}

export async function fetchHandlesByTxHash(txHash: string): Promise<Handle[]> {
  const allHandles: Handle[] = [];
  let skip = 0;

  while (true) {
    const data = await client.request<SubgraphHandlesResponse>(
      HANDLES_BY_TX_HASH_QUERY,
      {
        txHash: txHash.toLowerCase(),
        first: PAGE_SIZE,
        skip,
      }
    );

    allHandles.push(...data.handles);
    if (data.handles.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return allHandles;
}

// --------------- Auto-detect optimal timeframe ---------------

const HANDLES_COUNT_SINCE_QUERY = gql`
  query CountHandlesSince($timestampGte: BigInt!, $first: Int!) {
    handles(first: $first, where: { blockTimestamp_gte: $timestampGte }) {
      id
    }
  }
`;

const MAX_SAFE_NODES = 3000;
const TIMEFRAME_CANDIDATES = [720, 168, 48, 24, 6, 2, 1];

export async function autoDetectTimeframe(): Promise<number> {
  const now = Math.floor(Date.now() / 1000);
  const results = await Promise.all(
    TIMEFRAME_CANDIDATES.map(async (hours) => {
      const since = now - hours * 3600;
      const data = await client.request<{ handles: { id: string }[] }>(
        HANDLES_COUNT_SINCE_QUERY,
        { timestampGte: since.toString(), first: MAX_SAFE_NODES + 1 }
      );
      return { hours, count: data.handles.length };
    })
  );

  for (const { hours, count } of results) {
    if (count <= MAX_SAFE_NODES) return hours;
  }
  return TIMEFRAME_CANDIDATES[TIMEFRAME_CANDIDATES.length - 1];
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
      for (const p of h.parentHandles ?? []) {
        if (!fetched.has(p.id)) nextIds.add(p.id);
      }
      for (const c of h.childHandles ?? []) {
        if (!fetched.has(c.id)) nextIds.add(c.id);
      }
    }

    toFetch = [...nextIds];
    depth++;
  }

  return Array.from(fetched.values());
}

export async function fetchHandleById(id: string): Promise<Handle | null> {
  const data = await client.request<SubgraphHandleResponse>(
    HANDLE_BY_ID_QUERY,
    { id }
  );
  return data.handle;
}

export async function fetchHandleIdsByAccount(
  account: string
): Promise<string[]> {
  const allIds: string[] = [];
  let skip = 0;

  while (true) {
    const data = await client.request<{
      handleRoles: { handle: { id: string } }[];
    }>(HANDLES_BY_ACCOUNT_QUERY, {
      account: account.toLowerCase(),
      first: PAGE_SIZE,
      skip,
    });

    for (const role of data.handleRoles) {
      allIds.push(role.handle.id);
    }

    if (data.handleRoles.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return [...new Set(allIds)];
}
