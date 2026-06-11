import { NextRequest, NextResponse } from 'next/server';
import {
  fetchHandleChain,
  fetchHandlesByIds,
  fetchHandlesByTxHash,
} from '@/lib/handles-repo';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import type { Handle } from '@/lib/types';

interface HandlesRequest {
  chainId?: number;
  action: 'chain' | 'byIds' | 'byTxHash';
  ids?: string[];
  txHash?: string;
}

// Server-side endpoint backing the client hooks (search, trace, chain traversal).
// All handle data — including resolution status (`Handle.resolved`) — comes from
// the nox-observer Postgres database via Prisma.
export async function POST(request: NextRequest) {
  let body: HandlesRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const chainId = body.chainId ?? DEFAULT_CHAIN_ID;
  let handles: Handle[];

  switch (body.action) {
    case 'chain':
      handles = await fetchHandleChain(chainId, body.ids ?? []);
      break;
    case 'byIds':
      handles = await fetchHandlesByIds(chainId, body.ids ?? []);
      break;
    case 'byTxHash':
      if (!body.txHash) {
        return NextResponse.json({ error: 'Missing txHash' }, { status: 400 });
      }
      handles = await fetchHandlesByTxHash(chainId, body.txHash);
      break;
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  return NextResponse.json({ handles });
}
