'use client';

import { useState, KeyboardEvent, forwardRef, useRef, useEffect } from 'react';

interface ThemeColors {
  text: string;
  background: string;
}

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  disabled: boolean;
  placeholder?: string;
  isStreaming?: boolean;
  themeColors?: ThemeColors;
  crtEnabled?: boolean;
}

export const PromptInput = forwardRef<HTMLInputElement, PromptInputProps>(
  function PromptInput({ onSubmit, disabled, placeholder, isStreaming, themeColors, crtEnabled = false }, ref) {
    const colors = themeColors || { text: '#737373', background: '#0a0a0a' };
    const [value, setValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [cursorPosition, setCursorPosition] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Combine refs - sync on every render to ensure ref is always current
    useEffect(() => {
      if (ref && typeof ref === 'object') {
        (ref as React.MutableRefObject<HTMLInputElement | null>).current = inputRef.current;
      }
    });

    // Sync scrollLeft when value changes (for cursor positioning during overflow)
    useEffect(() => {
      if (inputRef.current) {
        requestAnimationFrame(() => {
          if (inputRef.current) {
            setScrollLeft(inputRef.current.scrollLeft);
          }
        });
      }
    }, [value]);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !disabled && value.trim()) {
        onSubmit(value.trim());
        setValue('');
        setScrollLeft(0);
        setCursorPosition(0);
      }
    };

    const handleSubmitClick = () => {
      if (!disabled && value.trim()) {
        onSubmit(value.trim());
        setValue('');
        setScrollLeft(0);
        setCursorPosition(0);
      }
    };

    return (
      <div
        className="text-xs select-none phosphor-glow"
        style={{ lineHeight: '1.2', fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace', color: colors.text }}
      >
        <style>{`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
          .prompt-input-wrapper {
            position: relative;
            flex: 1;
          }
          .prompt-input {
            background: transparent;
            border: none;
            outline: none;
            width: 100%;
            caret-color: transparent;
            padding: 0;
            margin: 0;
            height: auto;
            line-height: 1.2;
            text-indent: 4px;
            text-shadow: 0 0 2px currentColor, 0 0 4px currentColor;
          }
          .prompt-input::placeholder {
            color: inherit;
            opacity: 0.6;
          }
          .prompt-input::selection {
            background-color: ${colors.text};
            color: ${colors.background};
          }
          .prompt-input:focus::placeholder {
            color: transparent;
          }
          .cursor-overlay {
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
            display: flex;
            align-items: center;
            height: 100%;
            color: transparent;
            z-index: 10;
          }
          @keyframes spin {
            0% { content: '⠋'; }
            8% { content: '⠙'; }
            16% { content: '⠹'; }
            24% { content: '⠸'; }
            32% { content: '⠼'; }
            40% { content: '⠴'; }
            48% { content: '⠦'; }
            56% { content: '⠧'; }
            64% { content: '⠇'; }
            72% { content: '⠏'; }
            80% { content: '⠋'; }
            100% { content: '⠋'; }
          }
          .streaming-spinner::before {
            content: '⠋';
            animation: spin 0.8s linear infinite;
            display: inline-block;
          }
        `}</style>
        {/* Input row with submit button */}
        <div className="flex items-start gap-2">
          {/* Input box with CSS border - top and bottom only */}
          <div className="flex-1" style={{ borderTop: `1px solid ${colors.text}`, borderBottom: `1px solid ${colors.text}`, height: '32.5px', maxWidth: '504px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '8px', paddingRight: '8px' }}>
              <span style={{ position: 'relative' }}>
                {'❯'}
                {isStreaming && <span className="streaming-spinner" style={{ position: 'absolute', left: '100%', marginLeft: 'calc(0.5ch + 6px)' }} />}
              </span>
              <div style={{ overflowX: 'hidden', overflowY: 'visible', flex: 1 }}>
                <div className="prompt-input-wrapper">
                  <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value);
                      setCursorPosition(e.target.selectionStart || 0);
                    }}
                    onKeyDown={handleKeyDown}
                    onKeyUp={(e) => setCursorPosition(e.currentTarget.selectionStart || 0)}
                    onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart || 0)}
                    onClick={(e) => setCursorPosition(e.currentTarget.selectionStart || 0)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
                    disabled={disabled}
                    placeholder={disabled || !isFocused ? (placeholder || 'give claude direction...') : ''}
                    className="prompt-input text-xs disabled:cursor-not-allowed"
                    style={{ fontFamily: 'inherit', color: colors.text }}
                  />
                  {/* Cursor overlay - positioned after the text */}
                  {isFocused && !disabled && (
                    <div className="cursor-overlay text-xs" style={{ fontFamily: 'inherit', transform: `translateX(-${scrollLeft}px)` }}>
                      <span style={{ visibility: 'hidden', whiteSpace: 'pre', marginLeft: '4px' }}>{value.slice(0, cursorPosition)}</span>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '1ch',
                          height: '1.2em',
                          backgroundColor: colors.text,
                          animation: 'blink 1.5s step-end infinite',
                          verticalAlign: 'text-bottom',
                          boxShadow: `0 0 4px ${colors.text}, 0 0 8px ${colors.text}`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmitClick}
            disabled={disabled || !value.trim()}
            className={`group ascii-box ${disabled || !value.trim() ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
            style={{ width: 'fit-content' }}
          >
            <div className={disabled || !value.trim() ? '' : 'group-hover:opacity-30'}>
              <pre className="m-0" style={crtEnabled ? { textShadow: '0 0 2px currentColor, 0 0 4px currentColor, 0 0 8px currentColor' } : undefined}>╔═══╗</pre>
              <div className="flex" style={{ fontFamily: 'inherit' }}>
                <pre className="m-0" style={crtEnabled ? { textShadow: '0 0 2px currentColor, 0 0 4px currentColor, 0 0 8px currentColor' } : undefined}>║</pre>
                <pre className="m-0 flex-1 text-center" style={crtEnabled ? { textShadow: '0 0 2px currentColor, 0 0 4px currentColor, 0 0 8px currentColor' } : undefined}>⬆</pre>
                <pre className="m-0" style={crtEnabled ? { textShadow: '0 0 2px currentColor, 0 0 4px currentColor, 0 0 8px currentColor' } : undefined}>║</pre>
              </div>
              <pre className="m-0" style={crtEnabled ? { textShadow: '0 0 2px currentColor, 0 0 4px currentColor, 0 0 8px currentColor' } : undefined}>╚═══╝</pre>
            </div>
          </button>
        </div>
      </div>
    );
  }
);
