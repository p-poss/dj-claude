'use client';

import { useEffect, useState, useMemo } from 'react';

interface SpeechBubbleProps {
  text: string;
  isVisible: boolean;
  color?: string;
}

const OUTER_STYLE: React.CSSProperties = {
  position: 'absolute',
  left: '130px',
  top: '8px',
  transition: 'opacity 0.3s ease-in-out',
  fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace',
  fontSize: '12px',
  lineHeight: '15px',
  zIndex: 100,
  pointerEvents: 'none',
};

const BUBBLE_STYLE: React.CSSProperties = {
  border: '1px solid var(--bubble-color)',
  borderRadius: '2px',
  padding: '6px 12px',
  width: 'max-content',
  maxWidth: '335px',
  height: '60px',
  boxShadow:
    '0 0 2px var(--bubble-color), 0 0 4px var(--bubble-color), 0 0 8px var(--bubble-color), ' +
    'inset 0 0 2px var(--bubble-color), inset 0 0 4px var(--bubble-color), inset 0 0 8px var(--bubble-color)',
  whiteSpace: 'pre-wrap',
  overflow: 'hidden',
};

const TAIL_STYLE: React.CSSProperties = {
  marginLeft: '12px',
  marginTop: '0.5px',
  color: 'var(--bubble-color)',
  textShadow:
    '0 0 2px var(--bubble-color), 0 0 4px var(--bubble-color), 0 0 8px var(--bubble-color)',
};

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

  const outerStyle = useMemo(() => ({
    ...OUTER_STYLE,
    '--bubble-color': color,
    opacity,
    color,
  } as React.CSSProperties), [color, opacity]);

  if (!shouldRender || !text) return null;

  return (
    <div
      className="phosphor-glow"
      aria-live="polite"
      role="status"
      style={outerStyle}
    >
      {/* Bubble container */}
      <div style={BUBBLE_STYLE}>
        {text}
      </div>

      {/* Tail pointing to character */}
      <div style={TAIL_STYLE}>
        ◢
      </div>
    </div>
  );
}
