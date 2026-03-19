'use client';

import { useState } from 'react';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  ShieldOff,
  ArrowUpRight,
  ArrowDownRight,
  CircleCheck,
  CircleAlert,
  Loader2,
} from 'lucide-react';
import { Handle } from '@/lib/types';
import { OPERATOR_COLORS, OPERATOR_LABELS } from '@/lib/constants';
import { decodeHandle } from '@/lib/handle-decode';
import { truncateHex } from '@/lib/utils';

interface HandleDetailPanelProps {
  handle: Handle | null;
  onClose: () => void;
  onHandleClick: (id: string) => void;
  onAddressSearch: (address: string) => void;
  isResolved: boolean | null;
  isLoadingStatus: boolean;
}

function CopyableHex({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="group inline-flex items-center gap-1.5 rounded-md bg-[var(--color-surface)] px-2 py-1 font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-primary)] transition-colors duration-150 hover:bg-[var(--color-hover)]"
      title="Click to copy"
    >
      <span className="break-all">{value}</span>
      {copied ? (
        <Check className="h-3 w-3 flex-shrink-0 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3 flex-shrink-0 text-[var(--color-text-muted)] opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
      )}
    </button>
  );
}

function CopyIconButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-[var(--color-hover)] hover:text-[var(--color-text-primary)]"
      title="Copy handle ID"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
      {children}
    </div>
  );
}

