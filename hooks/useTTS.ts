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
  const elevenLabs = useElevenLabsTTS();
  const browserTTS = useBrowserTTS();

  const isBrowser = selectedElevenLabsVoice?.id === 'browser-tts';

  const speak = useCallback((text: string) => {
    if (!text || !selectedElevenLabsVoice) return;

    if (isBrowser) {
      browserTTS.speak(text);
    } else {
      elevenLabs.speak(text, selectedElevenLabsVoice.id);
    }
  }, [elevenLabs, browserTTS, selectedElevenLabsVoice, isBrowser]);

  const stop = useCallback(() => {
    elevenLabs.stop();
    browserTTS.stop();
  }, [elevenLabs, browserTTS]);

  return {
    speak,
    stop,
    isSpeaking: isBrowser ? browserTTS.isSpeaking : elevenLabs.isSpeaking,
    isLoading: isBrowser ? browserTTS.isLoading : elevenLabs.isLoading,
  };
}
