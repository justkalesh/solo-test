import React from 'react';
import { lightTheme } from './theme';

/**
 * SoloSaathi Circle — Global CSS & Font Injection
 *
 * Injected once at the root of the application (App.jsx / main.jsx).
 * Enforces CSS resets, font smoothing, box-sizing, and GPU keyframes.
 * Accepts a theme parameter for dynamic dark/light mode support.
 */

export function buildGlobalCss(theme) {
  return `
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
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  /* Removes the double-tap zoom delay on touch controls */
  button, a, input, select, textarea, label {
    touch-action: manipulation;
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
    outline: 2px solid ${theme.colors.borderFocus};
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

  /* iOS Safari zooms the page when focusing a field under 16px — keep form text at 16px on phones.
     !important is required to win over the inline fontSize set on individual inputs. */
  @media (max-width: 767px) {
    input:not([type="checkbox"]):not([type="radio"]), select, textarea {
      font-size: 16px !important;
    }
  }

  /* Horizontal chip / pill rails: scroll without a visible scrollbar on touch devices */
  .scroll-rail {
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .scroll-rail::-webkit-scrollbar {
    display: none;
  }

  /* Scrollbar aesthetics */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: ${theme.colors.pageBgEnd};
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
}

// Pre-built CSS string for backward compat (uses light theme)
export const globalCssString = buildGlobalCss(lightTheme);

export function GlobalStyles({ theme }) {
  const css = theme ? buildGlobalCss(theme) : globalCssString;
  return React.createElement('style', null, css);
}

export default GlobalStyles;
