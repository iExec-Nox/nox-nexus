"use client";

interface GraphStatsProps {
  nodeCount: number;
  edgeCount: number;
}

export default function GraphStats({
  nodeCount,
  edgeCount,
}: GraphStatsProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-deep)]/80 px-3 py-1.5 backdrop-blur-md">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
        <span className="font-[family-name:var(--font-mono)] text-xs font-medium text-[var(--color-text-primary)]">
          {nodeCount.toLocaleString()}
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)]">
          nodes
        </span>
      </div>
      <div className="h-3 w-px bg-[var(--color-border)]" />
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-dim)]" />
        <span className="font-[family-name:var(--font-mono)] text-xs font-medium text-[var(--color-text-primary)]">
          {edgeCount.toLocaleString()}
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)]">
          edges
        </span>
      </div>
    </div>
  );
}
