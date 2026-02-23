import React from 'react';
import { Box, Text } from 'ink';

interface SpeechBubbleProps {
  text: string;
}

export function SpeechBubble({ text }: SpeechBubbleProps) {
  if (!text) return null;

  const maxWidth = 60;
  const lines: string[] = [];
  const words = text.split(' ');
  let current = '';

  for (const word of words) {
    if (current.length + word.length + 1 > maxWidth - 4) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);

  const contentWidth = Math.max(...lines.map((l) => l.length), 10);
  const border = '═'.repeat(contentWidth + 2);

  return (
    <Box flexDirection="column" alignItems="center">
      <Text color="#E8704E">{'╔' + border + '╗'}</Text>
      {lines.map((line, i) => (
        <Text key={i} color="#E8704E">
          {'║ '}{line.padEnd(contentWidth)}{' ║'}
        </Text>
      ))}
      <Text color="#E8704E">{'╚' + border + '╝'}</Text>
    </Box>
  );
}
