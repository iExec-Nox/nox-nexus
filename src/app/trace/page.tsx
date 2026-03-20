'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Hexagon, Search, ArrowLeft } from 'lucide-react';
import { isTxHash } from '@/lib/search';
import { useTrace } from '@/lib/use-trace';
import TraceChain from '@/components/TraceChain';
import LoadingOverlay from '@/components/LoadingOverlay';

export default function TracePage() {
  return (
    <Suspense>
      <TracePageInner />
    </Suspense>
  );
}

function TracePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialHandle = searchParams.get('handle') ?? '';

  const [inputValue, setInputValue] = useState(initialHandle);
  const {
    queriedHandle,
    queriedResolved,
    isQueriedPatientZero,
    ancestors,
    isTracing,
    isLoadingMore,
    hasMore,
    error,
    trace,
    loadMore,
  } = useTrace();

  useEffect(() => {
    if (initialHandle && isTxHash(initialHandle)) {
      trace(initialHandle);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = inputValue.trim();
    if (!isTxHash(id)) return;
    router.replace(`/trace?handle=${id}`, { scroll: false });
    trace(id);
  };

  const isValidInput = isTxHash(inputValue.trim());

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-deep)]/80 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-4 px-5">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
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
            <span className="rounded-full bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
              TRACE
            </span>
          </div>

          <form
            onSubmit={handleSubmit}
            className="ml-auto flex items-center gap-2"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Enter handle ID (0x...)"
                className="glow-ring h-8 w-[420px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/60 pl-9 pr-3 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] backdrop-blur-md outline-none transition-all duration-200 focus:border-[var(--color-accent-dim)] font-[family-name:var(--font-mono)]"
              />
            </div>
            <button
              type="submit"
              disabled={!isValidInput || isTracing}
              className="h-8 rounded-lg bg-[var(--color-accent)] px-4 text-xs font-medium text-white transition-all duration-200 hover:bg-[var(--color-accent-dim)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trace
            </button>
          </form>
        </div>
        <div className="header-accent h-px opacity-30" />
      </header>

      <main className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-auto mt-20 max-w-md text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {!queriedHandle && !error && !isTracing && (
          <div className="mx-auto mt-20 max-w-md text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              Enter a handle ID to trace its computation chain back to the
              patient zero.
            </p>
          </div>
        )}

        {queriedHandle && (
          <TraceChain
            queriedHandle={queriedHandle}
            queriedResolved={queriedResolved}
            isQueriedPatientZero={isQueriedPatientZero}
            ancestors={ancestors}
            isTracing={isTracing}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={loadMore}
          />
        )}
      </main>

      {isTracing && !queriedHandle && (
        <LoadingOverlay message="Fetching handle..." />
      )}
    </div>
  );
}
