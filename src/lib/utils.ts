import { OPERATOR_COLORS } from './constants';

export function hexToRgba(hex: string): [number, number, number, number] {
  const c = hex.replace('#', '');
  return [
    parseInt(c.slice(0, 2), 16) / 255,
    parseInt(c.slice(2, 4), 16) / 255,
    parseInt(c.slice(4, 6), 16) / 255,
    1,
  ];
}

export function getOperatorColor(operator: string): string {
  return OPERATOR_COLORS[operator] ?? OPERATOR_COLORS['Default'] ?? '#64748b';
}

export function truncateHex(hex: string, chars = 8): string {
  if (hex.length <= chars * 2 + 2) return hex;
  return `${hex.slice(0, chars + 2)}...${hex.slice(-chars)}`;
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
