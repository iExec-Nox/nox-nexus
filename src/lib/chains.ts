export const HASURA_URL =
  'https://hasura-testnets.aks-infra-cluster.iex.ec/v1/graphql';

export interface ChainConfig {
  chainId: number;
  name: string;
  /** Subgraph endpoint, only used for ACL data (roles, address search). */
  subgraphUrl: string;
  explorerTxUrl: (txHash: string) => string;
}

export const CHAINS: ChainConfig[] = [
  {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    subgraphUrl:
      'https://thegraph.arbitrum-sepolia-testnet.noxprotocol.io/api/subgraphs/id/BjQAX2HpmsSAzURJimKDhjZZnkSJtaczA8RPumggrStb',
    explorerTxUrl: (txHash) => `https://sepolia.arbiscan.io/tx/${txHash}`,
  },
  {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    subgraphUrl:
      'https://thegraph.ethereum-sepolia-testnet.noxprotocol.io/api/subgraphs/id/9CsccKwvgYFo72zZeU4k4wj2NEBLdWhVE3EUandgmzgo',
    explorerTxUrl: (txHash) => `https://sepolia.etherscan.io/tx/${txHash}`,
  },
];

export const DEFAULT_CHAIN_ID = CHAINS[0].chainId;

export function getChain(chainId: number): ChainConfig {
  const chain = CHAINS.find((c) => c.chainId === chainId);
  if (!chain) throw new Error(`Unsupported chain: ${chainId}`);
  return chain;
}

export function isSupportedChain(chainId: number): boolean {
  return CHAINS.some((c) => c.chainId === chainId);
}
