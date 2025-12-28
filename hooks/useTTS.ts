'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface UseTTSReturn {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
}

export function useTTS(): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voicesLoadedRef = useRef(false);

  // Load voices on mount (some browsers need this)
  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
      voicesLoadedRef.current = true;
    };

    loadVoices();
    // Chrome requires this event listener
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Select a good voice (prefer enhanced/premium voices)
  const getVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    // Prefer voices in order: Samantha, Alex, Daniel, or first English voice
    const preferredNames = ['Samantha', 'Alex', 'Daniel', 'Google US English', 'Microsoft David'];
    for (const name of preferredNames) {
      const voice = voices.find(v => v.name.includes(name));
      if (voice) return voice;
    }
    // Fallback to first English voice
    return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
  }, []);

  const speak = useCallback((text: string) => {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1; // Slightly faster for hype energy
    utterance.pitch = 1.0;
    utterance.volume = 0.9;

    const voice = getVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [getVoice]);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking };
}
