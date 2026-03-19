export function truncateHandle(id: string): string {
  if (id.length <= 12) return id;
  const clean = id.startsWith('0x') ? id.slice(2) : id;
  if (clean.length <= 10) return id;
  return `0x${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

export function mixWithRed(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(r + (239 - r) * amount);
  const ng = Math.round(g + (68 - g) * amount);
  const nb = Math.round(b + (68 - b) * amount);
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}
