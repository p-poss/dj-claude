'use client';

import { useState, useCallback, useRef } from 'react';

interface UseElevenLabsTTSReturn {
  speak: (text: string, voiceId: string) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useElevenLabsTTS(): UseElevenLabsTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setIsSpeaking(false);
    setIsLoading(false);
  }, [cleanup]);

  const speak = useCallback(async (text: string, voiceId: string) => {
    console.log('[ElevenLabs] speak called:', { text: text?.substring(0, 50), voiceId });
    // Stop any current playback
    stop();

    if (!text || !voiceId) {
      console.log('[ElevenLabs] Missing text or voiceId, returning');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[ElevenLabs] Fetching from /api/tts');
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId }),
      });

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }
      console.log('[ElevenLabs] Response OK, creating audio');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      blobUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsLoading(false);
        setIsSpeaking(true);
      };

      audio.onended = () => {
        setIsSpeaking(false);
        cleanup();
      };

      audio.onerror = () => {
        setError('Audio playback failed');
        setIsSpeaking(false);
        setIsLoading(false);
        cleanup();
      };

      await audio.play();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'TTS failed');
      setIsLoading(false);
      setIsSpeaking(false);
    }
  }, [stop, cleanup]);

  return { speak, stop, isSpeaking, isLoading, error };
}
