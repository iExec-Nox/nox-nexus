'use client';

import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type { Graph } from '@cosmos.gl/graph';
import type { MutableRefObject } from 'react';

interface ZoomControlsProps {
  graph: MutableRefObject<Graph | null>;
}

export default function ZoomControls({ graph }: ZoomControlsProps) {
  const handleZoomIn = () => {
    const g = graph.current;
    if (!g) return;
    const level = g.getZoomLevel();
    g.setZoomLevel(level * 1.5, 200);
  };

  const handleZoomOut = () => {
    const g = graph.current;
    if (!g) return;
    const level = g.getZoomLevel();
    g.setZoomLevel(level / 1.5, 200);
  };

  const handleReset = () => {
    const g = graph.current;
    if (!g) return;
    g.fitView(300);
  };

  const btnClass =
    'flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-deep)]/80 backdrop-blur-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent-dim)] transition-all duration-200 cursor-pointer';

  return (
    <div className="absolute bottom-6 right-6 flex flex-col gap-1.5 z-10">
      <button onClick={handleZoomIn} className={btnClass} title="Zoom in">
        <ZoomIn size={14} />
      </button>
      <button onClick={handleZoomOut} className={btnClass} title="Zoom out">
        <ZoomOut size={14} />
      </button>
      <button onClick={handleReset} className={btnClass} title="Reset view">
        <Maximize2 size={14} />
      </button>
    </div>
  );
}
