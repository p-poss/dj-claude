'use client';

import { createContext, useContext, ReactNode, useState, useCallback } from 'react';

// ElevenLabs voice configuration
export interface ElevenLabsVoice {
  id: string;
  name: string;
  description: string;
}

export const ELEVENLABS_VOICES: ElevenLabsVoice[] = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Clear, professional' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', description: 'Strong, confident' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', description: 'Youthful, energetic' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'Deep, dynamic' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', description: 'Assertive, powerful' },
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
