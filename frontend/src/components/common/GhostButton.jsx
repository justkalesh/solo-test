import React, { useState } from 'react';
import theme from '../../styles/theme';

/**
 * GhostButton — SoloSaathi Circle
 *
 * Secondary button with dark surface fill, crisp semi-transparent border,
 * Manrope typography, and smooth hover glow.
 */
export function GhostButton({
  children,
  onClick,
  disabled = false,
  fullWidth = false,
  icon = null,
  style = {},
  className = '',
  type = 'button',
  active = false,
  ...props
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontFamily: theme.fonts.body,
    fontWeight: theme.fontWeights.semibold,
    fontSize: '12.5px',
    padding: '8px 15px',
    borderRadius: '8px',
    border: active
      ? `0.5px solid ${theme.colors.amber}`
      : isHovered
      ? `0.5px solid ${theme.colors.amber}aa`
      : theme.borders.default,
    background: active
      ? '#2E2448'
      : isHovered
      ? '#2C224B'
      : theme.colors.surfaceElevated,
    color: active
      ? theme.colors.textPrimary
      : isHovered
      ? theme.colors.textPrimary
      : '#C9BFE0',
    cursor: disabled ? 'not-allowed' : 'pointer',
    width: fullWidth ? '100%' : 'auto',
    boxSizing: 'border-box',
    transform: disabled
      ? 'none'
      : isPressed
      ? 'scale(0.98)'
      : isHovered
      ? 'translateY(-1px)'
      : 'none',
    transition: 'all 0.16s ease',
    opacity: disabled ? 0.5 : 1,
    outline: 'none',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    ...style,
  };

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={baseStyle}
      className={className}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => !disabled && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      {...props}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

export default GhostButton;
