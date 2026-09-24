import React from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Badge — SoloSaathi Circle
 *
 * Micro-tag badge with translucent background and tint-matched border.
 * Used for status, skill levels, and feature chips.
 */
export function Badge({
  children,
  color: colorProp = null,
  bg = null,
  icon = null,
  size = 'md',
  style = {},
  className = '',
  ...props
}) {
  const theme = useTheme();
  // Resolved here, not as a default parameter: defaults run before useTheme() is available
  const color = colorProp || theme.colors.amber;
  const isSmall = size === 'sm';

  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: isSmall ? '2px 7px' : '3px 10px',
    borderRadius: theme.radii.pill,
    fontSize: isSmall ? '10px' : '11px',
    fontWeight: theme.fontWeights.bold,
    fontFamily: theme.fonts.body,
    background: bg || `${color}22`,
    color: color,
    border: `0.5px solid ${color}66`,
    lineHeight: 1.3,
    letterSpacing: '0.2px',
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
    ...style,
  };

  return (
    <span style={badgeStyle} className={className} {...props}>
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

export default Badge;
