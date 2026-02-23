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
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      // Resume after cancel to prevent Chrome from getting stuck
      window.speechSynthesis.resume();
    }
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;

    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
    }

    window.speechSynthesis.cancel();
    setIsLoading(true);

    pendingTimerRef.current = setTimeout(() => {
      pendingTimerRef.current = null;

      const synth = window.speechSynthesis;

      // Reset synth state — Chrome can get stuck after cancel()
      synth.resume();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = 1;

      utterance.onstart = () => {
        setIsLoading(false);
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = (e) => {
        if (e.error !== 'canceled') {
          console.warn('[BrowserTTS] error:', e.error);
        }
        setIsLoading(false);
        setIsSpeaking(false);
      };

      synth.speak(utterance);

      // Chrome workaround: periodically resume to prevent speech from freezing
      const resumeInterval = setInterval(() => {
        if (!synth.speaking) {
          clearInterval(resumeInterval);
          return;
        }
        synth.resume();
      }, 5000);

      utterance.onend = () => {
        clearInterval(resumeInterval);
        setIsSpeaking(false);
      };

      utterance.onerror = (e) => {
        clearInterval(resumeInterval);
        if (e.error !== 'canceled') {
          console.warn('[BrowserTTS] error:', e.error);
        }
        setIsLoading(false);
        setIsSpeaking(false);
      };
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
