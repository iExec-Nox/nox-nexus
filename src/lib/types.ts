export enum Role {
  ADMIN = "ADMIN",
  VIEWER = "VIEWER",
}

export interface Handle {
  id: string;
  isPubliclyDecryptable: boolean;
  plaintext: string | null;
  operator: string;
  parentHandles: Handle[];
  childHandles: Handle[];
  roles: HandleRole[];
  transactionHash: string | null;
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
  x: number;
  y: number;
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
