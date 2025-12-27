'use client';

interface AudioInitButtonProps {
  onInitialize: () => void;
  isInitializing: boolean;
}

export function AudioInitButton({ onInitialize, isInitializing }: AudioInitButtonProps) {
  return (
    <div
      onClick={isInitializing ? undefined : onInitialize}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 cursor-pointer"
    >
      <div className="text-center">
        <div className="text-6xl mb-8">
          <span className="text-green-500">{'{'}</span>
          <span className="text-neutral-300">dj</span>
          <span className="text-green-500">{'}'}</span>
        </div>
        <h1 className="text-2xl font-mono text-neutral-200 mb-4">
          DJ Claude
        </h1>
        {isInitializing ? (
          <p className="text-neutral-400 font-mono animate-pulse">
            initializing audio...
          </p>
        ) : (
          <p className="text-neutral-500 font-mono">
            click anywhere to start
          </p>
        )}
        <div className="mt-8 text-neutral-600 text-xs font-mono max-w-md mx-auto">
          watch claude write music code in real-time
        </div>
      </div>
    </div>
  );
}
