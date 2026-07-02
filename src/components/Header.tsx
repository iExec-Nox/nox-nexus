'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import {
  Search,
  RefreshCw,
  Hexagon,
  Clock,
  X,
  Globe,
  ChevronDown,
  Check,
} from 'lucide-react';
import { CHAINS, getChain } from '@/lib/chains';

const TIMEFRAME_OPTIONS: { value: number | null; label: string }[] = [
  { value: 1, label: '1h' },
  { value: 2, label: '2h' },
  { value: 6, label: '6h' },
  { value: 24, label: '24h' },
  { value: 48, label: '48h' },
  { value: 168, label: '7d' },
  { value: 720, label: '30d' },
  { value: null, label: 'All' },
];

function NetworkSelector({
  chainId,
  onChainChange,
}: {
  chainId: number;
  onChainChange: (chainId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex h-7 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-2 text-[10px] font-medium text-[var(--color-text-secondary)] transition-all duration-150 hover:border-[var(--color-accent-dim)] hover:text-[var(--color-text-primary)]"
      >
        <Globe className="h-3 w-3 text-[var(--color-text-muted)]" />
        {getChain(chainId).name}
        <ChevronDown
          className={`h-3 w-3 text-[var(--color-text-muted)] transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-[var(--color-border)] bg-[var(--color-deep)]/95 p-1 backdrop-blur-xl shadow-lg">
          {CHAINS.map((chain) => (
            <button
              key={chain.chainId}
              onClick={() => {
                onChainChange(chain.chainId);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[11px] font-medium transition-colors duration-150 ${
                chain.chainId === chainId
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {chain.name}
              {chain.chainId === chainId && <Check className="h-3 w-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface HeaderProps {
  chainId: number;
  onChainChange: (chainId: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onReset?: () => void;
  handleCount: number;
  isLoading: boolean;
  onRefresh: () => void;
  isAddressSearch?: boolean;
  addressHandleCount?: number;
  isTxSearch?: boolean;
  txHandleCount?: number;
  txOnlyMode?: boolean;
  onTxOnlyModeChange?: (v: boolean) => void;
  timeframeHours: number | null;
  onTimeframeChange: (hours: number | null) => void;
  isSearchActive?: boolean;
  viewMode: 'explorer' | 'primitives';
  onViewModeChange: (mode: 'explorer' | 'primitives') => void;
}

export default function Header({
  chainId,
  onChainChange,
  searchQuery,
  onSearchChange,
  onReset,
  handleCount,
  isLoading,
  onRefresh,
  isAddressSearch,
  addressHandleCount,
  isTxSearch,
  txHandleCount,
  txOnlyMode,
  onTxOnlyModeChange,
  timeframeHours,
  onTimeframeChange,
  isSearchActive,
  viewMode,
  onViewModeChange,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-deep)]/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            onClick={onReset}
            className="flex items-center gap-3 group"
          >
            <div className="logo-glow">
              <Hexagon
                className="h-6 w-6 text-[var(--color-accent)]"
                strokeWidth={2.5}
              />
            </div>
            <span className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
              NOX <span className="text-[var(--color-accent)]">NEXUS</span>
            </span>
          </Link>
          <div className="flex items-center gap-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-0.5">
            <button
              onClick={() => onViewModeChange('explorer')}
              className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-all duration-150 ${
                viewMode === 'explorer'
                  ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] border border-transparent'
              }`}
            >
              Handles
            </button>
            <button
              onClick={() => onViewModeChange('primitives')}
              className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-all duration-150 ${
                viewMode === 'primitives'
                  ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] border border-transparent'
              }`}
            >
              Primitives
            </button>
          </div>
          <NetworkSelector chainId={chainId} onChainChange={onChainChange} />
        </div>

        <div className="relative w-full max-w-md mx-8">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by handle ID, address, or tx hash..."
            className="glow-ring h-8 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/60 pl-9 pr-8 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] backdrop-blur-md outline-none transition-all duration-200 focus:border-[var(--color-accent-dim)] font-[family-name:var(--font-mono)]"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center h-4 w-4 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          {isAddressSearch && (
            <div className="absolute -bottom-8 left-0 right-0 flex items-center gap-1.5 px-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
              <span className="text-[10px] text-[var(--color-text-muted)]">
                Showing {addressHandleCount ?? 0} handles for address
              </span>
            </div>
          )}
          {isTxSearch && (
            <div className="absolute -bottom-8 left-0 right-0 flex items-center gap-1.5 px-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
              <span className="text-[10px] text-[var(--color-text-muted)]">
                Showing {txHandleCount ?? 0} handles for transaction
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isTxSearch && (
            <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-0.5">
              <button
                onClick={() => onTxOnlyModeChange?.(false)}
                className={`rounded-md px-2 py-1 text-[10px] font-medium transition-all duration-150 ${
                  !txOnlyMode
                    ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] border border-transparent'
                }`}
              >
                All linked
              </button>
              <button
                onClick={() => onTxOnlyModeChange?.(true)}
                className={`rounded-md px-2 py-1 text-[10px] font-medium transition-all duration-150 ${
                  txOnlyMode
                    ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] border border-transparent'
                }`}
              >
                Tx
              </button>
            </div>
          )}
          <div
            className={`flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-0.5 transition-opacity duration-200 ${isSearchActive ? 'opacity-35 pointer-events-none' : ''}`}
            title={
              isSearchActive ? 'Timeframe disabled during search' : undefined
            }
          >
            <Clock className="ml-1.5 h-3 w-3 text-[var(--color-text-muted)]" />
            {TIMEFRAME_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => onTimeframeChange(opt.value)}
                className={`rounded-md px-2 py-1 text-[10px] font-medium transition-all duration-150 ${
                  timeframeHours === opt.value
                    ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] border border-transparent'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

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
              className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>
      <div className="header-accent h-px opacity-30" />
    </header>
  );
}
