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

    // Cancel directly instead of calling stop() to avoid React state churn
    window.speechSynthesis.cancel();
    utteranceRef.current = null;

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

    // Chrome bug: cancel() immediately followed by speak() can silently fail.
    // A short delay ensures the cancellation completes before queuing new speech.
    setTimeout(() => {
      if (utteranceRef.current === utterance) {
        window.speechSynthesis.speak(utterance);
      }
    }, 10);
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
