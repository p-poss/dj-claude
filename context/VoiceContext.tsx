'use client';

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';

// Curated list of high-quality voices: { displayName: matchString }
const CURATED_VOICES: Record<string, string> = {
  'Samantha': 'Samantha',
  'Alex': 'Alex',
  'Daniel': 'Daniel',
  'Google US': 'Google US English',
  'Microsoft David': 'Microsoft David',
};

// Get the voice match string from display name
export function getVoiceMatchString(displayName: string): string {
  return CURATED_VOICES[displayName] || displayName;
}

interface VoiceContextType {
  selectedVoiceName: string | null;  // null = "Auto" mode
  setSelectedVoiceName: (name: string | null) => void;
  availableVoices: string[];  // Curated voices that exist on this system
  currentVoiceName: string;   // Resolved display name ("Auto" or voice name)
}

const VoiceContext = createContext<VoiceContextType | null>(null);

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [selectedVoiceName, setSelectedVoiceNameState] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

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
    };

    // Load immediately
    loadVoices();

    // Chrome requires this event listener
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Load saved voice from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const saved = localStorage.getItem('djclaude-voice');
    if (saved) {
      setSelectedVoiceNameState(saved);
    }
    setIsLoaded(true);
  }, []);

  // Persist voice selection to localStorage
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
      selectedVoiceName,
      setSelectedVoiceName,
      availableVoices,
      currentVoiceName,
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
