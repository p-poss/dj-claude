'use client';

import { useCallback } from 'react';
import { useVoice } from '@/context/VoiceContext';
import { useElevenLabsTTS } from './useElevenLabsTTS';
import { useBrowserTTS } from './useBrowserTTS';

interface UseTTSReturn {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isLoading: boolean;
}

export function useTTS(): UseTTSReturn {
  const { selectedElevenLabsVoice } = useVoice();
  const {
    speak: elevenLabsSpeak, stop: elevenLabsStop,
    isSpeaking: elevenLabsIsSpeaking, isLoading: elevenLabsIsLoading,
  } = useElevenLabsTTS();
  const {
    speak: browserSpeak, stop: browserStop,
    isSpeaking: browserIsSpeaking, isLoading: browserIsLoading,
  } = useBrowserTTS();

  const isBrowser = selectedElevenLabsVoice?.id === 'browser-tts';

  const speak = useCallback((text: string) => {
    if (!text || !selectedElevenLabsVoice) return;

    if (selectedElevenLabsVoice.id === 'browser-tts') {
      browserSpeak(text);
    } else {
      elevenLabsSpeak(text, selectedElevenLabsVoice.id);
    }
  }, [elevenLabsSpeak, browserSpeak, selectedElevenLabsVoice]);

  const stop = useCallback(() => {
    elevenLabsStop();
    browserStop();
  }, [elevenLabsStop, browserStop]);

  return {
    speak,
    stop,
    isSpeaking: isBrowser ? browserIsSpeaking : elevenLabsIsSpeaking,
    isLoading: isBrowser ? browserIsLoading : elevenLabsIsLoading,
  };
}
