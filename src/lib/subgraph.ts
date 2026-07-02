// The subgraph is only used for ACL data (handle roles), which the observer
// database does not track. All other handle data comes from Hasura (hasura.ts).
import { GraphQLClient, gql } from 'graphql-request';
import { getChain } from './chains';
import type { HandleRole } from './types';

const clients = new Map<number, GraphQLClient>();

function getClient(chainId: number): GraphQLClient {
  let client = clients.get(chainId);
  if (!client) {
    client = new GraphQLClient(getChain(chainId).subgraphUrl);
    clients.set(chainId, client);
  }
  return client;
}

const HANDLE_ENRICHMENT_QUERY = gql`
  query FetchHandleEnrichment($id: Bytes!) {
    handle(id: $id) {
      isPubliclyDecryptable
      plaintext
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

const PAGE_SIZE = 1000;

export interface HandleEnrichment {
  isPubliclyDecryptable: boolean;
  plaintext: string | null;
  roles: HandleRole[];
}

export async function fetchHandleEnrichment(
  chainId: number,
  id: string
): Promise<HandleEnrichment | null> {
  const data = await getClient(chainId).request<{
    handle: HandleEnrichment | null;
  }>(HANDLE_ENRICHMENT_QUERY, { id: id.toLowerCase() });
  return data.handle;
}

export async function fetchHandleIdsByAccount(
  chainId: number,
  account: string
): Promise<string[]> {
  const client = getClient(chainId);
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
