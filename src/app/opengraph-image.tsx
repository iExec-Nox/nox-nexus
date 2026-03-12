import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Nox Nexus - Graph Explorer for Nox Protocol";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Deterministic pseudo-random for consistent OG image
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
    "#a855f7", "#10b981", "#f59e0b", "#3b82f6", "#ec4899",
    "#6366f1", "#14b8a6", "#f97316", "#ef4444", "#22c55e",
    "#38bdf8", "#38bdf8", "#38bdf8",
  ];

  // Generate nodes in clusters
  const clusters = [
    { cx: 600, cy: 315, r: 140, count: 28 },
    { cx: 320, cy: 200, r: 70, count: 12 },
    { cx: 900, cy: 220, r: 80, count: 14 },
    { cx: 380, cy: 460, r: 60, count: 10 },
    { cx: 850, cy: 460, r: 55, count: 8 },
    { cx: 150, cy: 350, r: 40, count: 6 },
    { cx: 1050, cy: 340, r: 45, count: 7 },
  ];

  const nodes: { x: number; y: number; size: number; color: string }[] = [];

  for (const cluster of clusters) {
    for (let i = 0; i < cluster.count; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = rand() * cluster.r;
      nodes.push({
        x: cluster.cx + Math.cos(angle) * dist,
        y: cluster.cy + Math.sin(angle) * dist,
        size: 3 + rand() * 5,
        color: colors[Math.floor(rand() * colors.length)],
      });
    }
  }

  // Generate edges between nearby nodes within same cluster
  const edges: { x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
  let nodeIdx = 0;
  for (const cluster of clusters) {
    const clusterNodes = nodes.slice(nodeIdx, nodeIdx + cluster.count);
    for (let i = 0; i < clusterNodes.length; i++) {
      for (let j = i + 1; j < clusterNodes.length; j++) {
        const dx = clusterNodes[i].x - clusterNodes[j].x;
        const dy = clusterNodes[i].y - clusterNodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < cluster.r * 0.8 && rand() > 0.5) {
          edges.push({
            x1: clusterNodes[i].x,
            y1: clusterNodes[i].y,
            x2: clusterNodes[j].x,
            y2: clusterNodes[j].y,
            color: `${clusterNodes[i].color}30`,
          });
        }
      }
    }
    nodeIdx += cluster.count;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #14141b 0%, #1a1a2e 50%, #14141b 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Edges */}
        <svg
          width="1200"
          height="630"
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          {edges.map((edge, i) => (
            <line
              key={`e${i}`}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              stroke={edge.color}
              strokeWidth="1"
            />
          ))}
        </svg>

        {/* Nodes */}
        {nodes.map((node, i) => (
          <div
            key={`n${i}`}
            style={{
              position: "absolute",
              left: node.x - node.size / 2,
              top: node.y - node.size / 2,
              width: node.size,
              height: node.size,
              borderRadius: "50%",
              backgroundColor: node.color,
              boxShadow: `0 0 ${node.size * 2}px ${node.color}60`,
            }}
          />
        ))}

        {/* Overlay gradient for depth */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "radial-gradient(ellipse at center, transparent 30%, #14141b80 100%)",
            display: "flex",
          }}
        />

        {/* Title */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 60,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: "#e4e4e8",
                letterSpacing: "-1px",
              }}
            >
              NOX
            </span>
            <span
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: "#5c73e7",
                letterSpacing: "-1px",
              }}
            >
              NEXUS
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#5c73e7",
                backgroundColor: "#5c73e720",
                padding: "4px 12px",
                borderRadius: 20,
                marginLeft: 8,
              }}
            >
              EXPLORER
            </span>
          </div>
          <span style={{ fontSize: 18, color: "#8888a0" }}>
            Handle Explorer for Nox Protocol
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
