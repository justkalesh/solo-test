import React, { useState } from 'react';
import theme from '../../styles/theme';

/**
 * PrimaryButton — SoloSaathi Circle
 *
 * Dominant call-to-action button featuring the brand gold-to-magenta gradient,
 * Baloo 2 typography, and responsive hover/active micro-elevations.
 */
export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  fullWidth = true,
  icon = null,
  style = {},
  className = '',
  type = 'button',
  ...props
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: theme.fonts.heading,
    fontWeight: theme.fontWeights.bold,
    fontSize: '16px',
    lineHeight: 1.2,
    padding: '14px 26px',
    borderRadius: '14px',
    border: 'none',
    outline: 'none',
    background: disabled ? theme.colors.buttonDisabled : theme.gradients.primary,
    color: disabled ? theme.colors.textDisabled : theme.colors.textDark,
    cursor: disabled ? 'not-allowed' : 'pointer',
    width: fullWidth ? '100%' : 'auto',
    boxSizing: 'border-box',
    boxShadow: disabled
      ? 'none'
      : isHovered
      ? '0 8px 28px -4px #DB2777bb'
      : theme.shadows.primaryButton,
    transform: disabled
      ? 'none'
      : isActive
      ? 'translateY(1px) scale(0.99)'
      : isHovered
      ? 'translateY(-1.5px) scale(1.01)'
      : 'none',
    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
    letterSpacing: '0.3px',
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
        setIsActive(false);
      }}
      onMouseDown={() => !disabled && setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      {...props}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

export default PrimaryButton;
