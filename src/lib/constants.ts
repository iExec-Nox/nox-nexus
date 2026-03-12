export const SUBGRAPH_URL =
  "https://thegraph.arbitrum-sepolia-testnet.noxprotocol.io/api/subgraphs/id/BjQAX2HpmsSAzURJimKDhjZZnkSJtaczA8RPumggrStb";

export const GATEWAY_URL =
  "https://nox-gateway.arbitrum-sepolia-testnet.iex.ec";

export const OPERATOR_COLORS: Record<string, string> = {
  PlaintextToEncrypted: "#a855f7", // violet
  Add: "#6d8cf7",                  // periwinkle blue
  Sub: "#818cf8",                  // indigo
  Mul: "#3b82f6",                  // blue
  Div: "#7c6ef0",                  // blue-violet
  Eq: "#6366f1",                   // indigo
  Ne: "#7c7cf8",                   // light indigo
  Lt: "#5b5bd6",                   // deep indigo
  Le: "#5b5bd6",
  Gt: "#5b5bd6",
  Ge: "#5b5bd6",
  SafeAdd: "#38bdf8",              // sky blue
  SafeSub: "#47a5f5",              // medium blue
  SafeMul: "#5eaff2",              // soft blue
  SafeDiv: "#5eaff2",
  Select: "#c084fc",               // light purple
  Transfer: "#d970e0",             // magenta-pink
  Mint: "#60a5fa",                 // cornflower blue
  Burn: "#b46eeb",                 // purple
  EncryptedInput: "#22d3ee",       // cyan
  Default: "#7a88a8",              // blue-grey
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
