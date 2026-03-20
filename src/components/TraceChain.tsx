'use client';

import { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  CircleCheck,
  CircleAlert,
  Loader2,
  Fingerprint,
  AlertTriangle,
  ArrowUp,
} from 'lucide-react';
import type { Handle } from '@/lib/types';
import type { TraceNode } from '@/lib/use-trace';
import { OPERATOR_COLORS, OPERATOR_LABELS } from '@/lib/constants';
import { truncateHex } from '@/lib/utils';
import { decodeHandle } from '@/lib/handle-decode';

interface TraceChainProps {
  queriedHandle: Handle;
  queriedResolved: boolean | null;
  isQueriedPatientZero: boolean;
  ancestors: TraceNode[];
  isTracing: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex h-4 w-4 items-center justify-center rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
      title="Copy"
    >
      {copied ? (
        <Check className="h-2.5 w-2.5 text-emerald-400" />
      ) : (
        <Copy className="h-2.5 w-2.5" />
      )}
    </button>
  );
}

interface OpNodeProps {
  handle: Handle;
  isResolved: boolean;
  isPatientZero: boolean;
  isQueried: boolean;
  ancestorMap: Map<string, TraceNode>;
}

function OpNode({
  handle,
  isResolved,
  isPatientZero,
  isQueried,
  ancestorMap,
}: OpNodeProps) {
  const info = decodeHandle(handle.id);
  const operatorColor =
    OPERATOR_COLORS[handle.operator] ?? OPERATOR_COLORS['Default'] ?? '#64748b';
  const operatorLabel = OPERATOR_LABELS[handle.operator] ?? handle.operator;

  const borderColor = isPatientZero
    ? '#f59e0b'
    : isQueried
      ? 'var(--color-accent)'
      : isResolved
        ? '#10b981'
        : 'var(--color-border)';

  const parents = handle.parentHandles ?? [];

  return (
    <div
      className="rounded-lg border bg-[var(--color-surface)]/60 backdrop-blur-sm"
      style={{ borderColor, borderLeftWidth: 3 }}
    >
      {/* Header: operation name */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span
          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: operatorColor }}
        />
        <span
          className="text-sm font-semibold"
          style={{ color: operatorColor }}
        >
          {operatorLabel}
        </span>
        <span className="ml-auto flex items-center gap-1">
          {isPatientZero && (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          )}
          {isQueried && (
            <Fingerprint className="h-3.5 w-3.5 text-[var(--color-accent)]" />
          )}
          {isResolved ? (
            <CircleCheck className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <CircleAlert className="h-3.5 w-3.5 text-amber-400" />
          )}
        </span>
      </div>

      {/* Body: handle ID + type */}
      <div className="border-t border-[var(--color-border-subtle)] px-3 py-1.5">
        <div className="flex items-center gap-1">
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-text-secondary)]">
            {truncateHex(handle.id, 6)}
          </span>
          <CopyButton value={handle.id} />
          {info && (
            <span className="ml-auto rounded bg-violet-500/10 px-1 py-0.5 font-[family-name:var(--font-mono)] text-[9px] text-violet-400 border border-violet-500/20">
              {info.solidityType}
            </span>
          )}
        </div>
      </div>

      {/* Footer: parent links */}
      {parents.length > 0 && (
        <div className="border-t border-[var(--color-border-subtle)] px-3 py-1.5">
          <div className="flex items-center gap-1 flex-wrap">
            <ArrowUp className="h-3 w-3 text-[var(--color-text-muted)] flex-shrink-0" />
            {parents.map((p) => {
              const parentOp = OPERATOR_LABELS[p.operator] ?? p.operator ?? '?';
              const parentColor =
                OPERATOR_COLORS[p.operator] ??
                OPERATOR_COLORS['Default'] ??
                '#64748b';
              const parentAncestor = ancestorMap.get(p.id);
              const parentResolved = parentAncestor?.isResolved ?? null;
              return (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                  style={{
                    backgroundColor: `${parentColor}15`,
                    color: parentColor,
                    border: `1px solid ${parentColor}30`,
                  }}
                  title={p.id}
                >
                  {parentOp}
                  <span className="text-[8px] opacity-60 font-[family-name:var(--font-mono)]">
                    {truncateHex(p.id, 3)}
                  </span>
                  {parentResolved === true && (
                    <CircleCheck className="h-2.5 w-2.5 text-emerald-400" />
                  )}
                  {parentResolved === false && (
                    <CircleAlert className="h-2.5 w-2.5 text-amber-400" />
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Connector() {
  return (
    <div className="flex flex-col items-center py-1">
      <div className="h-3 w-px bg-[var(--color-border)]" />
      <svg
        className="h-2.5 w-2.5 text-[var(--color-border)]"
        viewBox="0 0 10 6"
        fill="currentColor"
      >
        <path d="M0 0 L5 6 L10 0 Z" />
      </svg>
    </div>
  );
}

export default function TraceChain({
  queriedHandle,
  queriedResolved,
  isQueriedPatientZero,
  ancestors,
  isTracing,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: TraceChainProps) {
  const ancestorMap = useMemo(() => {
    const map = new Map<string, TraceNode>();
    for (const node of ancestors) {
      map.set(node.handle.id, node);
    }
    return map;
  }, [ancestors]);

  const depthGroups = useMemo(() => {
    const groups = new Map<number, TraceNode[]>();
    for (const node of ancestors) {
      const group = groups.get(node.depth) ?? [];
      group.push(node);
      groups.set(node.depth, group);
    }
    return [...groups.entries()].sort(([a], [b]) => b - a);
  }, [ancestors]);

  const hasUnresolved =
    isQueriedPatientZero || ancestors.some((n) => !n.isResolved);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {queriedResolved && !hasUnresolved && !isTracing && (
        <div className="mb-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <CircleCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">
              This handle is resolved
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
            No corruption detected in the computation chain.
          </p>
        </div>
      )}

      {/* Load more ancestors button */}
      {hasMore && (
        <div className="mb-4 flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-all duration-200 hover:border-[var(--color-accent-dim)] hover:text-[var(--color-accent)] disabled:opacity-50"
          >
            {isLoadingMore ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ArrowUp className="h-3.5 w-3.5" />
            )}
            {isLoadingMore ? 'Loading...' : 'Load more ancestors'}
          </button>
        </div>
      )}

      {/* Ancestors: deepest first (roots at top) */}
      {depthGroups.map(([depth, nodes]) => (
        <div key={depth}>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Depth {depth}
            </span>
            <span className="h-px flex-1 bg-[var(--color-border-subtle)]" />
            <span className="text-[9px] text-[var(--color-text-muted)]">
              {nodes.length} {nodes.length === 1 ? 'handle' : 'handles'}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {nodes.map((node) => (
              <OpNode
                key={node.handle.id}
                handle={node.handle}
                isResolved={node.isResolved}
                isPatientZero={node.isPatientZero}
                isQueried={false}
                ancestorMap={ancestorMap}
              />
            ))}
          </div>
          <Connector />
        </div>
      ))}

      {/* Tracing indicator */}
      {isTracing && (
        <>
          <div className="flex items-center justify-center gap-2 py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-accent)]" />
            <span className="text-[10px] text-[var(--color-text-muted)]">
              Tracing ancestors...
            </span>
          </div>
          <Connector />
        </>
      )}

      {/* Queried handle */}
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
          Queried
        </span>
        <span className="h-px flex-1 bg-[var(--color-accent)]/20" />
      </div>
      <OpNode
        handle={queriedHandle}
        isResolved={queriedResolved ?? false}
        isPatientZero={isQueriedPatientZero}
        isQueried={true}
        ancestorMap={ancestorMap}
      />
    </div>
  );
}
