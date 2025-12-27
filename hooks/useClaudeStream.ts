'use client';

import { useCallback } from 'react';
import { useDJ } from '@/context/DJContext';
import { Message } from '@/lib/types';

interface StreamOptions {
  prompt: string;
  currentCode: string;
  history: Message[];
}

export function useClaudeStream() {
  const { dispatch } = useDJ();

  const streamCode = useCallback(async ({ prompt, currentCode, history }: StreamOptions): Promise<string> => {
    dispatch({ type: 'START_STREAMING' });
    dispatch({ type: 'ADD_USER_MESSAGE', content: prompt });

    try {
      const response = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, currentCode, history }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stream request failed: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        dispatch({ type: 'APPEND_STREAM', text: chunk });
      }

      dispatch({ type: 'STREAM_COMPLETE', code: fullText });
      return fullText;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch({ type: 'STREAM_ERROR', error: errorMessage });
      throw error;
    }
  }, [dispatch]);

  return { streamCode };
}
