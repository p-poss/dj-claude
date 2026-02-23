'use client';

import { useState, KeyboardEvent, forwardRef, useRef, useEffect, useImperativeHandle } from 'react';

interface ThemeColors {
  text: string;
  background: string;
}

export interface PromptInputAPI {
  focus: () => void;
  submit: () => void;
}

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  disabled: boolean;
  placeholder?: string;
  isStreaming?: boolean;
  themeColors?: ThemeColors;
  crtEnabled?: boolean;
  onHasValueChange?: (hasValue: boolean) => void;
}

export const PromptInput = forwardRef<PromptInputAPI, PromptInputProps>(
  function PromptInput({ onSubmit, disabled, placeholder, isStreaming, themeColors, crtEnabled = false, onHasValueChange }, ref) {
    const colors = themeColors || { text: '#737373', background: '#0a0a0a' };
    const [value, setValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [cursorPosition, setCursorPosition] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      submit: () => {
        if (!disabled && value.trim()) {
          onSubmit(value.trim());
          setValue('');
          setScrollLeft(0);
          setCursorPosition(0);
        }
      },
    }), [disabled, value, onSubmit]);

    // Sync scrollLeft when value changes (for cursor positioning during overflow)
    const prevHasValueRef = useRef(false);
    useEffect(() => {
      if (inputRef.current) {
        requestAnimationFrame(() => {
          if (inputRef.current) {
            setScrollLeft(inputRef.current.scrollLeft);
          }
        });
      }
      // Only notify parent on transitions between empty <-> non-empty
      const hasValue = value.trim().length > 0;
      if (hasValue !== prevHasValueRef.current) {
        prevHasValueRef.current = hasValue;
        onHasValueChange?.(hasValue);
      }
    }, [value, onHasValueChange]);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !disabled && value.trim()) {
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
          /* Neon glow on prompt borders when CRT mode is enabled */
          body.crt-screen .prompt-box {
            box-shadow:
              0 0 2px ${colors.text},
              0 0 4px ${colors.text},
              0 0 8px ${colors.text},
              inset 0 0 2px ${colors.text},
              inset 0 0 4px ${colors.text},
              inset 0 0 8px ${colors.text} !important;
          }
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
          .prompt-input-wrapper {
            position: relative;
            flex: 1;
          }
          @media (max-width: 767px) {
            .prompt-input,
            .cursor-overlay {
              font-size: 16px !important;
              line-height: 1 !important;
            }
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
          .prompt-input-overflow::-webkit-scrollbar {
            display: none;
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
        <div className="flex items-start">
          {/* Input box with CSS border - top and bottom only */}
          <div className="flex-1" style={{ position: 'relative', height: '32.5px', marginTop: '6px' }}>
            {/* Border overlay - wobbles independently in party mode */}
            <div className="prompt-box" style={{ position: 'absolute', inset: 0, border: `1px solid ${colors.text}`, borderRadius: '2px', pointerEvents: 'none' }} />
            {/* Content - stays still */}
            <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '8px', paddingRight: '8px' }}>
              <span style={{ position: 'relative' }}>
                {'❯'}
                {isStreaming && <span className="streaming-spinner" style={{ position: 'absolute', left: '100%', marginLeft: 'calc(0.5ch + 6px)' }} />}
              </span>
              <div className="prompt-input-overflow" style={{ overflow: 'hidden', flex: 1 }}>
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
          </div>

        </div>
      </div>
    );
  }
);
