'use client';

import { createPortal } from 'react-dom';
import { CircleCheck, CircleAlert, ExternalLink } from 'lucide-react';
import type { TraceEdge } from '@/lib/trace-graph-adapter';
import { OPERATOR_LABELS } from '@/lib/constants';
import { truncateHex, getOperatorColor } from '@/lib/utils';
import { decodeHandle } from '@/lib/handle-decode';

interface EdgeTooltipProps {
  edge: TraceEdge | null;
  x: number;
  y: number;
}

export default function EdgeTooltip({ edge, x, y }: EdgeTooltipProps) {
  if (!edge || typeof document === 'undefined') return null;

  const { handle } = edge;
  const info = decodeHandle(handle.id);
  const operatorColor = getOperatorColor(handle.operator);

  return createPortal(
    <div
      className="pointer-events-none fixed z-[200] rounded-lg border border-[var(--color-border)] bg-[var(--color-deep)]/95 backdrop-blur-xl shadow-xl"
      style={{ left: x + 16, top: y - 8, maxWidth: 340 }}
    >
      {/* Operator */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border-subtle)]">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: operatorColor }}
        />
        <span
          className="text-xs font-semibold"
          style={{ color: operatorColor }}
        >
          {OPERATOR_LABELS[handle.operator] ?? handle.operator}
        </span>
        {edge.isResolved ? (
          <CircleCheck className="ml-auto h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <CircleAlert className="ml-auto h-3.5 w-3.5 text-amber-400" />
        )}
      </div>

      {/* Handle ID */}
      <div className="px-3 py-1.5 border-b border-[var(--color-border-subtle)]">
        <div className="text-[9px] text-[var(--color-text-muted)] mb-0.5">
          Handle ID
        </div>
        <div className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-text-primary)] break-all">
          {handle.id}
        </div>
      </div>

      {/* Type + Status */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--color-border-subtle)]">
        {info && (
          <span className="rounded bg-violet-500/10 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[9px] text-violet-400 border border-violet-500/20">
            {info.solidityType}
          </span>
        )}
        {info && (
          <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[9px] text-[var(--color-text-muted)]">
            chain {info.chainId}
          </span>
        )}
        <span
          className={`ml-auto rounded px-1.5 py-0.5 text-[9px] font-medium ${edge.isResolved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}
        >
          {edge.isResolved ? 'Resolved' : 'Unresolved'}
        </span>
      </div>

      {/* Tx hash */}
      {handle.transactionHash && (
        <div className="px-3 py-1.5 border-b border-[var(--color-border-subtle)]">
          <div className="text-[9px] text-[var(--color-text-muted)] mb-0.5">
            Transaction
          </div>
          <div className="flex items-center gap-1 font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-accent)]">
            {truncateHex(handle.transactionHash, 8)}
            <ExternalLink className="h-2.5 w-2.5" />
          </div>
        </div>
      )}

      {/* Roles */}
      {handle.roles && handle.roles.length > 0 && (
        <div className="px-3 py-1.5">
          <div className="text-[9px] text-[var(--color-text-muted)] mb-1">
            Roles ({handle.roles.length})
          </div>
          <div className="flex flex-col gap-0.5">
            {handle.roles.slice(0, 4).map((role) => (
              <div
                key={role.id}
                className="flex items-center gap-1.5 text-[9px]"
              >
                <span
                  className={`rounded px-1 py-0.5 font-medium ${role.role === 'ADMIN' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}
                >
                  {role.role}
                </span>
                <span className="font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]">
                  {truncateHex(role.account, 4)}
                </span>
              </div>
            ))}
            {handle.roles.length > 4 && (
              <span className="text-[9px] text-[var(--color-text-muted)]">
                +{handle.roles.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
