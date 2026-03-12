import { GraphQLClient, gql } from "graphql-request";
import { SUBGRAPH_URL } from "./constants";
import type {
  Handle,
  SubgraphHandleResponse,
  SubgraphHandlesResponse,
} from "./types";

const client = new GraphQLClient(SUBGRAPH_URL);

const HANDLES_QUERY = gql`
  query FetchHandles($first: Int!, $skip: Int!) {
    handles(first: $first, skip: $skip, orderBy: id) {
      id
      isPubliclyDecryptable
      plaintext
      operator
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

const RECENT_HANDLE_IDS_QUERY = gql`
  query FetchRecentHandleIds($timestampGte: BigInt!, $first: Int!, $skip: Int!) {
    handleRoles(
      first: $first
      skip: $skip
      orderBy: blockTimestamp
      orderDirection: desc
      where: { blockTimestamp_gte: $timestampGte }
    ) {
      handle {
        id
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

export async function fetchHandlesSince(sinceTimestamp: number): Promise<Handle[]> {
  // Step 1: get all unique handle IDs with roles created since the timestamp
  const handleIdSet = new Set<string>();
  let skip = 0;

  while (true) {
    const data = await client.request<{
      handleRoles: { handle: { id: string } }[];
    }>(RECENT_HANDLE_IDS_QUERY, {
      timestampGte: sinceTimestamp.toString(),
      first: PAGE_SIZE,
      skip,
    });

    for (const role of data.handleRoles) {
      handleIdSet.add(role.handle.id);
    }

    if (data.handleRoles.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  if (handleIdSet.size === 0) return [];

  // Step 2: fetch full handle data for those IDs (batched)
  const allIds = Array.from(handleIdSet);
  const allHandles: Handle[] = [];
  const BATCH = 100; // subgraph _in filter limit

  for (let i = 0; i < allIds.length; i += BATCH) {
    const batchIds = allIds.slice(i, i + BATCH);
    let batchSkip = 0;

    while (true) {
      const data = await client.request<SubgraphHandlesResponse>(HANDLES_BY_IDS_QUERY, {
        ids: batchIds,
        first: PAGE_SIZE,
        skip: batchSkip,
      });

      allHandles.push(...data.handles);
      if (data.handles.length < PAGE_SIZE) break;
      batchSkip += PAGE_SIZE;
    }
  }

  return allHandles;
}

export async function fetchHandleById(
  id: string
): Promise<Handle | null> {
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
