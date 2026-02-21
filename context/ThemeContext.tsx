'use client';

import { createContext, useContext, ReactNode, useState, useCallback } from 'react';

// Theme color definitions
export interface ThemeColors {
  name: string;
  background: string;
  text: string;
}

// Fairlight CMI green phosphor CRT palette
export const fairlightTheme: ThemeColors = {
  name: 'Fairlight',
  background: '#161B14',
  text: '#00FF99',
};

// Modern terminal palette
export const terminalTheme: ThemeColors = {
  name: 'Terminal',
  background: '#0a0a0a',
  text: '#a0a0a0',
};

// Anthropic brand palette
export const anthropicTheme: ThemeColors = {
  name: 'Anthropic',
  background: '#262624',
  text: '#E8704E',
};

// Gemini blue palette
export const geminiTheme: ThemeColors = {
  name: 'Gemini',
  background: '#131314',
  text: '#008BFF',
};

// All themes in cycle order
export const themes: ThemeColors[] = [
  fairlightTheme,
  terminalTheme,
  anthropicTheme,
  geminiTheme,
];

interface ThemeContextType {
  theme: ThemeColors;
  themeName: string;
  cycleTheme: () => void;
  isSwapped: boolean;
  toggleSwap: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeIndex, setThemeIndex] = useState(2); // Default to Anthropic theme
  const [isSwapped, setIsSwapped] = useState(false);
  const baseTheme = themes[themeIndex];

  const theme = baseTheme; // Colors handled by CSS filter invert on body

  const cycleTheme = useCallback(() => {
    setThemeIndex((prev) => (prev + 1) % themes.length);
  }, []);

  const toggleSwap = useCallback(() => {
    setIsSwapped((prev) => !prev);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, themeName: theme.name, cycleTheme, isSwapped, toggleSwap }}>
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
