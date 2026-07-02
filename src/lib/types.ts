export enum Role {
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER',
}

export interface HandleRef {
  id: string;
  operator: string;
}

export interface Handle {
  id: string;
  operator: string;
  blockTimestamp: string | null;
  transactionHash: string | null;
  isResolved: boolean;
  parentHandles: HandleRef[];
  childHandles: HandleRef[];
  // ACL enrichment fetched from the subgraph; absent when it is unavailable
  isPubliclyDecryptable?: boolean;
  plaintext?: string | null;
  roles?: HandleRole[];
}

export interface HandleRole {
  id: string;
  account: string;
  role: Role;
  grantedBy: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export type HandleStatusMap = Record<string, boolean>;

export interface GraphNode {
  id: string;
  label: string;
  size: number;
  color: string;
  operator: string;
  resolved: boolean;
  connectionCount: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  color: string;
  size: number;
}

export interface TraceResult {
  isHealthy: boolean;
  patientZeros: { id: string; operator: string }[];
}