export default function HandleDetailPanel({
  handle,
  onClose,
  onHandleClick,
  onAddressSearch,
  isResolved,
  isLoadingStatus,
}: HandleDetailPanelProps) {
  const isOpen = handle !== null;

  const info = handle ? decodeHandle(handle.id) : null;

  return (
    <div
      className={`absolute right-0 top-0 z-40 flex h-full w-[380px] flex-col border-l border-[var(--color-border)] bg-[var(--color-deep)]/95 backdrop-blur-xl transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {handle && (
        <>
          <div className="border-b border-[var(--color-border)]">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                Handle Details
              </h2>
              <button
                onClick={onClose}
                className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-all duration-150 hover:bg-[var(--color-hover)] hover:text-[var(--color-text-primary)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="header-accent h-px opacity-20" />
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="flex flex-col gap-5">
              <div>
                <SectionLabel>Handle ID</SectionLabel>
                <CopyableHex value={handle.id} />
              </div>

              {(() => {
                if (!info) return null;
                return (
                  <div className="flex gap-3">
                    <div>
                      <SectionLabel>Type</SectionLabel>
                      <span className="inline-flex items-center rounded-md bg-violet-500/10 px-2 py-1 font-[family-name:var(--font-mono)] text-xs font-medium text-violet-400 border border-violet-500/20">
                        {info.solidityType}
                      </span>
                    </div>
                    <div>
                      <SectionLabel>Unique</SectionLabel>
                      <span className="inline-flex items-center rounded-md bg-orange-500/10 px-2 py-1 font-[family-name:var(--font-mono)] text-xs font-medium text-orange-400 border border-orange-500/20">
                        {info.unique ? 'Unique' : 'Shared'}
                      </span>
                    </div>
                    <div>
                      <SectionLabel>Chain ID</SectionLabel>
                      <span className="inline-flex items-center rounded-md bg-[var(--color-surface)] px-2 py-1 font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-secondary)]">
                        {info.chainId}
                      </span>
                    </div>
                    <div>
                      <SectionLabel>Version</SectionLabel>
                      <span className="inline-flex items-center rounded-md bg-[var(--color-surface)] px-2 py-1 font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-secondary)]">
                        v{info.version}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {handle.operator ? (
                <div>
                  <SectionLabel>Operator</SectionLabel>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${OPERATOR_COLORS[handle.operator] ?? '#64748b'}20`,
                      color: OPERATOR_COLORS[handle.operator] ?? '#64748b',
                      border: `1px solid ${OPERATOR_COLORS[handle.operator] ?? '#64748b'}40`,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor:
                          OPERATOR_COLORS[handle.operator] ?? '#64748b',
                      }}
                    />
                    {OPERATOR_LABELS[handle.operator] ?? handle.operator}
                  </span>
                </div>
              ) : (
                <div>
                  <SectionLabel>Source</SectionLabel>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${OPERATOR_COLORS['EncryptedInput']}20`,
                      color: OPERATOR_COLORS['EncryptedInput'],
                      border: `1px solid ${OPERATOR_COLORS['EncryptedInput']}40`,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: OPERATOR_COLORS['EncryptedInput'],
                      }}
                    />
                    Encrypted Input from Handle Gateway
                  </span>
                </div>
              )}

              <div>
                <SectionLabel>Ciphertext Status</SectionLabel>
                {isLoadingStatus ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Checking...
                  </span>
                ) : isResolved === true ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                    <CircleCheck className="h-3.5 w-3.5" />
                    Resolved
                  </span>
                ) : isResolved === false ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400 border border-amber-500/20">
                    <CircleAlert className="h-3.5 w-3.5" />
                    Unresolved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                    Unknown
                  </span>
                )}
              </div>

              <div>
                <SectionLabel>Publicly Decryptable</SectionLabel>
                {handle.isPubliclyDecryptable || info?.unique === false ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Yes
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-red-400">
                    <ShieldOff className="h-3.5 w-3.5" />
                    No
                  </span>
                )}
              </div>

              {handle.plaintext !== null && (
                <div>
                  <SectionLabel>Plaintext</SectionLabel>
                  <div className="rounded-md bg-[var(--color-surface)] px-3 py-2 font-[family-name:var(--font-mono)] text-xs text-emerald-300 break-all">
                    {handle.plaintext}
                  </div>
                </div>
              )}

              {handle.transactionHash && (
                <div>
                  <SectionLabel>Transaction</SectionLabel>
                  <div className="inline-flex items-center gap-1">
                    <a
                      href={`https://sepolia.arbiscan.io/tx/${handle.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-surface)] px-2 py-1 font-[family-name:var(--font-mono)] text-xs text-[var(--color-accent)] transition-colors duration-150 hover:bg-[var(--color-hover)]"
                    >
                      {truncateHex(handle.transactionHash)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <CopyIconButton value={handle.transactionHash} />
                  </div>
                </div>
              )}

              {handle.parentHandles.length > 0 && (
                <div>
                  <SectionLabel>
                    Parent Handles ({handle.parentHandles.length})
                  </SectionLabel>
                  <div className="flex flex-col gap-1">
                    {handle.parentHandles.map((parent) => (
                      <div
                        key={parent.id}
                        className="group flex items-center gap-2 rounded-md bg-[var(--color-surface)] px-2 py-1.5 transition-colors duration-150 hover:bg-[var(--color-hover)]"
                      >
                        <button
                          onClick={() => onHandleClick(parent.id)}
                          className="flex flex-1 items-center gap-2 text-left"
                        >
                          <ArrowUpRight className="h-3 w-3 flex-shrink-0 text-[var(--color-text-muted)]" />
                          <span className="flex-1 truncate font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]">
                            {truncateHex(parent.id)}
                          </span>
                        </button>
                        <CopyIconButton value={parent.id} />
                        <span
                          className="h-2 w-2 flex-shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              OPERATOR_COLORS[parent.operator] ?? '#64748b',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {handle.childHandles.length > 0 && (
                <div>
                  <SectionLabel>
                    Child Handles ({handle.childHandles.length})
                  </SectionLabel>
                  <div className="flex flex-col gap-1">
                    {handle.childHandles.map((child) => (
                      <div
                        key={child.id}
                        className="group flex items-center gap-2 rounded-md bg-[var(--color-surface)] px-2 py-1.5 transition-colors duration-150 hover:bg-[var(--color-hover)]"
                      >
                        <button
                          onClick={() => onHandleClick(child.id)}
                          className="flex flex-1 items-center gap-2 text-left"
                        >
                          <ArrowDownRight className="h-3 w-3 flex-shrink-0 text-[var(--color-text-muted)]" />
                          <span className="flex-1 truncate font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]">
                            {truncateHex(child.id)}
                          </span>
                        </button>
                        <CopyIconButton value={child.id} />
                        <span
                          className="h-2 w-2 flex-shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              OPERATOR_COLORS[child.operator] ?? '#64748b',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {handle.roles.length > 0 && (
                <div>
                  <SectionLabel>Roles ({handle.roles.length})</SectionLabel>
                  <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                          <th className="px-2 py-1.5 text-left font-medium text-[var(--color-text-muted)]">
                            Account
                          </th>
                          <th className="px-2 py-1.5 text-left font-medium text-[var(--color-text-muted)]">
                            Role
                          </th>
                          <th className="px-2 py-1.5 text-left font-medium text-[var(--color-text-muted)]">
                            Granted By
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {handle.roles.map((role) => (
                          <tr
                            key={role.id}
                            className="border-b border-[var(--color-border-subtle)] last:border-0"
                          >
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => onAddressSearch(role.account)}
                                  className="font-[family-name:var(--font-mono)] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)] cursor-pointer"
                                  title="Search handles for this address"
                                >
                                  {truncateHex(role.account, 4)}
                                </button>
                                <CopyIconButton value={role.account} />
                              </div>
                            </td>
                            <td className="px-2 py-1.5">
                              <span
                                className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                  role.role === 'ADMIN'
                                    ? 'bg-amber-500/10 text-amber-400'
                                    : 'bg-blue-500/10 text-blue-400'
                                }`}
                              >
                                {role.role}
                              </span>
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() =>
                                    onAddressSearch(role.grantedBy)
                                  }
                                  className="font-[family-name:var(--font-mono)] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)] cursor-pointer"
                                  title="Search handles for this address"
                                >
                                  {truncateHex(role.grantedBy, 4)}
                                </button>
                                <CopyIconButton value={role.grantedBy} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
