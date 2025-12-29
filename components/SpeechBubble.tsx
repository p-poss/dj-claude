'use client';

import { useEffect, useState } from 'react';

interface SpeechBubbleProps {
  text: string;
  isVisible: boolean;
  color?: string;
}

export function SpeechBubble({ text, isVisible, color = '#737373' }: SpeechBubbleProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (isVisible && text) {
      setShouldRender(true);
      // Small delay for mount, then fade in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setOpacity(1));
      });
    } else {
      setOpacity(0);
      // Wait for fade out before unmounting
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, text]);

  if (!shouldRender || !text) return null;

  // Fixed number of content rows to match character height
  // Character: 12 rows × 6px = 72px + 8px margin = 80px
  // Bubble: top border + 2 content rows + bottom border + tail = 5 lines
  const fixedContentRows = 3;
  const maxLineLength = 60; // Allow wider bubbles for more text

  // Word wrap text
  const words = text.split(' ');
  const textLines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxLineLength) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) textLines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) textLines.push(currentLine);

  // Pad with empty lines to fill fixed height, text at top
  const contentLines = [...textLines];
  while (contentLines.length < fixedContentRows) {
    contentLines.push('');
  }
  // If text is longer than fixed rows, truncate (shouldn't happen with short commentary)
  const displayLines = contentLines.slice(0, fixedContentRows);

  // Calculate bubble width based on longest line (can expand wider)
  const longestLine = Math.max(...textLines.map(l => l.length), 20);
  const bubbleWidth = longestLine + 4;

  return (
    <div
      style={{
        position: 'absolute',
        left: '130px',
        top: '1.5px', // Aligned so tail bottom matches character feet
        opacity,
        transition: 'opacity 0.3s ease-in-out',
        fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace',
        fontSize: '12px',
        color: color,
        whiteSpace: 'pre',
        lineHeight: '13.5px',
        zIndex: 100,
        pointerEvents: 'none',
        textShadow: `0 0 2px ${color}, 0 0 4px ${color}`,
      }}
    >
      {/* Top border */}
      <div>{'╭' + '─'.repeat(bubbleWidth) + '╮'}</div>

      {/* Fixed content rows */}
      {displayLines.map((line, i) => (
        <div key={i}>{'│ '}{line.padEnd(bubbleWidth - 2)}{' │'}</div>
      ))}

      {/* Bottom border */}
      <div>{'╰' + '─'.repeat(bubbleWidth) + '╯'}</div>

      {/* Tail pointing to character */}
      <div style={{ paddingLeft: '2ch' }}>{'◢'}</div>
    </div>
  );
}
