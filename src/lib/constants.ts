export const SUBGRAPH_URL =
  "https://thegraph.arbitrum-sepolia-testnet.noxprotocol.io/api/subgraphs/id/BjQAX2HpmsSAzURJimKDhjZZnkSJtaczA8RPumggrStb";

export const GATEWAY_URL =
  "https://nox-gateway.arbitrum-sepolia-testnet.iex.ec";

export const OPERATOR_COLORS: Record<string, string> = {
  PlaintextToEncrypted: "#a855f7",
  Add: "#10b981",
  Sub: "#f59e0b",
  Mul: "#3b82f6",
  Div: "#ec4899",
  Eq: "#6366f1",
  Ne: "#6366f1",
  Lt: "#6366f1",
  Le: "#6366f1",
  Gt: "#6366f1",
  Ge: "#6366f1",
  SafeAdd: "#14b8a6",
  SafeSub: "#14b8a6",
  SafeMul: "#14b8a6",
  SafeDiv: "#14b8a6",
  Select: "#f97316",
  Transfer: "#ef4444",
  Mint: "#22c55e",
  Burn: "#dc2626",
  EncryptedInput: "#38bdf8",
  Default: "#64748b",
};

export const OPERATOR_LABELS: Record<string, string> = {
  PlaintextToEncrypted: "Plaintext to Encrypted",
  Add: "Add",
  Sub: "Subtract",
  Mul: "Multiply",
  Div: "Divide",
  Eq: "Equal",
  Ne: "Not Equal",
  Lt: "Less Than",
  Le: "Less or Equal",
  Gt: "Greater Than",
  Ge: "Greater or Equal",
  SafeAdd: "Safe Add",
  SafeSub: "Safe Subtract",
  SafeMul: "Safe Multiply",
  SafeDiv: "Safe Divide",
  Select: "Select",
  Transfer: "Transfer",
  Mint: "Mint",
  Burn: "Burn",
  EncryptedInput: "Encrypted Input",
  Default: "Default",
};

export const OFF_CHAIN_OPS: string[] = [
  "EncryptedInput",
];

export const CORE_PRIMITIVES: string[] = [
  "PlaintextToEncrypted",
  "Add",
  "Sub",
  "Mul",
  "Div",
  "Eq",
  "Ne",
  "Lt",
  "Le",
  "Gt",
  "Ge",
  "SafeAdd",
  "SafeSub",
  "SafeMul",
  "SafeDiv",
  "Select",
];

export const ADVANCED_FUNCTIONS: string[] = [
  "Transfer",
  "Mint",
  "Burn",
];

export const ALL_OPERATORS: string[] = [
  ...OFF_CHAIN_OPS,
  ...CORE_PRIMITIVES,
  ...ADVANCED_FUNCTIONS,
  "Default",
];

export const NODE_SIZE_BASE = 1.5;
export const NODE_SIZE_PER_CONNECTION = 0.8;
export const NODE_SIZE_MAX = 12;
