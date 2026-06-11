export enum Role {
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER',
}

export interface Handle {
  id: string;
  isPubliclyDecryptable: boolean;
  plaintext: string | null;
  operator: string;
  blockTimestamp: string | null;
  parentHandles: Handle[];
  childHandles: Handle[];
  roles: HandleRole[];
  transactionHash: string | null;
  // Resolution status sourced from Postgres (nox-observer `resolved_at`). Absent
  // on handles fetched from the subgraph (where it is queried separately).
  resolved?: boolean;
}

export interface HandleRole {
  id: string;
  handle: Handle;
  account: string;
  role: Role;
  grantedBy: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface GraphNode {
  id: string;
  label: string;
  size: number;
  color: string;
  operator: string;
  isPubliclyDecryptable: boolean;
  connectionCount: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  color: string;
  size: number;
}

export interface SubgraphHandleResponse {
  handle: Handle | null;
}

export interface SubgraphHandlesResponse {
  handles: Handle[];
}

export interface TraceResult {
  isHealthy: boolean;
  patientZeros: { id: string; operator: string }[];
}

// Maps a handle id to its resolution status (true = resolved). Sourced from
// Postgres (nox-observer `resolved_at`).
export type HandleStatusMap = Record<string, boolean>;
