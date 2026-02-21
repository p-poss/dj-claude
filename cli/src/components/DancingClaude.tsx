import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { bodyFrames, legFrames } from '../lib/ascii-frames.js';

interface DancingClaudeProps {
  isPlaying: boolean;
}

function cellToChar(cell: number): string {
  // 1 = body block, 0/2/3 = space (eyes, mouth, empty are all transparent in terminal)
  return cell === 1 ? '█' : ' ';
}

export function DancingClaude({ isPlaying }: DancingClaudeProps) {
  const [frame, setFrame] = useState(0);

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

  const body = bodyFrames[frame];
  const legs = legFrames[frame];

  const allRows = [...body, ...legs];

  return (
    <Box flexDirection="column" alignItems="center">
      {allRows.map((row, i) => (
        <Text key={i} color="cyan">
          {row.map(cellToChar).join('')}
        </Text>
      ))}
    </Box>
  );
}
