'use client';

import { useCallback, useRef, useState } from 'react';

// Strudel functions will be available globally after initStrudel()
declare global {
  function initStrudel(options?: { prebake?: () => Promise<void> }): Promise<void>;
  function evaluate(code: string): Promise<void>;
  function hush(): void;
}

function extractCodeFromMarkdown(text: string): string {
  // Match code block: ```javascript or ``` followed by code and closing ```
  const codeBlockRegex = /```(?:javascript|js)?\s*\n?([\s\S]*?)```/;
  const match = text.match(codeBlockRegex);

  if (match) {
    return match[1].trim();
  }

  // If no code block found, return trimmed text
  return text.trim();
}

export function useStrudel() {
  const [initialized, setInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const currentPatternRef = useRef<string>('');

  const initialize = useCallback(async () => {
    if (initialized || isInitializing) return;

    setIsInitializing(true);
    setError(null);

    try {
      // Dynamic import to avoid SSR issues
      // @ts-expect-error - @strudel/web doesn't have TypeScript types
      await import('@strudel/web');

      await initStrudel();

      setInitialized(true);
    } catch (err) {
      setError(`Failed to initialize audio: ${err}`);
      console.error('Strudel init error:', err);
    } finally {
      setIsInitializing(false);
    }
  }, [initialized, isInitializing]);

  const executeCode = useCallback(async (code: string): Promise<boolean> => {
    if (!initialized) {
      setError('Audio not initialized');
      return false;
    }

    try {
      // Extract code from markdown code block if present
      const cleanCode = extractCodeFromMarkdown(code);

      if (!cleanCode) {
        setError('No code to execute');
        return false;
      }

      await evaluate(cleanCode);
      currentPatternRef.current = cleanCode;
      setIsPlaying(true);
      setError(null);
      return true;
    } catch (err) {
      const errorMessage = parseStrudelError(err);
      setError(errorMessage);
      console.error('Strudel execution error:', err);
      // Don't stop current pattern on error
      return false;
    }
  }, [initialized]);

  const stop = useCallback(() => {
    if (typeof hush === 'function') {
      hush();
    }
    setIsPlaying(false);
  }, []);

  return {
    initialized,
    isInitializing,
    isPlaying,
    error,
    currentPattern: currentPatternRef.current,
    initialize,
    executeCode,
    stop,
  };
}

function parseStrudelError(err: unknown): string {
  const message = String(err);

  if (message.includes('is not defined')) {
    const match = message.match(/(\w+) is not defined/);
    return `Unknown function: ${match?.[1] || 'unknown'}`;
  }

  if (message.includes('Unexpected token')) {
    return 'Syntax error in pattern';
  }

  if (message.includes('is not a function')) {
    const match = message.match(/(\w+) is not a function/);
    return `Invalid function call: ${match?.[1] || 'unknown'}`;
  }

  // Truncate long error messages
  const truncated = message.slice(0, 100);
  return truncated.length < message.length ? `${truncated}...` : truncated;
}
