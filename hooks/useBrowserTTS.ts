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
    console.log('[BrowserTTS] speak called:', { text, hasWindow: typeof window !== 'undefined', hasSynth: typeof window !== 'undefined' && !!window.speechSynthesis });
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    utterance.onstart = () => {
      console.log('[BrowserTTS] onstart');
      if (utteranceRef.current === utterance) {
        setIsLoading(false);
        setIsSpeaking(true);
      }
    };

    utterance.onend = () => {
      console.log('[BrowserTTS] onend');
      if (utteranceRef.current === utterance) {
        setIsSpeaking(false);
        utteranceRef.current = null;
      }
    };

    utterance.onerror = (e) => {
      console.log('[BrowserTTS] onerror:', e.error);
      if (utteranceRef.current === utterance) {
        setIsLoading(false);
        setIsSpeaking(false);
        utteranceRef.current = null;
      }
    };

    setIsLoading(true);
    console.log('[BrowserTTS] calling speechSynthesis.speak()');
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
