'use client';

import { createContext, useContext, ReactNode, useState, useCallback } from 'react';

// ElevenLabs voice configuration
export interface ElevenLabsVoice {
  id: string;
  name: string;
  description: string;
}

export const ELEVENLABS_VOICES: ElevenLabsVoice[] = [
  { id: 'm3t8QbmO10uDQqDoz2PX', name: 'Claude', description: 'Warm, articulate' },
  { id: 'xZOJqW4KGiIUDbmeUtiQ', name: 'Robot', description: 'Robotic, vintage' },
  { id: 'nbk2esDn4RRk4cVDdoiE', name: 'ASMR', description: 'Soft, whispery' },
];

interface VoiceContextType {
  selectedElevenLabsVoice: ElevenLabsVoice | null;
  setSelectedElevenLabsVoice: (voice: ElevenLabsVoice | null) => void;
  elevenLabsVoices: ElevenLabsVoice[];
}

const VoiceContext = createContext<VoiceContextType | null>(null);

export function VoiceProvider({ children }: { children: ReactNode }) {
  // ElevenLabs state - default to Rachel (first voice)
  const [selectedElevenLabsVoice, setSelectedElevenLabsVoiceState] = useState<ElevenLabsVoice | null>(ELEVENLABS_VOICES[0]);

  const setSelectedElevenLabsVoice = useCallback((voice: ElevenLabsVoice | null) => {
    setSelectedElevenLabsVoiceState(voice);
  }, []);

  return (
    <VoiceContext.Provider value={{
      selectedElevenLabsVoice,
      setSelectedElevenLabsVoice,
      elevenLabsVoices: ELEVENLABS_VOICES,
    }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}
