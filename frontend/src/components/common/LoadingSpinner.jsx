import React from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * LoadingSpinner — SoloSaathi Circle
 *
 * Dual-tone glowing spinner utilizing brand gold and magenta colors,
 * with optional status label.
 */
export function LoadingSpinner({
  size = 32,
  color = null,
  label = null,
  style = {},
  className = '',
}) {
  const theme = useTheme();
  const resolvedColor = color || theme.colors.amber;
  const spinnerSize = typeof size === 'number' ? size : 32;

  return (
    <div
      role="status"
      aria-label={label || 'Loading...'}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        ...style,
      }}
      className={className}
    >
      <div
        style={{
          width: spinnerSize,
          height: spinnerSize,
          borderRadius: '50%',
          border: `2.5px solid ${theme.colors.borderSubtle}`,
          borderTopColor: resolvedColor,
          borderRightColor: theme.colors.pink,
          animation: 'spin 0.8s linear infinite',
          boxSizing: 'border-box',
        }}
      />
      {label && (
        <span
          style={{
            fontFamily: theme.fonts.body,
            fontSize: '12px',
            color: theme.colors.textMuted,
            letterSpacing: '0.3px',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

export default LoadingSpinner;
