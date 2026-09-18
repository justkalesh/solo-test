import React from 'react';
import theme from './theme';

/**
 * SoloSaathi Circle — Global CSS & Font Injection
 *
 * Injected once at the root of the application (App.jsx / main.jsx).
 * Enforces CSS resets, font smoothing, box-sizing, and GPU keyframes.
 */

export const globalCssString = `
  @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html, body {
    width: 100%;
    min-height: 100%;
    background-color: ${theme.colors.surfaceDark};
    background: ${theme.gradients.page};
    color: ${theme.colors.textPrimary};
    font-family: ${theme.fonts.body};
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    overflow-x: hidden;
    -webkit-tap-highlight-color: transparent;
  }

  #root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow-x: hidden;
  }

  /* Accessible focus rings */
  button:focus-visible, a:focus-visible, input:focus-visible {
    outline: 2px solid ${theme.colors.amber};
    outline-offset: 2px;
  }

  /* Form controls reset */
  input, button, select, textarea {
    font-family: inherit;
  }

  input::placeholder {
    color: ${theme.colors.textPlaceholder};
    opacity: 1;
  }

  /* Scrollbar aesthetics */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: ${theme.colors.surfaceDark};
  }
  ::-webkit-scrollbar-thumb {
    background: ${theme.colors.borderDefault};
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: ${theme.colors.amber};
  }

  /* Keyframe Animations (GPU Friendly: transform / opacity only) */
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes beaconPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.35; transform: scale(0.98); }
  }

  @keyframes floatGentle {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-6px); }
  }

  @keyframes shimmer {
    0% { opacity: 0.3; transform: scale(0.9); }
    50% { opacity: 0.8; transform: scale(1.1); }
    100% { opacity: 0.3; transform: scale(0.9); }
  }

  @keyframes sparklePulse {
    0%, 100% { opacity: 0.3; transform: scale(0.85); }
    50% { opacity: 0.9; transform: scale(1.2); }
  }
`;

export function GlobalStyles() {
  return React.createElement('style', null, globalCssString);
}

export default GlobalStyles;
