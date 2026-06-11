export interface ChainConfig {
  chainId: number;
  name: string;
  // Subgraph endpoint for this chain. Used on demand (handle detail, address
  // search) for fields the observer database does not store: roles, plaintext,
  // isPubliclyDecryptable. Bulk graph data comes from Postgres instead.
  subgraphUrl: string;
}

// Chains served by nox-observer (multichain via handles.chain_id). Keep the
// chainId keys aligned with the observer's NOX_OBSERVER_SUBGRAPH__CHAINS__<id>.
export const CHAINS: ChainConfig[] = [
  {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    subgraphUrl:
      'https://thegraph.arbitrum-sepolia-testnet.noxprotocol.io/api/subgraphs/id/BjQAX2HpmsSAzURJimKDhjZZnkSJtaczA8RPumggrStb',
  },
  {
    // chainId matches the observer's NOX_OBSERVER_SUBGRAPH__CHAINS__1 key, which
    // is what gets written to handles.chain_id for this network.
    chainId: 1,
    name: 'Ethereum Sepolia',
    subgraphUrl:
      'https://thegraph.ethereum-sepolia-testnet.noxprotocol.io/api/subgraphs/id/9CsccKwvgYFo72zZeU4k4wj2NEBLdWhVE3EUandgmzgo',
  },
];

export const DEFAULT_CHAIN_ID = CHAINS[0].chainId;

export function getChain(chainId: number): ChainConfig {
  return CHAINS.find((c) => c.chainId === chainId) ?? CHAINS[0];
}

export const OPERATOR_COLORS: Record<string, string> = {
  PlaintextToEncrypted: '#c084fc', // bright lavender
  Add: '#3b82f6', // blue
  Sub: '#8b5cf6', // violet
  Mul: '#22d3ee', // cyan
  Div: '#a78bfa', // light violet
  Eq: '#6366f1', // indigo
  Ne: '#818cf8', // periwinkle
  Lt: '#4f46e5', // deep indigo
  Le: '#4f46e5',
  Gt: '#4f46e5',
  Ge: '#4f46e5',
  SafeAdd: '#06b6d4', // dark cyan
  SafeSub: '#0ea5e9', // sky blue
  SafeMul: '#38bdf8', // light sky
  SafeDiv: '#38bdf8',
  Select: '#7c3aed', // violet
  WrapAsPublicHandle: '#f59e0b', // amber
  Transfer: '#e879f9', // pink-magenta
  Mint: '#2dd4bf', // teal
  Burn: '#f472b6', // pink
  EncryptedInput: '#60a5fa', // cornflower blue
  Default: '#7c8bb4', // slate blue
};

export const OPERATOR_LABELS: Record<string, string> = {
  PlaintextToEncrypted: 'Plaintext to Encrypted',
  Add: 'Add',
  Sub: 'Subtract',
  Mul: 'Multiply',
  Div: 'Divide',
  Eq: 'Equal',
  Ne: 'Not Equal',
  Lt: 'Less Than',
  Le: 'Less or Equal',
  Gt: 'Greater Than',
  Ge: 'Greater or Equal',
  SafeAdd: 'Safe Add',
  SafeSub: 'Safe Subtract',
  SafeMul: 'Safe Multiply',
  SafeDiv: 'Safe Divide',
  Select: 'Select',
  WrapAsPublicHandle: 'Wrap As Public Handle',
  Transfer: 'Transfer',
  Mint: 'Mint',
  Burn: 'Burn',
  EncryptedInput: 'Encrypted Input',
  Default: 'Default',
};

export const OFF_CHAIN_OPS: string[] = ['EncryptedInput'];

export const CORE_PRIMITIVES: string[] = [
  'PlaintextToEncrypted',
  'Add',
  'Sub',
  'Mul',
  'Div',
  'Eq',
  'Ne',
  'Lt',
  'Le',
  'Gt',
  'Ge',
  'SafeAdd',
  'SafeSub',
  'SafeMul',
  'SafeDiv',
  'Select',
  'WrapAsPublicHandle',
];

export const ADVANCED_FUNCTIONS: string[] = ['Transfer', 'Mint', 'Burn'];

export const ALL_OPERATORS: string[] = [
  ...OFF_CHAIN_OPS,
  ...CORE_PRIMITIVES,
  ...ADVANCED_FUNCTIONS,
  'Default',
];

export const NODE_SIZE_BASE = 1.5;
export const NODE_SIZE_PER_CONNECTION = 0.8;
export const NODE_SIZE_MAX = 12;
