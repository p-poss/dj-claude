'use client';

import { useEffect, useState } from 'react';

interface DancingClaudeProps {
  isPlaying: boolean;
}

export function DancingClaude({ isPlaying }: DancingClaudeProps) {
  const [frame, setFrame] = useState(0);
  const [horizontalOffset, setHorizontalOffset] = useState(0);
  const blockColor = '#737373'; // neutral-500 grey
  const eyeColor = '#0a0a0a';
  const mouthColor = '#0a0a0a'; // black for mouth

  // Track cursor position and slide left/right
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const windowWidth = window.innerWidth;
      const centerX = windowWidth / 2;
      // Calculate offset: -1 to 1 based on cursor position
      const normalizedX = (e.clientX - centerX) / centerX;
      // Max offset of 50px in either direction
      const offset = normalizedX * 50;
      setHorizontalOffset(offset);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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

  // Cell types: 0 = empty, 1 = body, 2 = eye, 3 = mouth
  const renderBlock = (cellType: number) => {
    let bgColor = 'transparent';
    if (cellType === 1) bgColor = blockColor;
    if (cellType === 2) bgColor = eyeColor;
    if (cellType === 3) bgColor = mouthColor;

    return (
      <div
        style={{
          width: '6px',
          height: '6px',
          backgroundColor: bgColor,
        }}
      />
    );
  };

  // Head section (rows 0-2)
  const head = [
    // Row 0: head top (10 wide, centered)
    [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
    // Row 1: eyes top (1 wide × 2 tall eyes)
    [0, 0, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 0, 0],
    // Row 2: eyes bottom
    [0, 0, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 0, 0],
  ];

  // Arm frames - left arm (0-1) and right arm (12-13) animate, middle stays solid
  // Frame 0: neutral (both arms level)
  // Frame 1: left arm down, right arm up
  // Frame 2: neutral
  // Frame 3: left arm up, right arm down
  const armFrames = [
    // Frame 0: neutral (both arm extensions in both rows)
    [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    // Frame 1: left arm down, right arm up
    [
      [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // left extension gone, right extension present
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0], // left extension present, right extension gone
    ],
    // Frame 2: neutral
    [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    // Frame 3: left arm up, right arm down
    [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0], // left extension present, right extension gone
      [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // left extension gone, right extension present
    ],
  ];

  // Lower body section (below arms)
  const lowerBody = [
    // Row 5: body with mouth (2 black blocks in center)
    [0, 0, 1, 1, 1, 1, 3, 3, 1, 1, 1, 1, 0, 0],
    // Row 6: body
    [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
    // Row 7: body bottom
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  ];

  // Leg patterns for different frames
  // 4 legs, each 1 block wide, 2 rows tall
  // When legs lift, the BOTTOM block disappears (lifts from the ground)
  const legFrames = [
    // Frame 0: all legs down (neutral)
    [
      [0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0],
      [0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0],
    ],
    // Frame 1: left legs up (bottom block removed)
    [
      [0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0],
    ],
    // Frame 2: all legs down (neutral)
    [
      [0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0],
      [0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0],
    ],
    // Frame 3: right legs up (bottom block removed)
    [
      [0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0],
      [0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
  ];

  const currentArms = armFrames[frame];
  const currentLegs = legFrames[frame];

  // Body bob: slight vertical offset on frames 1 and 3
  const bodyOffset = (frame === 1 || frame === 3) && isPlaying ? -2 : 0;

  return (
    <div
      className="flex flex-col items-center"
      style={{
        marginTop: '8px',
        transform: `translate(${horizontalOffset}px, ${bodyOffset}px)`,
        transition: 'transform 0.15s ease-out',
      }}
    >
      {/* Head */}
      {head.map((row, rowIdx) => (
        <div key={`head-${rowIdx}`} className="flex">
          {row.map((cell, cellIdx) => (
            <div key={cellIdx}>{renderBlock(cell)}</div>
          ))}
        </div>
      ))}

      {/* Arms (animated) */}
      {currentArms.map((row, rowIdx) => (
        <div key={`arm-${rowIdx}`} className="flex">
          {row.map((cell, cellIdx) => (
            <div key={cellIdx}>{renderBlock(cell)}</div>
          ))}
        </div>
      ))}

      {/* Lower Body */}
      {lowerBody.map((row, rowIdx) => (
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
