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
    console.log('[BrowserTTS] stop() called', { hadPending: !!pendingTimerRef.current });
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
    console.log('[BrowserTTS] speak() called:', text?.slice(0, 60));
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) {
      console.log('[BrowserTTS] early return - missing text or speechSynthesis');
      return;
    }

    if (pendingTimerRef.current) {
      console.log('[BrowserTTS] clearing previous pending timer');
      clearTimeout(pendingTimerRef.current);
    }

    window.speechSynthesis.cancel();
    setIsLoading(true);

    pendingTimerRef.current = setTimeout(() => {
      pendingTimerRef.current = null;
      console.log('[BrowserTTS] timer fired, calling speechSynthesis.speak()');
      console.log('[BrowserTTS] voices available:', window.speechSynthesis.getVoices().length);

      const utterance = new SpeechSynthesisUtterance(text);

      utterance.onstart = () => {
        console.log('[BrowserTTS] onstart');
        setIsLoading(false);
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        console.log('[BrowserTTS] onend');
        setIsSpeaking(false);
      };

      utterance.onerror = (e) => {
        console.log('[BrowserTTS] onerror:', e.error, e);
        setIsLoading(false);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
      console.log('[BrowserTTS] after speak() - speaking:', window.speechSynthesis.speaking, 'pending:', window.speechSynthesis.pending);
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
