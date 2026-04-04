'use client';

import { useState, useCallback, useRef } from 'react';

interface UseElevenLabsTTSReturn {
  speak: (text: string, voiceId: string) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Get the shared AudioContext — either Strudel's (already unlocked when music plays)
 * or the one created by unlockAudio() in DJInterface during user gesture.
 */
function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const ctx =
    (window as any).getAudioContext?.() ??
    (window as any).__djClaudeAudioContext ??
    null;
  return ctx as AudioContext | null;
}

export function useElevenLabsTTS(): UseElevenLabsTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const cleanup = useCallback(() => {
    // Abort any in-flight fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {
        // stop() throws if already stopped — safe to ignore
      }
      try {
        sourceNodeRef.current.disconnect();
      } catch {
        // already disconnected
      }
      sourceNodeRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setIsSpeaking(false);
    setIsLoading(false);
  }, [cleanup]);

  const speak = useCallback(async (text: string, voiceId: string) => {
    stop();

    if (!text || !voiceId) return;

    const audioContext = getSharedAudioContext();
    if (!audioContext) {
      console.warn('[TTS] No AudioContext available yet — skipping speak()');
      return;
    }

    // Track this request so stale responses are ignored
    const currentRequestId = ++requestIdRef.current;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      // Resume context if suspended (belt-and-suspenders)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      // If a newer request was issued while we were waiting, discard this result
      if (currentRequestId !== requestIdRef.current) return;

      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Final staleness check after decode
      if (currentRequestId !== requestIdRef.current) return;

      // Create or reuse a GainNode for TTS volume control
      if (!gainNodeRef.current || gainNodeRef.current.context !== audioContext) {
        gainNodeRef.current = audioContext.createGain();
        gainNodeRef.current.connect(audioContext.destination);
      }

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(gainNodeRef.current);
      sourceNodeRef.current = source;

      source.onended = () => {
        setIsSpeaking(false);
        sourceNodeRef.current = null;
      };

      source.start(0);
      setIsLoading(false);
      setIsSpeaking(true);
    } catch (err) {
      // Silently ignore aborted requests
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'TTS failed');
      setIsLoading(false);
      setIsSpeaking(false);
    }
  }, [stop, cleanup]);

  return { speak, stop, isSpeaking, isLoading, error };
}
