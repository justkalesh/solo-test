import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AppProvider } from './context/AppContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { GlobalStyles } from './styles/globalStyles';

/**
 * App Root Component
 *
 * Provides:
 * 1. Theme mode context (dark/light toggle, persisted)
 * 2. Global CSS reset & typography styles (theme-aware)
 * 3. Shared application state context (AppProvider)
 * 4. Client-side navigation (RouterProvider)
 */

function ThemedApp() {
  const theme = useTheme();
  return (
    <>
      <GlobalStyles theme={theme} />
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    </>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

export default App;
