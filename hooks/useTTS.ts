'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useVoice, getVoiceMatchString } from '@/context/VoiceContext';
import { useElevenLabsTTS } from './useElevenLabsTTS';

interface UseTTSReturn {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isLoading?: boolean;
}

export function useTTS(): UseTTSReturn {
  const [webSpeechIsSpeaking, setWebSpeechIsSpeaking] = useState(false);
  const voicesLoadedRef = useRef(false);
  const { selectedVoiceName, ttsProvider, selectedElevenLabsVoice } = useVoice();

  // ElevenLabs hook - destructure to get stable function references
  const { speak: elevenLabsSpeak, stop: elevenLabsStop, isSpeaking: elevenLabsIsSpeaking, isLoading: elevenLabsIsLoading } = useElevenLabsTTS();

  // Unified isSpeaking state
  const isSpeaking = ttsProvider === 'elevenlabs'
    ? elevenLabsIsSpeaking
    : webSpeechIsSpeaking;

  // Load voices on mount (some browsers need this)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

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
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;

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
    console.log('[useTTS] speak called:', { text: text?.substring(0, 50), ttsProvider, hasElevenLabsVoice: !!selectedElevenLabsVoice });
    if (!text) return;

    // Use ElevenLabs if selected and voice is configured
    if (ttsProvider === 'elevenlabs' && selectedElevenLabsVoice) {
      console.log('[useTTS] Using ElevenLabs');
      elevenLabsSpeak(text, selectedElevenLabsVoice.id);
      return;
    }

    // Fall back to Web Speech API
    console.log('[useTTS] Using Web Speech API');
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.log('[useTTS] Web Speech API not available');
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

    utterance.onstart = () => setWebSpeechIsSpeaking(true);
    utterance.onend = () => setWebSpeechIsSpeaking(false);
    utterance.onerror = () => setWebSpeechIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [ttsProvider, selectedElevenLabsVoice, elevenLabsSpeak, getVoice]);

  const stop = useCallback(() => {
    // Stop ElevenLabs
    elevenLabsStop();

    // Stop Web Speech
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setWebSpeechIsSpeaking(false);
  }, [elevenLabsStop]);

  return {
    speak,
    stop,
    isSpeaking,
    isLoading: ttsProvider === 'elevenlabs' ? elevenLabsIsLoading : false,
  };
}
