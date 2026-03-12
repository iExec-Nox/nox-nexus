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

const HANDLES_BY_OPERATOR_QUERY = gql`
  query FetchHandlesByOperator($operator: String!, $first: Int!, $skip: Int!) {
    handles(
      first: $first
      skip: $skip
      orderBy: id
      where: { operator: $operator }
    ) {
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

const SEARCH_HANDLES_QUERY = gql`
  query SearchHandles($idGte: Bytes!, $idLt: Bytes!, $first: Int!) {
    handles(first: $first, where: { id_gte: $idGte, id_lt: $idLt }) {
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

const HANDLES_BY_ADMIN_QUERY = gql`
  query FetchHandlesByAdmin($account: Bytes!, $first: Int!, $skip: Int!) {
    handleRoles(
      first: $first
      skip: $skip
      where: { account: $account, role: ADMIN }
    ) {
      handle {
        id
      }
    }
  }
`;

const PAGE_SIZE = 1000;

export async function fetchHandles(
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

export async function fetchHandleById(
  id: string
): Promise<Handle | null> {
  const data = await client.request<SubgraphHandleResponse>(
    HANDLE_BY_ID_QUERY,
    { id }
  );
  return data.handle;
}

export async function fetchHandlesByOperator(
  operator: string,
  first: number = PAGE_SIZE,
  skip: number = 0
): Promise<Handle[]> {
  const data = await client.request<SubgraphHandlesResponse>(
    HANDLES_BY_OPERATOR_QUERY,
    { operator, first, skip }
  );
  return data.handles;
}

/**
 * Increment a hex string by one to create an upper bound for prefix search.
 * For example, "0xab" becomes "0xac".
 */
function incrementHex(hex: string): string {
  const prefix = hex.startsWith("0x") ? "0x" : "";
  const raw = hex.startsWith("0x") ? hex.slice(2) : hex;

  const chars = raw.split("");
  let carry = true;

  for (let i = chars.length - 1; i >= 0 && carry; i--) {
    const val = parseInt(chars[i], 16) + 1;
    if (val > 15) {
      chars[i] = "0";
    } else {
      chars[i] = val.toString(16);
      carry = false;
    }
  }

  if (carry) {
    return prefix + "1" + chars.join("");
  }

  return prefix + chars.join("");
}

export async function fetchHandleIdsByAdmin(
  account: string
): Promise<string[]> {
  const allIds: string[] = [];
  let skip = 0;

  while (true) {
    const data = await client.request<{
      handleRoles: { handle: { id: string } }[];
    }>(HANDLES_BY_ADMIN_QUERY, {
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

export async function searchHandles(
  query: string,
  first: number = 100
): Promise<Handle[]> {
  const normalized = query.startsWith("0x") ? query : `0x${query}`;
  const upperBound = incrementHex(normalized);

  const data = await client.request<SubgraphHandlesResponse>(
    SEARCH_HANDLES_QUERY,
    {
      idGte: normalized,
      idLt: upperBound,
      first,
    }
  );
  return data.handles;
}
