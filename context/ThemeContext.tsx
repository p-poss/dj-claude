'use client';

import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';

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
  background: '#0a0f0a',
  backgroundAlt: '#0d140d',
  text: '#33ff33',
  textMuted: '#22aa22',
  textDim: '#116611',
  accent: '#22aa22',
  border: '#22aa22',
  character: '#33ff33',
};

// Amber phosphor CRT palette
export const amberTheme: ThemeColors = {
  name: 'Amber',
  background: '#0f0a05',
  backgroundAlt: '#140d08',
  text: '#ffaa33',
  textMuted: '#aa7722',
  textDim: '#664411',
  accent: '#aa7722',
  border: '#aa7722',
  character: '#ffaa33',
};

// Blue phosphor CRT palette
export const blueTheme: ThemeColors = {
  name: 'Blue',
  background: '#050a0f',
  backgroundAlt: '#080d14',
  text: '#33aaff',
  textMuted: '#2277aa',
  textDim: '#114466',
  accent: '#2277aa',
  border: '#2277aa',
  character: '#33aaff',
};

// Modern terminal palette
export const terminalTheme: ThemeColors = {
  name: 'Terminal',
  background: '#0a0a0a',
  backgroundAlt: '#141414',
  text: '#e0e0e0',
  textMuted: '#a0a0a0',
  textDim: '#606060',
  accent: '#a0a0a0',
  border: '#a0a0a0',
  character: '#e0e0e0',
};

// Anthropic brand palette
export const anthropicTheme: ThemeColors = {
  name: 'Anthropic',
  background: '#0a0808',
  backgroundAlt: '#140f0d',
  text: '#d97757',
  textMuted: '#a85a42',
  textDim: '#6b3a2a',
  accent: '#a85a42',
  border: '#a85a42',
  character: '#d97757',
};

// All themes in cycle order
export const themes: ThemeColors[] = [
  fairlightTheme,
  amberTheme,
  blueTheme,
  terminalTheme,
  anthropicTheme,
];

interface ThemeContextType {
  theme: ThemeColors;
  themeName: string;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeIndex, setThemeIndex] = useState(3); // Default to Terminal (black/white) theme
  const theme = themes[themeIndex];

  const cycleTheme = useCallback(() => {
    setThemeIndex((prev) => (prev + 1) % themes.length);
  }, []);

  // Update CSS custom properties when theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-background', theme.background);
    root.style.setProperty('--theme-text', theme.text);
    root.style.setProperty('--theme-text-muted', theme.textMuted);
    root.style.setProperty('--theme-text-dim', theme.textDim);
    root.style.setProperty('--theme-border', theme.border);
  }, [theme]);

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
