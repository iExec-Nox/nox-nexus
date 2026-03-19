'use client';

import {
  ChevronLeft,
  ChevronRight,
  Filter,
  AlertTriangle,
  Check,
} from 'lucide-react';
import {
  OPERATOR_COLORS,
  OPERATOR_LABELS,
  OFF_CHAIN_OPS,
  CORE_PRIMITIVES,
  ADVANCED_FUNCTIONS,
} from '@/lib/constants';

interface SidebarProps {
  operatorCounts: Record<string, number>;
  selectedOperators: string[];
  onOperatorToggle: (op: string) => void;
  onToggleAll: () => void;
  onToggleNone: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  highlightUnresolved: boolean;
  onToggleHighlightUnresolved: () => void;
  unresolvedCount: number;
  isLoadingStatuses: boolean;
}

function OperatorButton({
  op,
  isSelected,
  color,
  count,
  onToggle,
}: {
  op: string;
  isSelected: boolean;
  color: string;
  count: number;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-all duration-150 ${
        isSelected ? 'bg-[var(--color-surface)]' : 'opacity-40 hover:opacity-70'
      }`}
    >
      <span
        className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded transition-all duration-150 border"
        style={{
          backgroundColor: isSelected ? color : 'transparent',
          borderColor: isSelected ? color : 'var(--color-text-muted)',
          boxShadow: isSelected ? `0 0 6px ${color}40` : 'none',
        }}
      >
        {isSelected && (
          <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
        )}
      </span>
      <span className="flex-1 truncate text-xs text-[var(--color-text-secondary)]">
        {OPERATOR_LABELS[op] ?? op}
      </span>
      <span className="font-[family-name:var(--font-mono)] text-[10px] tabular-nums text-[var(--color-text-muted)]">
        {count}
      </span>
    </button>
  );
}

function CategoryHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 mt-3 flex items-center gap-2 first:mt-0">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
        {children}
      </span>
      <span className="h-px flex-1 bg-[var(--color-border-subtle)]" />
    </div>
  );
}

export default function Sidebar({
  operatorCounts,
  selectedOperators,
  onOperatorToggle,
  onToggleAll,
  onToggleNone,
  isCollapsed,
  onToggleCollapse,
  highlightUnresolved,
  onToggleHighlightUnresolved,
  unresolvedCount,
  isLoadingStatuses,
}: SidebarProps) {
  const presentOffChainOps = OFF_CHAIN_OPS.filter(
    (op) => (operatorCounts[op] ?? 0) > 0
  );
  const presentCorePrimitives = CORE_PRIMITIVES.filter(
    (op) => (operatorCounts[op] ?? 0) > 0
  );
  const presentAdvancedFunctions = ADVANCED_FUNCTIONS.filter(
    (op) => (operatorCounts[op] ?? 0) > 0
  );

  return (
    <aside
      className={`relative flex h-full flex-col border-r border-[var(--color-border)] bg-[var(--color-deep)] transition-[width] duration-300 ease-in-out ${
        isCollapsed ? 'w-12' : 'w-[260px]'
      }`}
    >
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-elevated)] text-[var(--color-text-secondary)] transition-all duration-200 hover:border-[var(--color-accent-dim)] hover:text-[var(--color-text-primary)]"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      {isCollapsed ? (
        <div className="flex flex-col items-center gap-4 pt-14">
          <Filter className="h-4 w-4 text-[var(--color-text-muted)]" />
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-3 pt-4 pb-4">
            <div className="mb-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                  <Filter className="h-3 w-3" />
                  Filters
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={onToggleAll}
                    className="rounded-md px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-[var(--color-surface)] hover:text-[var(--color-text-secondary)]"
                  >
                    All
                  </button>
                  <button
                    onClick={onToggleNone}
                    className="rounded-md px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-[var(--color-surface)] hover:text-[var(--color-text-secondary)]"
                  >
                    None
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-0.5">
                <div className="mb-2">
                  <button
                    onClick={onToggleHighlightUnresolved}
                    disabled={isLoadingStatuses}
                    className={`group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-all duration-150 ${
                      highlightUnresolved
                        ? 'bg-[var(--color-surface)]'
                        : 'opacity-40 hover:opacity-70'
                    } ${isLoadingStatuses ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border transition-all duration-150"
                      style={{
                        backgroundColor: highlightUnresolved
                          ? '#ef4444'
                          : 'transparent',
                        borderColor: highlightUnresolved
                          ? '#ef4444'
                          : 'var(--color-text-muted)',
                        boxShadow: highlightUnresolved
                          ? '0 0 6px #ef444440'
                          : 'none',
                      }}
                    >
                      {highlightUnresolved && (
                        <Check
                          className="h-2.5 w-2.5 text-white"
                          strokeWidth={3}
                        />
                      )}
                    </span>
                    <AlertTriangle
                      className={`h-3 w-3 flex-shrink-0 ${
                        highlightUnresolved
                          ? 'text-red-400'
                          : 'text-[var(--color-text-muted)]'
                      }`}
                    />
                    <span
                      className={`flex-1 text-xs font-medium ${
                        highlightUnresolved
                          ? 'text-red-300'
                          : 'text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {isLoadingStatuses
                        ? 'Loading statuses...'
                        : 'Show unresolved'}
                    </span>
                    <span
                      className={`font-[family-name:var(--font-mono)] text-[10px] tabular-nums ${
                        highlightUnresolved
                          ? 'text-red-400'
                          : 'text-[var(--color-text-muted)]'
                      }`}
                    >
                      {isLoadingStatuses ? '...' : unresolvedCount}
                    </span>
                  </button>
                </div>
                {presentOffChainOps.length > 0 && (
                  <>
                    <CategoryHeader>Off-chain</CategoryHeader>
                    {presentOffChainOps.map((op) => (
                      <OperatorButton
                        key={op}
                        op={op}
                        isSelected={selectedOperators.includes(op)}
                        color={OPERATOR_COLORS[op] ?? '#64748b'}
                        count={operatorCounts[op] ?? 0}
                        onToggle={() => onOperatorToggle(op)}
                      />
                    ))}
                  </>
                )}
                {presentCorePrimitives.length > 0 && (
                  <>
                    <CategoryHeader>Core Primitives</CategoryHeader>
                    {presentCorePrimitives.map((op) => (
                      <OperatorButton
                        key={op}
                        op={op}
                        isSelected={selectedOperators.includes(op)}
                        color={OPERATOR_COLORS[op] ?? '#64748b'}
                        count={operatorCounts[op] ?? 0}
                        onToggle={() => onOperatorToggle(op)}
                      />
                    ))}
                  </>
                )}
                {presentAdvancedFunctions.length > 0 && (
                  <>
                    <CategoryHeader>Advanced Functions</CategoryHeader>
                    {presentAdvancedFunctions.map((op) => (
                      <OperatorButton
                        key={op}
                        op={op}
                        isSelected={selectedOperators.includes(op)}
                        color={OPERATOR_COLORS[op] ?? '#64748b'}
                        count={operatorCounts[op] ?? 0}
                        onToggle={() => onOperatorToggle(op)}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
