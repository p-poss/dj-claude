'use client';

import { useCallback } from 'react';
import { useVoice } from '@/context/VoiceContext';
import { useElevenLabsTTS } from './useElevenLabsTTS';

interface UseTTSReturn {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isLoading: boolean;
}

export function useTTS(): UseTTSReturn {
  const { selectedElevenLabsVoice } = useVoice();
  const { speak: elevenLabsSpeak, stop, isSpeaking, isLoading } = useElevenLabsTTS();

  const speak = useCallback((text: string) => {
    if (!text || !selectedElevenLabsVoice) return;
    elevenLabsSpeak(text, selectedElevenLabsVoice.id);
  }, [elevenLabsSpeak, selectedElevenLabsVoice]);

  return {
    speak,
    stop,
    isSpeaking,
    isLoading,
  };
}
