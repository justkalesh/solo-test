import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { lightTheme, darkTheme } from '../styles/theme';

/**
 * ThemeContext — SoloSaathi Circle Dark/Light Theme Manager
 *
 * Provides:
 * - Active theme object via useTheme()
 * - Theme mode ('light' | 'dark') and toggle via useThemeMode()
 * - Persists preference to localStorage
 * - Updates document theme-color meta tag
 */

const ThemeContext = createContext(null);

const STORAGE_KEY = 'solosaathi_theme';

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'light';
    } catch {
      return 'light';
    }
  });

  const theme = mode === 'dark' ? darkTheme : lightTheme;

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}
      return next;
    });
  }, []);

  // Update the meta theme-color tag when mode changes
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme.colors.surfaceDark);
    }
  }, [mode, theme]);

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * useTheme — returns the active theme object
 * Drop-in replacement for `import theme from '../styles/theme'`
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback for components rendered outside ThemeProvider (shouldn't happen)
    return lightTheme;
  }
  return ctx.theme;
}

/**
 * useThemeMode — returns { mode, toggleTheme }
 * Used by toggle buttons and theme-aware logic
 */
export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { mode: 'light', toggleTheme: () => {} };
  }
  return { mode: ctx.mode, toggleTheme: ctx.toggleTheme };
}

export default ThemeContext;
