'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

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

// DJ-themed color palettes
export const themes: ThemeColors[] = [
  {
    name: 'Midnight',
    background: '#0a0a0a',
    backgroundAlt: '#1e1e1e',
    text: '#e5e5e5',
    textMuted: '#737373',
    textDim: '#525252',
    accent: '#d4a574',
    border: '#737373',
    character: '#737373',
  },
  {
    name: 'Neon',
    background: '#0d0d1a',
    backgroundAlt: '#1a1a2e',
    text: '#00ffff',
    textMuted: '#00b3b3',
    textDim: '#007777',
    accent: '#ff00ff',
    border: '#00ffff',
    character: '#00b3b3',
  },
  {
    name: 'Sunset',
    background: '#1a0a0a',
    backgroundAlt: '#2a1515',
    text: '#ffb366',
    textMuted: '#cc8040',
    textDim: '#8a5530',
    accent: '#ff6b9d',
    border: '#ffb366',
    character: '#cc8040',
  },
  {
    name: 'Ocean',
    background: '#0a1a1a',
    backgroundAlt: '#152525',
    text: '#66d9ef',
    textMuted: '#4a9ea8',
    textDim: '#356670',
    accent: '#a6e22e',
    border: '#66d9ef',
    character: '#4a9ea8',
  },
  {
    name: 'Forest',
    background: '#0a140a',
    backgroundAlt: '#152015',
    text: '#98c379',
    textMuted: '#6a9a50',
    textDim: '#4a6a38',
    accent: '#e5c07b',
    border: '#98c379',
    character: '#6a9a50',
  },
  {
    name: 'Retro',
    background: '#1a1500',
    backgroundAlt: '#2a2200',
    text: '#ffb000',
    textMuted: '#cc8c00',
    textDim: '#8a6000',
    accent: '#ff6600',
    border: '#ffb000',
    character: '#cc8c00',
  },
];

interface ThemeContextType {
  theme: ThemeColors;
  themeName: string;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = 'dj-claude-theme';
const DEFAULT_THEME_INDEX = 0; // Always start with Midnight

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeIndex, setThemeIndex] = useState(DEFAULT_THEME_INDEX);

  // Load saved theme on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const index = parseInt(saved, 10);
        if (!isNaN(index) && index >= 0 && index < themes.length) {
          setThemeIndex(index);
        }
      }
    }
  }, []);

  // Save theme when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(themeIndex));
    }
  }, [themeIndex]);

  // Cycle to a random different theme
  const cycleTheme = useCallback(() => {
    setThemeIndex((current) => {
      // Get all indices except current
      const otherIndices = themes.map((_, i) => i).filter((i) => i !== current);
      // Pick a random one
      const randomIndex = otherIndices[Math.floor(Math.random() * otherIndices.length)];
      return randomIndex;
    });
  }, []);

  const theme = themes[themeIndex];

  return (
    <ThemeContext.Provider value={{ theme, themeName: theme.name, cycleTheme }}>
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
