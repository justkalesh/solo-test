import React, { useState } from 'react';
import theme from '../../styles/theme';

/**
 * SectionCard — SoloSaathi Circle
 *
 * Glassmorphic container module featuring 160-degree diagonal gradient,
 * subtle border tint, and smooth depth shadow. Supports neutral or
 * level-tinted variations.
 */
export function SectionCard({
  children,
  level = null, // 'beginner' | 'intermediate' | 'advanced'
  hoverable = false,
  padding = 18,
  borderRadius = 18,
  style = {},
  className = '',
  onClick = null,
  ...props
}) {
  const [isHovered, setIsHovered] = useState(false);

  // Determine gradient background and border based on level
  let background = theme.gradients.cardNeutral;
  let border = theme.borders.default;
  let shadow = theme.shadows.card;

  if (level) {
    const matchedLevel = theme.levels.find((l) => l.id === level);
    if (matchedLevel) {
      background = matchedLevel.gradient;
      border = `0.5px solid ${matchedLevel.color}55`;
      shadow = `0 8px 24px -8px ${matchedLevel.color}44`;
    }
  }

  const cardStyle = {
    position: 'relative',
    zIndex: 1,
    background,
    borderRadius: `${borderRadius}px`,
    border,
    padding: typeof padding === 'number' ? `${padding}px` : padding,
    boxShadow: isHovered && hoverable ? theme.shadows.cardHover : shadow,
    transform: isHovered && hoverable ? 'translateY(-2px)' : 'none',
    transition: 'all 0.2s ease',
    cursor: onClick ? 'pointer' : 'default',
    boxSizing: 'border-box',
    ...style,
  };

  return (
    <div
      style={cardStyle}
      className={className}
      onClick={onClick}
      onMouseEnter={() => hoverable && setIsHovered(true)}
      onMouseLeave={() => hoverable && setIsHovered(false)}
      {...props}
    >
      {children}
    </div>
  );
}

export default SectionCard;
