'use client';

import { useState, KeyboardEvent, forwardRef, useRef, useEffect } from 'react';

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  disabled: boolean;
  placeholder?: string;
  isStreaming?: boolean;
}

export const PromptInput = forwardRef<HTMLInputElement, PromptInputProps>(
  function PromptInput({ onSubmit, disabled, placeholder, isStreaming }, ref) {
    const [value, setValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Combine refs - sync on every render to ensure ref is always current
    useEffect(() => {
      if (ref && typeof ref === 'object') {
        (ref as React.MutableRefObject<HTMLInputElement | null>).current = inputRef.current;
      }
    });

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !disabled && value.trim()) {
        onSubmit(value.trim());
        setValue('');
      }
    };

    return (
      <div
        className="text-xs text-neutral-500 select-none"
        style={{ lineHeight: '1.2', fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace' }}
      >
        <style>{`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
          .terminal-cursor {
            display: inline-block;
            width: 8px;
            height: 1.1em;
            background-color: #737373;
            animation: blink 1.5s step-end infinite;
            vertical-align: text-bottom;
            margin-left: 1px;
          }
          .prompt-input-wrapper {
            position: relative;
            flex: 1;
          }
          .prompt-input {
            background: transparent;
            border: none;
            outline: none;
            color: #737373;
            width: 100%;
            caret-color: transparent;
            padding: 0;
            margin: 0;
            height: auto;
            line-height: 1.2;
          }
          .prompt-input::placeholder {
            color: #525252;
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
        {/* Input box with ASCII border style - top and bottom only */}
        <div className="w-full overflow-hidden">
          <pre className="m-0 whitespace-nowrap overflow-hidden">{'═'.repeat(75)}</pre>
          <div className="flex items-center gap-2">
            <span className="text-neutral-500">{'>'}</span>
            {isStreaming && <span className="streaming-spinner text-neutral-500" />}
            <div className="prompt-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={disabled}
                placeholder={disabled || !isFocused ? (placeholder || 'give claude direction...') : ''}
                className="prompt-input text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'inherit' }}
              />
              {/* Cursor overlay - positioned after the text */}
              {isFocused && !disabled && (
                <div className="cursor-overlay text-xs" style={{ fontFamily: 'inherit' }}>
                  <span style={{ visibility: 'hidden', whiteSpace: 'pre' }}>{value}</span>
                  <span className="terminal-cursor" />
                </div>
              )}
            </div>
          </div>
          <pre className="m-0 whitespace-nowrap overflow-hidden">{'═'.repeat(75)}</pre>
        </div>
      </div>
    );
  }
);
