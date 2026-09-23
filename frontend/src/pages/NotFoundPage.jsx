import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { PrimaryButton } from '../components/common/PrimaryButton';
import { GhostButton } from '../components/common/GhostButton';
import { useDeviceType } from '../hooks/useDeviceType';
import { Home, ArrowLeft, MapPin } from 'lucide-react';

/**
 * NotFoundPage — 404 Error Page
 *
 * Themed 404 page with festive personality.
 * Provides navigation back to home or venue finder.
 */
export default function NotFoundPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isMobile } = useDeviceType();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        textAlign: 'center',
        padding: isMobile ? '40px 6vw' : '60px 4vw',
        maxWidth: '520px',
        margin: '0 auto',
      }}
    >
      {/* Large 404 Number */}
      <div
        style={{
          fontFamily: theme.fonts.heading,
          fontSize: isMobile ? '96px' : '128px',
          fontWeight: 700,
          lineHeight: 1,
          background: theme.gradients.primary,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px',
          letterSpacing: '-2px',
        }}
      >
        404
      </div>

      {/* Subtitle */}
      <h1
        style={{
          fontFamily: theme.fonts.heading,
          fontSize: isMobile ? '22px' : '28px',
          fontWeight: 700,
          color: theme.colors.textPrimary,
          marginBottom: '12px',
        }}
      >
        Lost on the Dance Floor?
      </h1>

      <p
        style={{
          fontFamily: theme.fonts.body,
          fontSize: '14px',
          color: theme.colors.textMuted,
          lineHeight: 1.6,
          maxWidth: '400px',
          marginBottom: '32px',
        }}
      >
        This page doesn't exist — but your perfect Garba circle does.
        Let's get you back to the festival.
      </p>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '12px',
          width: '100%',
          maxWidth: '340px',
        }}
      >
        <PrimaryButton
          onClick={() => navigate('/')}
          style={{
            flex: 1,
            padding: '13px 20px',
            fontSize: '14px',
          }}
          icon={<Home size={16} color="#14101F" />}
        >
          Back to Home
        </PrimaryButton>

        <GhostButton
          onClick={() => navigate(-1)}
          style={{
            flex: 1,
            padding: '13px 20px',
            fontSize: '14px',
          }}
          icon={<ArrowLeft size={16} />}
        >
          Go Back
        </GhostButton>
      </div>

      {/* Quick Links */}
      <div
        style={{
          marginTop: '32px',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {[
          { label: 'Find Circle', path: '/find-circle' },
          { label: 'Venues', path: '/venues' },
          { label: 'Register', path: '/register' },
        ].map((link) => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            style={{
              background: 'none',
              border: 'none',
              color: theme.colors.gold,
              fontSize: '13px',
              fontFamily: theme.fonts.body,
              fontWeight: 500,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              padding: '4px 0',
            }}
          >
            {link.label}
          </button>
        ))}
      </div>
    </div>
  );
}
