import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Nox Nexus - Handle Explorer for Nox Protocol';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export default function OGImage() {
  const rand = seededRandom(42);

  const colors = [
    '#a855f7',
    '#10b981',
    '#f59e0b',
    '#3b82f6',
    '#ec4899',
    '#6366f1',
    '#14b8a6',
    '#f97316',
    '#ef4444',
    '#22c55e',
    '#38bdf8',
    '#38bdf8',
    '#38bdf8',
  ];

  const clusters = [
    { cx: 600, cy: 280, r: 130, count: 24 },
    { cx: 320, cy: 180, r: 65, count: 10 },
    { cx: 900, cy: 200, r: 75, count: 12 },
    { cx: 380, cy: 420, r: 55, count: 8 },
    { cx: 850, cy: 420, r: 50, count: 7 },
    { cx: 150, cy: 320, r: 35, count: 5 },
    { cx: 1050, cy: 300, r: 40, count: 6 },
  ];

  const nodes: {
    x: number;
    y: number;
    s: number;
    color: string;
    cluster: number;
  }[] = [];

  for (let ci = 0; ci < clusters.length; ci++) {
    const cluster = clusters[ci];
    for (let i = 0; i < cluster.count; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = rand() * cluster.r;
      nodes.push({
        x: Math.round(cluster.cx + Math.cos(angle) * dist),
        y: Math.round(cluster.cy + Math.sin(angle) * dist),
        s: Math.round(4 + rand() * 6),
        color: colors[Math.floor(rand() * colors.length)],
        cluster: ci,
      });
    }
  }

  // Build edges between nearby nodes within each cluster
  const edges: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
  }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i].cluster !== nodes[j].cluster) continue;
      const dx = nodes[j].x - nodes[i].x;
      const dy = nodes[j].y - nodes[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = clusters[nodes[i].cluster].r * 0.8;
      if (dist < maxDist && rand() > 0.4) {
        edges.push({
          x1: nodes[i].x,
          y1: nodes[i].y,
          x2: nodes[j].x,
          y2: nodes[j].y,
          color: nodes[i].color,
        });
      }
    }
  }

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: '#14141b',
        position: 'relative',
      }}
    >
      {/* Edges as thin rotated divs */}
      {edges.map((edge, i) => {
        const dx = edge.x2 - edge.x1;
        const dy = edge.y2 - edge.y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const mx = (edge.x1 + edge.x2) / 2;
        const my = (edge.y1 + edge.y2) / 2;
        return (
          <div
            key={`e${i}`}
            style={{
              position: 'absolute',
              left: mx - length / 2,
              top: my - 0.5,
              width: length,
              height: 1,
              backgroundColor: edge.color,
              opacity: 0.2,
              transform: `rotate(${angle}deg)`,
            }}
          />
        );
      })}

      {/* Nodes as simple colored dots */}
      {nodes.map((node, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: node.x - node.s / 2,
            top: node.y - node.s / 2,
            width: node.s,
            height: node.s,
            borderRadius: 999,
            backgroundColor: node.color,
          }}
        />
      ))}

      {/* Bottom gradient overlay for text readability */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 200,
          display: 'flex',
          background: 'linear-gradient(to top, #14141b, transparent)',
        }}
      />

      {/* Title block */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: 60,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: '#e4e4e8',
            }}
          >
            NOX
          </span>
          <span
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: '#5c73e7',
              marginLeft: 16,
            }}
          >
            NEXUS
          </span>
        </div>
        <span style={{ fontSize: 20, color: '#8888a0', marginTop: 8 }}>
          Handle Explorer for Nox Protocol
        </span>
      </div>
    </div>,
    { ...size }
  );
}
