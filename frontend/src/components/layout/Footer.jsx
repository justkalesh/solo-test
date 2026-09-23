import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { DiyaSticker } from '../effects/FestiveStickers';

/**
 * Footer — SoloSaathi Circle
 *
 * Production credits honoring Kritz Vyonera AI Studio, brand tagline,
 * and festival community disclaimer.
 */
export function Footer() {
  const theme = useTheme();
  return (
    <footer
      style={{
        position: 'relative',
        zIndex: 1,
        borderTop: theme.borders.subtle,
        background: `linear-gradient(180deg, transparent 0%, ${theme.colors.pageBgEnd} 100%)`,
        padding: '36px 4vw 40px',
        textAlign: 'center',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: theme.maxWidths.phone,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        {/* Subtle decorative Diya */}
        <DiyaSticker size={32} opacity={0.8} />

        {/* Kritz Vyonera AI Studio Production Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: `${theme.colors.borderDefault}44`,
            border: `0.5px solid ${theme.colors.borderDefault}`,
            borderRadius: '10px',
            padding: '7px 16px',
          }}
        >
          <span style={{ fontSize: '13px' }}>✨</span>
          <span
            style={{
              fontFamily: theme.fonts.body,
              fontWeight: 600,
              fontSize: '12px',
              color: theme.colors.textPrimary,
              letterSpacing: '0.4px',
            }}
          >
            Kritz Vyonera AI Studio
          </span>
        </div>

        {/* Production Credit Statement */}
        <p
          style={{
            fontFamily: theme.fonts.body,
            fontSize: '11.5px',
            color: theme.colors.textSecondary,
            lineHeight: 1.6,
          }}
        >
          {theme.brand.name} is produced by <strong>Kritz Vyonera AI Private Limited</strong>.
          <br />
          Built for festival inclusivity, solo dancer safety, and vibrant Navratri energy.
        </p>

        {/* Brand Tagline in Gradient */}
        <div
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: '14px',
            fontWeight: 700,
            background: theme.gradients.goldPink,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.3px',
          }}
        >
          "You came to dance. Not to stand alone."
        </div>

        {/* Copyright & Date */}
        <div
          style={{
            fontSize: '10.5px',
            color: theme.colors.textPlaceholder,
            fontFamily: theme.fonts.mono,
            marginTop: '6px',
          }}
        >
          © {new Date().getFullYear()} Kritz Vyonera AI Pvt. Ltd. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default Footer;
