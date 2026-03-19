'use client';

interface LoadingOverlayProps {
  message: string;
}

export default function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--color-void)]/90 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <svg
            className="h-16 w-16 animate-pulse"
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
          >
            <polygon
              points="50,5 93.3,27.5 93.3,72.5 50,95 6.7,72.5 6.7,27.5"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2"
              className="animate-[spin_4s_linear_infinite] origin-center"
            />
            <polygon
              points="50,20 79.6,35 79.6,65 50,80 20.4,65 20.4,35"
              fill="none"
              stroke="var(--color-accent-dim)"
              strokeWidth="1.5"
              className="animate-[spin_6s_linear_infinite_reverse] origin-center"
            />
            <circle
              cx="50"
              cy="50"
              r="4"
              fill="var(--color-accent)"
              className="animate-pulse"
            />
          </svg>
        </div>

        <p className="text-sm font-medium text-[var(--color-text-secondary)]">
          {message}
        </p>
      </div>
    </div>
  );
}
