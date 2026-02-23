'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseBrowserTTSReturn {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isLoading: boolean;
}

export function useBrowserTTS(): UseBrowserTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;

    // Do NOT call speechSynthesis.cancel() here — Chrome silently drops
    // a speak() that immediately follows cancel() in the same call stack.
    // Explicit stopping is handled by the stop() function instead.

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    utterance.onstart = () => {
      if (utteranceRef.current === utterance) {
        setIsLoading(false);
        setIsSpeaking(true);
      }
    };

    utterance.onend = () => {
      if (utteranceRef.current === utterance) {
        setIsSpeaking(false);
        utteranceRef.current = null;
      }
    };

    utterance.onerror = () => {
      if (utteranceRef.current === utterance) {
        setIsLoading(false);
        setIsSpeaking(false);
        utteranceRef.current = null;
      }
    };

    setIsLoading(true);
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { speak, stop, isSpeaking, isLoading };
}
