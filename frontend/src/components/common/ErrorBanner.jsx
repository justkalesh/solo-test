import React from 'react';
import theme from '../../styles/theme';

/**
 * ErrorBanner — SoloSaathi Circle
 *
 * Crimson/rose tinted notification card for API failure states,
 * network anomalies, and form validation errors.
 */
export function ErrorBanner({
  message,
  details = null,
  onDismiss = null,
  style = {},
  className = '',
}) {
  if (!message) return null;

  return (
    <div
      role="alert"
      style={{
        position: 'relative',
        background: 'linear-gradient(160deg, #2E1420, #1F1938)',
        border: theme.borders.advanced,
        borderRadius: '12px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        color: theme.colors.textPrimary,
        boxShadow: '0 4px 18px -6px #F43F5E44',
        ...style,
      }}
      className={className}
    >
      <span style={{ fontSize: '18px', lineHeight: 1 }}>⚠️</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: theme.fonts.body,
            fontWeight: theme.fontWeights.semibold,
            fontSize: '13px',
            color: '#FFA1B2',
            lineHeight: 1.4,
          }}
        >
          {message}
        </div>
        {details && (
          <div
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: '11px',
              color: theme.colors.textMuted,
              marginTop: '4px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {typeof details === 'object' ? JSON.stringify(details, null, 2) : String(details)}
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          style={{
            background: 'transparent',
            border: 'none',
            color: theme.colors.textMuted,
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: 1,
            padding: '2px 6px',
            borderRadius: '4px',
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default ErrorBanner;
