'use client';

interface WelcomeSplashProps {
  visible: boolean;
}

export function WelcomeSplash({ visible }: WelcomeSplashProps) {
  // Block color matching Claude Code style
  const blockColor = '#d4a574';

  // Each letter is represented as a grid of blocks (wider blocks like the original)
  // 1 = filled block, 0 = empty
  const letters: Record<string, number[][]> = {
    D: [
      [1,1,1,1,0,0],
      [1,1,0,0,1,1],
      [1,1,0,0,1,1],
      [1,1,0,0,1,1],
      [1,1,1,1,0,0],
    ],
    J: [
      [0,0,0,0,1,1],
      [0,0,0,0,1,1],
      [0,0,0,0,1,1],
      [1,1,0,0,1,1],
      [0,1,1,1,1,0],
    ],
    C: [
      [0,1,1,1,1,0],
      [1,1,0,0,0,0],
      [1,1,0,0,0,0],
      [1,1,0,0,0,0],
      [0,1,1,1,1,0],
    ],
    L: [
      [1,1,0,0,0,0],
      [1,1,0,0,0,0],
      [1,1,0,0,0,0],
      [1,1,0,0,0,0],
      [1,1,1,1,1,1],
    ],
    A: [
      [0,1,1,1,1,0],
      [1,1,0,0,1,1],
      [1,1,1,1,1,1],
      [1,1,0,0,1,1],
      [1,1,0,0,1,1],
    ],
    U: [
      [1,1,0,0,1,1],
      [1,1,0,0,1,1],
      [1,1,0,0,1,1],
      [1,1,0,0,1,1],
      [0,1,1,1,1,0],
    ],
    E: [
      [1,1,1,1,1,1],
      [1,1,0,0,0,0],
      [1,1,1,1,0,0],
      [1,1,0,0,0,0],
      [1,1,1,1,1,1],
    ],
  };

  const renderLetter = (char: string, key: number) => {
    const grid = letters[char];
    if (!grid) return null;

    return (
      <div key={key} className="inline-flex flex-col mx-1">
        {grid.map((row, rowIdx) => (
          <div key={rowIdx} className="flex">
            {row.map((cell, cellIdx) => (
              <div
                key={cellIdx}
                style={{
                  width: '10px',
                  height: '10px',
                  margin: '1px',
                  backgroundColor: cell ? blockColor : 'transparent',
                  borderRadius: '1px',
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderWord = (word: string) => {
    return word.split('').map((char, idx) => renderLetter(char, idx));
  };

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none transition-opacity duration-500"
      style={{
        opacity: visible ? 1 : 0,
        backgroundColor: visible ? '#0a0a0a' : 'transparent',
      }}
    >
      {visible && (
        <>
          {/* Welcome box */}
          <div
            className="border px-4 py-2 mb-8 font-mono"
            style={{ borderColor: blockColor }}
          >
            <span style={{ color: blockColor }}>✱</span>
            <span className="text-neutral-300 ml-2">Welcome to</span>
            <span className="text-neutral-100 ml-2 italic">DJ Claude</span>
          </div>

          {/* DJ text */}
          <div className="flex justify-center mb-2">
            {renderWord('DJ')}
          </div>

          {/* CLAUDE text */}
          <div className="flex justify-center">
            {renderWord('CLAUDE')}
          </div>

          {/* Subtitle */}
          <div className="mt-8 text-neutral-500 text-sm font-mono">
            Type a prompt below to start making music
          </div>
        </>
      )}
    </div>
  );
}
