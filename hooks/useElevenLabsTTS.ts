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

  const cleanup = useCallback(() => {
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
      });

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

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
      setError(err instanceof Error ? err.message : 'TTS failed');
      setIsLoading(false);
      setIsSpeaking(false);
    }
  }, [stop, cleanup]);

  return { speak, stop, isSpeaking, isLoading, error };
}
