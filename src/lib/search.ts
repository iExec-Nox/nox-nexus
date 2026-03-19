export const isEthAddress = (q: string) => /^0x[0-9a-fA-F]{40}$/.test(q.trim());
export const isTxHash = (q: string) => /^0x[0-9a-fA-F]{64}$/.test(q.trim());
