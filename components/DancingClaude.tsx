'use client';

import { useEffect, useLayoutEffect, useState, useCallback, useRef, useMemo } from 'react';

interface DancingClaudeProps {
  isPlaying: boolean;
  isSpeaking?: boolean;
  color?: string;
  crtEnabled?: boolean;
  onClickCharacter?: (headphonesGoingDown: boolean) => void;
}

const CELL_SIZE = 6;
const GRID_WIDTH = 18;

// Cell types: 0 = empty, 1 = body, 2 = eye, 3 = mouth, 4 = shadow (30% opacity)

// Character design - 18 wide x 10 tall body
// Row 0: band cols 1-16
// Row 1: headphone stems cols 0,1 and 16,17
// Row 2: stem col 0 and 17, body cols 3-14
// Rows 3-5: 3x3 cups (cols 0-2 and 15-17), body, eyes at 5 and 12 (rows 4-5)
// Rows 6-9: body only cols 3-14
const bodyFrames: number[][][] = [
  // Frame 0: neutral
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
  // Frame 2: neutral
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

// Leg patterns for different frames - 18 wide grid
// 4 legs at positions 4, 6, 11, 13
// When legs lift, the BOTTOM block disappears (lifts from the ground)
const legFrames: number[][][] = [
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

const bandExtensionRow = [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0];

function applyCupAnimation(baseFrame: number[][], cupStep: number): number[][] {
  if (cupStep === 0) return baseFrame;

  const cupBounds = {
    1: { rowStart: 4, rowEnd: 7, colShrink: false },
    2: { rowStart: 5, rowEnd: 7, colShrink: false },
    3: { rowStart: 6, rowEnd: 7, colShrink: false },
    4: { rowStart: 6, rowEnd: 7, colShrink: true },
  }[cupStep]!;

  const stemHideFrom = cupStep >= 2 ? 1 : 2;
  const extraRows = cupStep >= 4 ? 2 : cupStep >= 3 ? 1 : 0;
  const prefix = Array.from({ length: extraRows }, () => [...bandExtensionRow]);

  const modifiedFrame = baseFrame.map((row, rowIdx) => {
    return row.map((cell, colIdx) => {
      const isStemCol = colIdx === 1 || colIdx === 16;
      if (isStemCol && rowIdx >= stemHideFrom && rowIdx <= 2) {
        return 0;
      }

      const isLeftCup = colIdx <= 2;
      const isRightCup = colIdx >= 15;
      if (!isLeftCup && !isRightCup) return cell;

      if (cupBounds.colShrink) {
        if (colIdx === 0 || colIdx === 17) {
          if (rowIdx >= cupBounds.rowStart && rowIdx <= cupBounds.rowEnd) return 0;
          if (rowIdx >= 3 && rowIdx <= 6) return 0;
          return cell;
        }
      }

      if (rowIdx >= cupBounds.rowStart && rowIdx <= cupBounds.rowEnd) {
        return 1;
      }
      if (rowIdx >= 3 && rowIdx <= 6) {
        return 0;
      }
      return cell;
    });
  });

  return [...prefix, ...modifiedFrame];
}

function applyMouth(baseFrame: number[][], mouthOpen: boolean): number[][] {
  if (!mouthOpen) return baseFrame;

  return baseFrame.map((row, rowIdx) => {
    if (rowIdx === 8) {
      return row.map((cell, colIdx) =>
        colIdx >= 8 && colIdx <= 9 ? 3 : cell
      );
    }
    return row;
  });
}

export function DancingClaude({ isPlaying, isSpeaking = false, color = '#737373', crtEnabled = false, onClickCharacter }: DancingClaudeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frame, setFrame] = useState(0);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [headphonesDown, setHeadphonesDown] = useState(false);
  const [cupStep, setCupStep] = useState(0);
  const animatingRef = useRef(false);

  // Animate between frames when playing
  useEffect(() => {
    if (!isPlaying) {
      setFrame(0);
      return;
    }

    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % 4);
    }, 200);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Mouth animation while speaking
  useEffect(() => {
    if (!isSpeaking) {
      setMouthOpen(false);
      return;
    }

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
      setCupStep(1);
      setTimeout(() => setCupStep(2), 200);
      setTimeout(() => setCupStep(3), 400);
      setTimeout(() => {
        setCupStep(4);
        setHeadphonesDown(true);
        animatingRef.current = false;
      }, 600);
    } else {
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

  // Compute frame data
  const currentBody = useMemo(
    () => applyCupAnimation(applyMouth(bodyFrames[frame], mouthOpen), cupStep),
    [frame, mouthOpen, cupStep]
  );
  const currentLegs = legFrames[frame];
  const allRows = useMemo(() => [...currentBody, ...currentLegs], [currentBody, currentLegs]);

  // Body bob offset
  const bodyOffset = (frame === 1 || frame === 3) && isPlaying ? -2 : 0;

  // Canvas dimensions — add padding for glow overflow
  const GLOW_PAD = 12;
  const canvasWidth = GRID_WIDTH * CELL_SIZE + GLOW_PAD * 2;
  const canvasHeight = allRows.length * CELL_SIZE + GLOW_PAD * 2;

  // Draw to canvas — useLayoutEffect prevents flicker when canvas resizes
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set up glow for rave mode
    if (crtEnabled) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    for (let rowIdx = 0; rowIdx < allRows.length; rowIdx++) {
      const row = allRows[rowIdx];
      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const cell = row[colIdx];
        if (cell === 0) continue; // skip empty cells

        const x = colIdx * CELL_SIZE + GLOW_PAD;
        const y = rowIdx * CELL_SIZE + GLOW_PAD;

        if (cell === 1) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = color;
        } else if (cell === 2 || cell === 3) {
          // Eyes and mouth — transparent (skip drawing)
          continue;
        } else if (cell === 4) {
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = color;
        }

        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      }
    }

    // Reset alpha
    ctx.globalAlpha = 1;
  }, [allRows, color, crtEnabled]);

  return (
    <div
      className="dancing-claude phosphor-glow"
      role="button"
      aria-label="DJ Claude mascot"
      onClick={handleClick}
      style={{ cursor: 'default' }}
    >
      <div
        style={{
          marginTop: '8px',
          transform: `translateY(${bodyOffset}px)`,
          transition: 'transform 0.15s ease-out',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{ width: canvasWidth, height: canvasHeight, margin: -GLOW_PAD }}
        />
      </div>
    </div>
  );
}
