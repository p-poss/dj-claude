'use client';

import { useEffect, useState } from 'react';

interface DancingClaudeProps {
  isPlaying: boolean;
  isSpeaking?: boolean;
}

export function DancingClaude({ isPlaying, isSpeaking = false }: DancingClaudeProps) {
  const [frame, setFrame] = useState(0);
  const [mouthOpen, setMouthOpen] = useState(false);
  const blockColor = '#737373'; // neutral-500 grey
  const eyeColor = '#000000'; // black for eyes

  // Animate between frames when playing
  useEffect(() => {
    if (!isPlaying) {
      setFrame(0);
      return;
    }

    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % 4);
    }, 200); // 200ms per frame = ~5 fps dance

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Mouth animation while speaking
  useEffect(() => {
    if (!isSpeaking) {
      setMouthOpen(false);
      return;
    }

    // Toggle mouth open/closed at ~150ms for natural speech rhythm
    const interval = setInterval(() => {
      setMouthOpen((prev) => !prev);
    }, 150);

    return () => clearInterval(interval);
  }, [isSpeaking]);

  // Cell types: 0 = empty, 1 = body, 2 = eye, 3 = mouth, 4 = shadow (30% opacity)
  const renderBlock = (cellType: number) => {
    let bgColor = 'transparent';
    let opacity = 1;
    if (cellType === 1) bgColor = blockColor;
    if (cellType === 2) bgColor = eyeColor;
    if (cellType === 3) bgColor = eyeColor; // mouth is also black
    if (cellType === 4) {
      bgColor = blockColor;
      opacity = 0.3; // anti-aliasing/shadow pixels
    }

    return (
      <div
        style={{
          width: '6px',
          height: '6px',
          backgroundColor: bgColor,
          opacity: opacity,
        }}
      />
    );
  };

  // Character design - 19 wide x 10 tall body
  // Row 0: band cols 1-17
  // Row 1: headphone stems cols 0,1 and 17,18
  // Row 2: stem col 0 and 18, body cols 3-15
  // Rows 3-5: 3x3 cups (cols 0-2 and 16-18), body, eyes at 5 and 13 (rows 4-5)
  // Rows 6-9: body only cols 3-15
  const bodyFrames = [
    // Frame 0: neutral - both headphones full
    [
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 0, 1, 1, 1, 1, 1, 3, 3, 3, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    ],
    // Frame 1: left legs up
    [
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 0, 1, 1, 1, 1, 1, 3, 3, 3, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    ],
    // Frame 2: neutral - both headphones full
    [
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 0, 1, 1, 1, 1, 1, 3, 3, 3, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    ],
    // Frame 3: right legs up
    [
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 0, 1, 1, 1, 1, 1, 3, 3, 3, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    ],
  ];

  // Get body frame with mouth animation applied
  const getBodyWithMouth = (baseFrame: number[][]): number[][] => {
    if (!mouthOpen) return baseFrame;

    // Clone the frame and modify row 8 for open mouth
    // Mouth extends down: row 8, cols 8-10 change from 1 (body) to 3 (mouth)
    return baseFrame.map((row, rowIdx) => {
      if (rowIdx === 8) {
        return row.map((cell, colIdx) =>
          colIdx >= 8 && colIdx <= 10 ? 3 : cell
        );
      }
      return row;
    });
  };

  const currentBody = getBodyWithMouth(bodyFrames[frame]);

  // Leg patterns for different frames - 19 wide grid
  // 4 legs at positions 4, 6, 12, 14
  // When legs lift, the BOTTOM block disappears (lifts from the ground)
  const legFrames = [
    // Frame 0: all legs down (neutral)
    [
      [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
    ],
    // Frame 1: left legs up (bottom block removed)
    [
      [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
    ],
    // Frame 2: all legs down (neutral)
    [
      [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
    ],
    // Frame 3: right legs up (bottom block removed)
    [
      [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
  ];

  const currentLegs = legFrames[frame];

  // Body bob: slight vertical offset on frames 1 and 3
  const bodyOffset = (frame === 1 || frame === 3) && isPlaying ? -2 : 0;

  return (
    <div
      className="flex flex-col items-center"
      style={{
        marginTop: '8px',
        transform: `translateY(${bodyOffset}px)`,
        transition: 'transform 0.15s ease-out',
      }}
    >
      {/* Body (animated with headphones) */}
      {currentBody.map((row, rowIdx) => (
        <div key={`body-${rowIdx}`} className="flex">
          {row.map((cell, cellIdx) => (
            <div key={cellIdx}>{renderBlock(cell)}</div>
          ))}
        </div>
      ))}

      {/* Legs (animated) */}
      {currentLegs.map((row, rowIdx) => (
        <div key={`leg-${rowIdx}`} className="flex">
          {row.map((cell, cellIdx) => (
            <div key={cellIdx}>{renderBlock(cell)}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
