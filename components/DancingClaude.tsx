'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface DancingClaudeProps {
  isPlaying: boolean;
  isSpeaking?: boolean;
  color?: string;
  onClickCharacter?: (headphonesGoingDown: boolean) => void;
}

export function DancingClaude({ isPlaying, isSpeaking = false, color = '#737373', onClickCharacter }: DancingClaudeProps) {
  const [frame, setFrame] = useState(0);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [headphonesDown, setHeadphonesDown] = useState(false);
  const [cupStep, setCupStep] = useState(0); // 0=normal, 1=down1, 2=shrink row, 3=shrink row, 4=shrink col
  const animatingRef = useRef(false);

  // Use the theme color - the parent's hue-rotate filter handles rainbow effect in party mode
  const blockColor = color;
  const eyeColor = 'transparent'; // transparent to show background

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

  // Handle click — toggle headphones with animated steps
  const handleClick = useCallback(() => {
    if (animatingRef.current) return;
    animatingRef.current = true;

    if (!headphonesDown) {
      // Down sequence: 0 → 1 → 2 → 3 → 4
      setCupStep(1);
      setTimeout(() => setCupStep(2), 200);
      setTimeout(() => setCupStep(3), 400);
      setTimeout(() => {
        setCupStep(4);
        setHeadphonesDown(true);
        animatingRef.current = false;
      }, 600);
    } else {
      // Up sequence: 4 → 3 → 2 → 1 → 0
      setCupStep(3);
      setTimeout(() => setCupStep(2), 200);
      setTimeout(() => setCupStep(1), 400);
      setTimeout(() => {
        setCupStep(0);
        setHeadphonesDown(false);
        animatingRef.current = false;
      }, 600);
    }

    onClickCharacter?.(!headphonesDown);
  }, [headphonesDown, onClickCharacter]);

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
          boxShadow: cellType === 1 ? `0 0 2px ${blockColor}, 0 0 4px ${blockColor}, 0 0 8px ${blockColor}` : 'none',
        }}
      />
    );
  };

  // Character design - 18 wide x 10 tall body
  // Row 0: band cols 1-16
  // Row 1: headphone stems cols 0,1 and 16,17
  // Row 2: stem col 0 and 17, body cols 3-14
  // Rows 3-5: 3x3 cups (cols 0-2 and 15-17), body, eyes at 5 and 12 (rows 4-5)
  // Rows 6-9: body only cols 3-14
  const bodyFrames = [
    // Frame 0: neutral - both headphones full
    [
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 0, 1, 1, 1, 1, 1, 3, 3, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    ],
    // Frame 1: left legs up
    [
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 0, 1, 1, 1, 1, 1, 3, 3, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    ],
    // Frame 2: neutral - both headphones full
    [
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 0, 1, 1, 1, 1, 1, 3, 3, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    ],
    // Frame 3: right legs up
    [
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 0, 1, 1, 1, 1, 1, 3, 3, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    ],
  ];

  // Apply cup animation to body frame
  // Cups are rows 3-6, cols 0-2 (left) and 15-17 (right) — 3 wide x 4 tall
  // Step 0: normal (3x4 at rows 3-6, stems at rows 1-2)
  // Step 1: shift down 1 (3x4 at rows 4-7) + bottom stem disappears (row 2)
  // Step 2: remove top row (3x3 at rows 5-7) + top stem disappears (row 1)
  // Step 3: remove another top row (3x2 at rows 6-7) + band grows up 1 row
  // Step 4: remove outer col (2x2 at rows 6-7) + band grows up 2 rows
  // Extra band rows are 2px narrower on each side (cols 3-14)
  const bandExtensionRow = [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0];

  const applyCupAnimation = (baseFrame: number[][]): number[][] => {
    if (cupStep === 0) return baseFrame;

    // Define cup bounds per step
    const cupBounds = {
      1: { rowStart: 4, rowEnd: 7, colShrink: false },
      2: { rowStart: 5, rowEnd: 7, colShrink: false },
      3: { rowStart: 6, rowEnd: 7, colShrink: false },
      4: { rowStart: 6, rowEnd: 7, colShrink: true },
    }[cupStep]!;

    // Stems disappear bottom-first: step 1 removes row 2, step 2+ removes row 1
    const stemHideFrom = cupStep >= 2 ? 1 : 2; // row at which stems start hiding

    // Band extension rows prepended at top
    const extraRows = cupStep >= 4 ? 2 : cupStep >= 3 ? 1 : 0;
    const prefix = Array.from({ length: extraRows }, () => [...bandExtensionRow]);

    const modifiedFrame = baseFrame.map((row, rowIdx) => {
      return row.map((cell, colIdx) => {
        // Handle stem removal (col 1 left, col 16 right, rows 1-2)
        const isStemCol = colIdx === 1 || colIdx === 16;
        if (isStemCol && rowIdx >= stemHideFrom && rowIdx <= 2) {
          return 0;
        }

        const isLeftCup = colIdx <= 2;
        const isRightCup = colIdx >= 15;
        if (!isLeftCup && !isRightCup) return cell;

        // Check if this column is removed by shrink
        if (cupBounds.colShrink) {
          if (colIdx === 0 || colIdx === 17) {
            // Outer column removed — show empty if in cup zone, else base
            if (rowIdx >= cupBounds.rowStart && rowIdx <= cupBounds.rowEnd) return 0;
            if (rowIdx >= 3 && rowIdx <= 6) return 0; // vacated original area
            return cell;
          }
        }

        // Place cup at shifted position
        if (rowIdx >= cupBounds.rowStart && rowIdx <= cupBounds.rowEnd) {
          return 1;
        }
        // Clear original cup area (rows 3-6) that's now vacated
        if (rowIdx >= 3 && rowIdx <= 6) {
          return 0;
        }
        return cell;
      });
    });

    return [...prefix, ...modifiedFrame];
  };

  // Get body frame with mouth animation applied
  const getBodyWithMouth = (baseFrame: number[][]): number[][] => {
    if (!mouthOpen) return baseFrame;

    // Clone the frame and modify row 8 for open mouth
    // Mouth extends down: row 8, cols 8-9 change from 1 (body) to 3 (mouth)
    return baseFrame.map((row, rowIdx) => {
      if (rowIdx === 8) {
        return row.map((cell, colIdx) =>
          colIdx >= 8 && colIdx <= 9 ? 3 : cell
        );
      }
      return row;
    });
  };

  const currentBody = applyCupAnimation(getBodyWithMouth(bodyFrames[frame]));

  // Leg patterns for different frames - 18 wide grid
  // 4 legs at positions 4, 6, 11, 13
  // When legs lift, the BOTTOM block disappears (lifts from the ground)
  const legFrames = [
    // Frame 0: all legs down (neutral)
    [
      [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
    ],
    // Frame 1: left legs up (bottom block removed)
    [
      [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
    ],
    // Frame 2: all legs down (neutral)
    [
      [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
    ],
    // Frame 3: right legs up (bottom block removed)
    [
      [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
  ];

  const currentLegs = legFrames[frame];

  // Body bob: slight vertical offset on frames 1 and 3
  const bodyOffset = (frame === 1 || frame === 3) && isPlaying ? -2 : 0;

  return (
    <div
      className="dancing-claude phosphor-glow"
      role="button"
      aria-label="DJ Claude mascot"
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
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
    </div>
  );
}
