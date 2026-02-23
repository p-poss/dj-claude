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
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    // Clear any pending debounced speak
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;

    // Clear any previous pending speak
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
    }

    // Cancel current speech
    window.speechSynthesis.cancel();
    setIsLoading(true);

    // Chrome drops speechSynthesis.speak() when called in the same stack
    // as cancel(). Deferring the speak avoids this bug entirely.
    pendingTimerRef.current = setTimeout(() => {
      pendingTimerRef.current = null;
      const utterance = new SpeechSynthesisUtterance(text);

      utterance.onstart = () => {
        setIsLoading(false);
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = () => {
        setIsLoading(false);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    }, 50);
  }, []);

  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { speak, stop, isSpeaking, isLoading };
}
