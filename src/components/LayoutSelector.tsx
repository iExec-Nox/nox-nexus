"use client";

import { Network, Circle, Grid3X3, Sun } from "lucide-react";
import { type LayoutMode, LAYOUT_OPTIONS } from "@/lib/graph-layouts";

interface LayoutSelectorProps {
  layoutMode: LayoutMode;
  onLayoutChange: (mode: LayoutMode) => void;
}

const ICONS: Record<LayoutMode, typeof Network> = {
  force: Network,
  circular: Circle,
  grid: Grid3X3,
  radial: Sun,
};

export default function LayoutSelector({
  layoutMode,
  onLayoutChange,
}: LayoutSelectorProps) {
  const btnClass = (active: boolean) =>
    `flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-200 cursor-pointer ${
      active
        ? "border-[var(--color-accent-dim)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
        : "border-[var(--color-border)] bg-[var(--color-deep)]/80 backdrop-blur-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent-dim)]"
    }`;

  return (
    <div className="absolute top-4 right-6 flex gap-1.5 z-10">
      {LAYOUT_OPTIONS.map((opt) => {
        const Icon = ICONS[opt.value];
        return (
          <button
            key={opt.value}
            onClick={() => onLayoutChange(opt.value)}
            className={btnClass(layoutMode === opt.value)}
            title={opt.label}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
