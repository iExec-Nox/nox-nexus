"use client";

import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import {
  OPERATOR_COLORS,
  OPERATOR_LABELS,
  CORE_PRIMITIVES,
  ADVANCED_FUNCTIONS,
} from "@/lib/constants";

interface SidebarProps {
  operatorCounts: Record<string, number>;
  selectedOperators: string[];
  onOperatorToggle: (op: string) => void;
  onToggleAll: () => void;
  onToggleNone: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
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
        isSelected
          ? "bg-[var(--color-surface)]"
          : "opacity-30 hover:opacity-60"
      }`}
    >
      <span
        className="h-2 w-2 flex-shrink-0 rounded-full transition-shadow duration-150"
        style={{
          backgroundColor: color,
          boxShadow: isSelected ? `0 0 6px ${color}60` : "none",
        }}
      />
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
}: SidebarProps) {
  const presentCorePrimitives = CORE_PRIMITIVES.filter(
    (op) => (operatorCounts[op] ?? 0) > 0
  );
  const presentAdvancedFunctions = ADVANCED_FUNCTIONS.filter(
    (op) => (operatorCounts[op] ?? 0) > 0
  );

  return (
    <aside
      className={`relative flex h-full flex-col border-r border-[var(--color-border)] bg-[var(--color-deep)] transition-[width] duration-300 ease-in-out ${
        isCollapsed ? "w-12" : "w-[260px]"
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
                {presentCorePrimitives.length > 0 && (
                  <>
                    <CategoryHeader>Core Primitives</CategoryHeader>
                    {presentCorePrimitives.map((op) => (
                      <OperatorButton
                        key={op}
                        op={op}
                        isSelected={selectedOperators.includes(op)}
                        color={OPERATOR_COLORS[op] ?? "#64748b"}
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
                        color={OPERATOR_COLORS[op] ?? "#64748b"}
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
