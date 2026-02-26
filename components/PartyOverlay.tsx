'use client';

import { memo } from 'react';

interface PartyOverlayProps {
  enabled: boolean;
  color: string;
}

// Static confetti data — computed once at module load
const CONFETTI_CHARS = [
  '█', '▓', '▒', '░', '▀', '▄',
  '*', '#', '@', '+', '×', '·', '○', '◆',
  '[*]', '<>', '{}', '/*', '*/', '::',
];

const CONFETTI_PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  char: CONFETTI_CHARS[i % CONFETTI_CHARS.length],
  left: `${(i * 5) % 100}%`,
  animationDelay: `${(i * 0.3) % 4}s`,
  animationDuration: `${3 + (i % 3)}s`,
  fontSize: `${16 + (i % 12)}px`,
}));

export const PartyOverlay = memo(function PartyOverlay({ enabled, color }: PartyOverlayProps) {
  if (!enabled) return null;

  return (
    <>
      {/* Confetti container — hue cycling handled by parent CSS animation */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 9997,
          overflow: 'hidden',
        }}
      >
        {CONFETTI_PARTICLES.map((particle) => (
          <div
            key={particle.id}
            className="phosphor-glow"
            style={{
              position: 'absolute',
              left: particle.left,
              top: '-50px',
              fontSize: particle.fontSize,
              fontFamily: 'monospace',
              color: color,
              animation: `confetti-fall-react ${particle.animationDuration} linear infinite`,
              animationDelay: particle.animationDelay,
            }}
          >
            {particle.char}
          </div>
        ))}
      </div>

      {/* Inline styles for confetti animation */}
      <style jsx global>{`
        @keyframes confetti-fall-react {
          0% {
            transform: translateY(-50px) rotate(0deg);
          }
          100% {
            transform: translateY(calc(100dvh + 50px)) rotate(720deg);
          }
        }

        /* Party mode bouncing buttons */
        body.party-mode button {
          animation: party-bounce-react 1s linear infinite !important;
        }

        /* Don't bounce buttons inside phosphor-glow containers (unless they're ascii-box) */
        body.party-mode .phosphor-glow button:not(.ascii-box) {
          animation: none !important;
        }

        @keyframes party-bounce-react {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        /* Party mode wobbling pre elements */
        body.party-mode pre {
          animation: party-wobble-react 1s linear infinite !important;
        }

        /* ASCII boxes wobble as a unit - the container wobbles, not individual pre elements */
        body.party-mode .ascii-box {
          animation: party-wobble-react 1s linear infinite !important;
        }
        body.party-mode .ascii-box pre {
          animation: none !important;
        }

        /* Dancing Claude wobbles as a unit */
        body.party-mode .dancing-claude {
          animation: party-wobble-react 1s linear infinite !important;
        }


        @keyframes party-wobble-react {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-1deg); }
          75% { transform: rotate(1deg); }
        }
      `}</style>
    </>
  );
});
