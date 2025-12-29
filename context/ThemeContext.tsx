'use client';

import { createContext, useContext, ReactNode } from 'react';

// Theme color definitions
export interface ThemeColors {
  name: string;
  background: string;
  backgroundAlt: string;
  text: string;
  textMuted: string;
  textDim: string;
  accent: string;
  border: string;
  character: string;
}

// Fairlight CMI green phosphor CRT palette
export const fairlightTheme: ThemeColors = {
  name: 'Fairlight',
  background: '#0a0f0a',      // Dark green-tinted black (CRT off-black)
  backgroundAlt: '#0d140d',   // Slightly lighter for panels
  text: '#33ff33',            // Classic P31 phosphor green
  textMuted: '#22aa22',       // Medium phosphor green
  textDim: '#116611',         // Dim phosphor green (afterglow)
  accent: '#66ff66',          // Bright highlight green (bloom)
  border: '#22aa22',          // Border color matching muted
  character: '#33ff33',       // Dancing Claude in phosphor green
};

interface ThemeContextType {
  theme: ThemeColors;
  themeName: string;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme: fairlightTheme, themeName: fairlightTheme.name }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
