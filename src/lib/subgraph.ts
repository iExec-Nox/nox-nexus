import { GraphQLClient, gql } from 'graphql-request';
import { getChain } from './constants';
import type { Handle, SubgraphHandleResponse } from './types';

// The subgraph is now only used on demand, for data the nox-observer Postgres
// database does not store:
//   - fetchHandleById: roles / plaintext / isPubliclyDecryptable for the detail
//     panel when a handle is opened.
//   - fetchHandleIdsByAccount: address search (handleRoles are subgraph-only).
// All bulk graph/relationship/status data comes from Postgres (see handles-repo
// and the /api routes).

const PAGE_SIZE = 1000;

const clients = new Map<string, GraphQLClient>();

function clientFor(chainId: number): GraphQLClient {
  const { subgraphUrl } = getChain(chainId);
  let client = clients.get(subgraphUrl);
  if (!client) {
    client = new GraphQLClient(subgraphUrl);
    clients.set(subgraphUrl, client);
  }
  return client;
}

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

export async function fetchHandleById(
  chainId: number,
  id: string
): Promise<Handle | null> {
  const data = await clientFor(chainId).request<SubgraphHandleResponse>(
    HANDLE_BY_ID_QUERY,
    { id }
  );
  return data.handle;
}

export async function fetchHandleIdsByAccount(
  chainId: number,
  account: string
): Promise<string[]> {
  const allIds: string[] = [];
  let skip = 0;

  while (true) {
    const data = await clientFor(chainId).request<{
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
