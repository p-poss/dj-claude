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

  return (
    <div
      style={{
        position: 'absolute',
        left: '130px',
        top: '8px',
        opacity,
        transition: 'opacity 0.3s ease-in-out',
        fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace',
        fontSize: '12px',
        color: color,
        zIndex: 100,
        pointerEvents: 'none',
      }}
    >
      {/* Bubble container */}
      <div
        style={{
          border: `1px solid ${color}`,
          borderRadius: '2px',
          padding: '8px 12px',
          width: 'max-content',
          maxWidth: '335px',
          height: '60px',
          boxShadow: `0 0 2px ${color}, 0 0 4px ${color}, 0 0 8px ${color}, inset 0 0 2px ${color}, inset 0 0 4px ${color}, inset 0 0 8px ${color}`,
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
        }}
      >
        {text}
      </div>

      {/* Tail pointing to character */}
      <div
        style={{
          marginLeft: '12px',
          marginTop: '0.5px',
          color: color,
          textShadow: `0 0 2px ${color}, 0 0 4px ${color}, 0 0 8px ${color}`,
        }}
      >
        ◢
      </div>
    </div>
  );
}
