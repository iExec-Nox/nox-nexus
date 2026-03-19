import type { Settings } from 'sigma/settings';
import type { NodeDisplayData, PartialButFor } from 'sigma/types';

export type LabelData = PartialButFor<
  NodeDisplayData,
  'x' | 'y' | 'size' | 'label' | 'color'
>;

export const DIM_COLOR = '#202127';
export const DIM_EDGE_COLOR = '#2a2d4a';

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

export function drawDarkLabel(
  context: CanvasRenderingContext2D,
  data: LabelData,
  settings: Settings
): void {
  if (!data.label) return;

  const size = settings.labelSize;
  const font = `${settings.labelFont}`;
  context.font = `500 ${size}px ${font}`;

  const textWidth = context.measureText(data.label).width;
  const px = 6;
  const py = 3;
  const radius = 4;
  const x = data.x + data.size + 4;
  const y = data.y - (size + py * 2) / 2;
  const w = textWidth + px * 2;
  const h = size + py * 2;

  context.beginPath();
  context.roundRect(x, y, w, h, radius);
  context.fillStyle = 'rgba(20, 20, 27, 0.9)';
  context.fill();
  context.strokeStyle = 'rgba(60, 63, 68, 0.6)';
  context.lineWidth = 0.5;
  context.stroke();

  context.fillStyle = '#d3d3d8';
  context.fillText(data.label, x + px, data.y + size / 3);
}

export function drawDarkHover(
  context: CanvasRenderingContext2D,
  data: LabelData,
  settings: Settings
): void {
  const size = data.size;

  context.beginPath();
  context.arc(data.x, data.y, size + 3, 0, Math.PI * 2);
  context.fillStyle = `${data.color}40`;
  context.fill();

  context.beginPath();
  context.arc(data.x, data.y, size, 0, Math.PI * 2);
  context.fillStyle = data.color;
  context.fill();

  if (!data.label) return;

  const fontSize = settings.labelSize + 1;
  const font = `${settings.labelFont}`;
  context.font = `600 ${fontSize}px ${font}`;

  const textWidth = context.measureText(data.label).width;
  const px = 8;
  const py = 4;
  const radius = 5;
  const x = data.x + size + 5;
  const y = data.y - (fontSize + py * 2) / 2;
  const w = textWidth + px * 2;
  const h = fontSize + py * 2;

  context.beginPath();
  context.roundRect(x, y, w, h, radius);
  context.fillStyle = 'rgba(20, 20, 27, 0.95)';
  context.fill();
  context.strokeStyle = `${data.color}60`;
  context.lineWidth = 1;
  context.stroke();

  context.fillStyle = '#ffffff';
  context.fillText(data.label, x + px, data.y + fontSize / 3);
}
