import 'server-only';

import prisma from '@/lib/prisma';
import type { Handle } from '@/lib/types';

// Server-only data access layer over the nox-observer Postgres database.
//
// Replaces the bulk subgraph queries that used to live in `subgraph.ts`. Every
// function is scoped to a single `chainId` (the observer database is multichain
// via the `handles.chain_id` column). The subgraph is still used elsewhere for
// per-handle roles/plaintext/isPubliclyDecryptable, which Postgres does not store.

const MAX_CHAIN_DEPTH = 20;

type HandleRow = {
  handleId: string;
  operator: string;
  txHash: string | null;
  blockTimestamp: Date | null;
  resolvedAt: Date | null;
};

const HANDLE_SELECT = {
  handleId: true,
  operator: true,
  txHash: true,
  blockTimestamp: true,
  resolvedAt: true,
} as const;

// Subgraph timestamps were unix-second strings; the UI still expects that shape.
function toUnixSeconds(date: Date | null): string | null {
  return date === null ? null : String(Math.floor(date.getTime() / 1000));
}

// Lightweight parent/child reference. Matches what the old subgraph queries
// returned (only `id` + `operator` were ever selected for related handles).
function stubHandle(id: string, operator: string): Handle {
  return {
    id,
    operator,
    isPubliclyDecryptable: false,
    plaintext: null,
    blockTimestamp: null,
    transactionHash: null,
    parentHandles: [],
    childHandles: [],
    roles: [],
  };
}

function buildHandle(
  row: HandleRow,
  parents: Handle[],
  children: Handle[]
): Handle {
  return {
    id: row.handleId,
    operator: row.operator,
    // Not stored by the observer; the real values are fetched on demand from
    // the subgraph when a handle is opened.
    isPubliclyDecryptable: false,
    plaintext: null,
    blockTimestamp: toUnixSeconds(row.blockTimestamp),
    transactionHash: row.txHash,
    parentHandles: parents,
    childHandles: children,
    roles: [],
    resolved: row.resolvedAt !== null,
  };
}

// Assemble full Handle objects from a set of handle rows plus the parent links
// connecting them. Only links whose endpoints are part of `rows` are attached,
// so every edge resolves to a node present in the result.
function assemble(
  rows: HandleRow[],
  links: { childHandleId: string; parentHandleId: string }[]
): Handle[] {
  const byId = new Map(rows.map((r) => [r.handleId, r]));
  const parentsOf = new Map<string, Handle[]>();
  const childrenOf = new Map<string, Handle[]>();

  for (const { childHandleId, parentHandleId } of links) {
    const child = byId.get(childHandleId);
    const parent = byId.get(parentHandleId);
    if (!child || !parent) continue;

    (parentsOf.get(childHandleId) ?? setDefault(parentsOf, childHandleId)).push(
      stubHandle(parentHandleId, parent.operator)
    );
    (
      childrenOf.get(parentHandleId) ?? setDefault(childrenOf, parentHandleId)
    ).push(stubHandle(childHandleId, child.operator));
  }

  return rows.map((r) =>
    buildHandle(
      r,
      parentsOf.get(r.handleId) ?? [],
      childrenOf.get(r.handleId) ?? []
    )
  );
}

function setDefault(map: Map<string, Handle[]>, key: string): Handle[] {
  const arr: Handle[] = [];
  map.set(key, arr);
  return arr;
}

async function linksAmong(
  ids: string[]
): Promise<{ childHandleId: string; parentHandleId: string }[]> {
  if (ids.length === 0) return [];
  return prisma.handleParent.findMany({
    where: {
      AND: [{ childHandleId: { in: ids } }, { parentHandleId: { in: ids } }],
    },
    select: { childHandleId: true, parentHandleId: true },
  });
}

export async function fetchAllHandles(chainId: number): Promise<Handle[]> {
  const rows = await prisma.handle.findMany({
    where: { chainId },
    select: HANDLE_SELECT,
  });
  const links = await linksAmong(rows.map((r) => r.handleId));
  return assemble(rows, links);
}

export async function fetchHandlesSince(
  chainId: number,
  sinceUnix: number
): Promise<Handle[]> {
  const rows = await prisma.handle.findMany({
    where: {
      chainId,
      blockTimestamp: { gte: new Date(sinceUnix * 1000) },
    },
    orderBy: { blockTimestamp: 'desc' },
    select: HANDLE_SELECT,
  });
  const links = await linksAmong(rows.map((r) => r.handleId));
  return assemble(rows, links);
}

export async function fetchHandlesByIds(
  chainId: number,
  ids: string[]
): Promise<Handle[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.handle.findMany({
    where: { chainId, handleId: { in: ids } },
    select: HANDLE_SELECT,
  });
  const links = await linksAmong(rows.map((r) => r.handleId));
  return assemble(rows, links);
}

export async function fetchHandlesByTxHash(
  chainId: number,
  txHash: string
): Promise<Handle[]> {
  const rows = await prisma.handle.findMany({
    where: { chainId, txHash: txHash.toLowerCase() },
    select: HANDLE_SELECT,
  });
  const links = await linksAmong(rows.map((r) => r.handleId));
  return assemble(rows, links);
}

// Walk the full parent/child neighbourhood of the seed handles (both directions),
// up to MAX_CHAIN_DEPTH hops. Mirrors the old subgraph `fetchHandleChain`.
export async function fetchHandleChain(
  chainId: number,
  seedIds: string[]
): Promise<Handle[]> {
  const collected = new Set<string>();
  let frontier = [...new Set(seedIds)];
  let depth = 0;

  while (frontier.length > 0 && depth < MAX_CHAIN_DEPTH) {
    frontier.forEach((id) => collected.add(id));

    const neighbours = await prisma.handleParent.findMany({
      where: {
        OR: [
          { childHandleId: { in: frontier } },
          { parentHandleId: { in: frontier } },
        ],
      },
      select: { childHandleId: true, parentHandleId: true },
    });

    const next = new Set<string>();
    for (const { childHandleId, parentHandleId } of neighbours) {
      if (!collected.has(childHandleId)) next.add(childHandleId);
      if (!collected.has(parentHandleId)) next.add(parentHandleId);
    }

    frontier = [...next];
    depth++;
  }

  // Load every collected handle for this chain, then attach the links among them.
  return fetchHandlesByIds(chainId, [...collected]);
}
