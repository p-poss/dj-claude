'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useVoice, getVoiceMatchString } from '@/context/VoiceContext';

interface UseTTSReturn {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
}

export function useTTS(): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voicesLoadedRef = useRef(false);
  const { selectedVoiceName } = useVoice();

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

  // Select a voice based on user selection or auto-fallback
  const getVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();

    // If user has selected a specific voice, try to use it
    if (selectedVoiceName) {
      const matchString = getVoiceMatchString(selectedVoiceName);
      const selectedVoice = voices.find(v => v.name.includes(matchString));
      if (selectedVoice) return selectedVoice;
    }

    // Auto mode: prefer voices in order
    const preferredNames = ['Samantha', 'Alex', 'Daniel', 'Google US English', 'Microsoft David'];
    for (const name of preferredNames) {
      const voice = voices.find(v => v.name.includes(name));
      if (voice) return voice;
    }
    // Fallback to first English voice
    return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
  }, [selectedVoiceName]);

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
