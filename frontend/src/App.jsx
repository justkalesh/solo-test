import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AppProvider } from './context/AppContext';
import { GlobalStyles } from './styles/globalStyles';

/**
 * App Root Component
 *
 * Provides:
 * 1. Global CSS reset & typography styles
 * 2. Shared application state context (AppProvider)
 * 3. Client-side navigation (RouterProvider)
 */
export function App() {
  return (
    <AppProvider>
      <GlobalStyles />
      <RouterProvider router={router} />
    </AppProvider>
  );
}

export default App;
