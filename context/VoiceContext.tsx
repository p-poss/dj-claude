'use client';

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';

// TTS Provider types
export type TTSProvider = 'web-speech' | 'elevenlabs';

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

// Curated list of high-quality voices: { displayName: matchString }
const CURATED_VOICES: Record<string, string> = {
  'Samantha': 'Samantha',
  'Alex': 'Alex',
  'Daniel': 'Daniel',
  'Google US': 'Google US English',
  'Microsoft David': 'Microsoft David',
};

// Priority order for Auto mode (matches useTTS.ts)
const AUTO_VOICE_PRIORITY = ['Samantha', 'Alex', 'Daniel', 'Google US', 'Microsoft David'];

// Get the voice match string from display name
export function getVoiceMatchString(displayName: string): string {
  return CURATED_VOICES[displayName] || displayName;
}

interface VoiceContextType {
  // Web Speech API state
  selectedVoiceName: string | null;  // null = "Auto" mode
  setSelectedVoiceName: (name: string | null) => void;
  availableVoices: string[];  // Curated voices that exist on this system
  currentVoiceName: string;   // Resolved display name ("Auto" or voice name)
  resolvedAutoVoice: string | null;  // Which voice Auto mode resolves to

  // TTS Provider state
  ttsProvider: TTSProvider;
  setTTSProvider: (provider: TTSProvider) => void;

  // ElevenLabs state
  selectedElevenLabsVoice: ElevenLabsVoice | null;
  setSelectedElevenLabsVoice: (voice: ElevenLabsVoice | null) => void;
  elevenLabsVoices: ElevenLabsVoice[];
}

const VoiceContext = createContext<VoiceContextType | null>(null);

export function VoiceProvider({ children }: { children: ReactNode }) {
  // Web Speech API state
  const [selectedVoiceName, setSelectedVoiceNameState] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<string[]>([]);
  const [resolvedAutoVoice, setResolvedAutoVoice] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // TTS Provider state - default to ElevenLabs
  const [ttsProvider, setTTSProviderState] = useState<TTSProvider>('elevenlabs');

  // ElevenLabs state - default to Rachel (first voice)
  const [selectedElevenLabsVoice, setSelectedElevenLabsVoiceState] = useState<ElevenLabsVoice | null>(ELEVENLABS_VOICES[0]);

  // Load voices and filter to curated list
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      // Filter to only voices that match our curated list (use display names)
      const available = Object.entries(CURATED_VOICES)
        .filter(([, matchString]) => voices.some(v => v.name.includes(matchString)))
        .map(([displayName]) => displayName);
      setAvailableVoices(available);

      // Determine which voice Auto mode would use (first available in priority order)
      const autoVoice = AUTO_VOICE_PRIORITY.find(name => available.includes(name)) || null;
      setResolvedAutoVoice(autoVoice);
    };

    // Load immediately
    loadVoices();

    // Chrome requires this event listener
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Load saved preferences from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load Web Speech voice selection
    const savedVoice = localStorage.getItem('djclaude-voice');
    if (savedVoice) {
      setSelectedVoiceNameState(savedVoice);
    }

    // Load TTS provider
    const savedProvider = localStorage.getItem('djclaude-tts-provider') as TTSProvider;
    if (savedProvider && (savedProvider === 'web-speech' || savedProvider === 'elevenlabs')) {
      setTTSProviderState(savedProvider);
    }

    // Load ElevenLabs voice selection
    const savedElevenLabsVoiceId = localStorage.getItem('djclaude-elevenlabs-voice');
    if (savedElevenLabsVoiceId) {
      const voice = ELEVENLABS_VOICES.find(v => v.id === savedElevenLabsVoiceId);
      if (voice) {
        setSelectedElevenLabsVoiceState(voice);
      }
    }

    setIsLoaded(true);
  }, []);

  // Persist Web Speech voice selection to localStorage
  const setSelectedVoiceName = useCallback((name: string | null) => {
    setSelectedVoiceNameState(name);
    if (typeof window !== 'undefined') {
      if (name) {
        localStorage.setItem('djclaude-voice', name);
      } else {
        localStorage.removeItem('djclaude-voice');
      }
    }
  }, []);

  // Persist TTS provider to localStorage
  const setTTSProvider = useCallback((provider: TTSProvider) => {
    setTTSProviderState(provider);
    if (typeof window !== 'undefined') {
      localStorage.setItem('djclaude-tts-provider', provider);
    }
    // Auto-select first ElevenLabs voice if switching to elevenlabs and none selected
    if (provider === 'elevenlabs' && !selectedElevenLabsVoice && ELEVENLABS_VOICES.length > 0) {
      setSelectedElevenLabsVoiceState(ELEVENLABS_VOICES[0]);
      if (typeof window !== 'undefined') {
        localStorage.setItem('djclaude-elevenlabs-voice', ELEVENLABS_VOICES[0].id);
      }
    }
  }, [selectedElevenLabsVoice]);

  // Persist ElevenLabs voice selection to localStorage
  const setSelectedElevenLabsVoice = useCallback((voice: ElevenLabsVoice | null) => {
    setSelectedElevenLabsVoiceState(voice);
    if (typeof window !== 'undefined') {
      if (voice) {
        localStorage.setItem('djclaude-elevenlabs-voice', voice.id);
      } else {
        localStorage.removeItem('djclaude-elevenlabs-voice');
      }
    }
  }, []);

  // Validate that saved voice is still available
  useEffect(() => {
    if (!isLoaded || availableVoices.length === 0) return;

    // If selected voice doesn't exist on this system, reset to Auto
    if (selectedVoiceName && !availableVoices.includes(selectedVoiceName)) {
      setSelectedVoiceName(null);
    }
  }, [isLoaded, availableVoices, selectedVoiceName, setSelectedVoiceName]);

  // Resolve the display name
  const currentVoiceName = selectedVoiceName || 'Auto';

  return (
    <VoiceContext.Provider value={{
      // Web Speech API
      selectedVoiceName,
      setSelectedVoiceName,
      availableVoices,
      currentVoiceName,
      resolvedAutoVoice,
      // TTS Provider
      ttsProvider,
      setTTSProvider,
      // ElevenLabs
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
