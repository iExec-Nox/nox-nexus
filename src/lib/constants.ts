export const SUBGRAPH_URL =
  "https://thegraph.arbitrum-sepolia-testnet.noxprotocol.io/api/subgraphs/id/BjQAX2HpmsSAzURJimKDhjZZnkSJtaczA8RPumggrStb";

export const GATEWAY_URL =
  "https://nox-gateway.arbitrum-sepolia-testnet.iex.ec";

export const OPERATOR_COLORS: Record<string, string> = {
  PlaintextToEncrypted: "#c084fc", // bright lavender
  Add: "#3b82f6",                  // blue
  Sub: "#8b5cf6",                  // violet
  Mul: "#22d3ee",                  // cyan
  Div: "#a78bfa",                  // light violet
  Eq: "#6366f1",                   // indigo
  Ne: "#818cf8",                   // periwinkle
  Lt: "#4f46e5",                   // deep indigo
  Le: "#4f46e5",
  Gt: "#4f46e5",
  Ge: "#4f46e5",
  SafeAdd: "#06b6d4",              // dark cyan
  SafeSub: "#0ea5e9",              // sky blue
  SafeMul: "#38bdf8",              // light sky
  SafeDiv: "#38bdf8",
  Select: "#7c3aed",               // violet
  Transfer: "#e879f9",             // pink-magenta
  Mint: "#2dd4bf",                 // teal
  Burn: "#f472b6",                 // pink
  EncryptedInput: "#60a5fa",       // cornflower blue
  Default: "#7c8bb4",              // slate blue
};

export const EDGE_COLOR_TEAL = "#0d9488";
export const EDGE_COLOR_VIOLET = "#7c3aed";

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
