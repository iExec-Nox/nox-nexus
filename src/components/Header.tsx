"use client";

import { Search, RefreshCw, Hexagon } from "lucide-react";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  handleCount: number;
  isLoading: boolean;
  onRefresh: () => void;
}

export default function Header({
  searchQuery,
  onSearchChange,
  handleCount,
  isLoading,
  onRefresh,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-deep)]/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <div className="logo-glow">
            <Hexagon
              className="h-6 w-6 text-[var(--color-accent)]"
              strokeWidth={2.5}
            />
          </div>
          <span className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
            NOX <span className="text-[var(--color-accent)]">NEXUS</span>
          </span>
          <span className="ml-1 rounded-full bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
            EXPLORER
          </span>
        </div>

        <div className="relative w-full max-w-md mx-8">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by handle ID..."
            className="glow-ring h-8 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/60 pl-9 pr-3 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] backdrop-blur-md outline-none transition-all duration-200 focus:border-[var(--color-accent-dim)] font-[family-name:var(--font-mono)]"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="stat-pill flex items-center gap-2 rounded-full px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-[family-name:var(--font-mono)] text-xs font-medium text-[var(--color-text-primary)]">
              {handleCount.toLocaleString()}
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)]">
              handles
            </span>
          </div>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-all duration-200 hover:border-[var(--color-accent-dim)] hover:text-[var(--color-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>
      <div className="header-accent h-px opacity-30" />
    </header>
  );
}
