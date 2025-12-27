'use client';

interface StatusBarProps {
  audioInitialized: boolean;
  isPlaying: boolean;
  isStreaming: boolean;
  error?: string | null;
  onHush: () => void;
}

export function StatusBar({ audioInitialized, isPlaying, isStreaming, error, onHush }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-800 bg-neutral-900/80">
      {/* Left side - Playing status */}
      <div className="flex items-center gap-3">
        {isPlaying ? (
          <>
            <span className="playing-indicator" />
            <span className="text-green-500 text-sm font-mono">playing</span>
            <button
              onClick={onHush}
              className="text-neutral-500 hover:text-red-400 text-xs font-mono ml-2
                         px-2 py-1 border border-neutral-700 rounded hover:border-red-400/50
                         transition-colors"
            >
              [esc] stop
            </button>
          </>
        ) : (
          <span className="text-neutral-500 text-sm font-mono">stopped</span>
        )}
      </div>

      {/* Right side - Audio status and errors */}
      <div className="flex items-center gap-4">
        {error && (
          <span className="text-red-400 text-xs font-mono max-w-xs truncate">
            {error}
          </span>
        )}
        <span className={`text-xs font-mono ${audioInitialized ? 'text-green-500' : 'text-neutral-500'}`}>
          audio: {audioInitialized ? 'ready' : 'not initialized'}
        </span>
      </div>
    </div>
  );
}
