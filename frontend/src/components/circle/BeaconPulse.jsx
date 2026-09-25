import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Portal from '../common/Portal';

/**
 * BeaconPulse — SoloSaathi Circle
 *
 * Full-screen light beacon designed to help matched attendees spot each other
 * in noisy, packed festival grounds at night.
 *
 * Performance Architecture:
 * - 100% CSS animation driven via `@keyframes beaconPulse`
 * - Battery-conscious: zero JS `setInterval` renders
 * - Hardware accelerated (`opacity` only)
 *
 * Only the color layer pulses. It sits on an opaque black base, so the page underneath
 * never shows through, and the panels and buttons above it stay perfectly still.
 */
export function BeaconPulse({
  level = 'intermediate',
  circleName = 'Solo Circle',
  anchorPoint = 'Anchor Landmark',
  onClose,
}) {
  const theme = useTheme();
  const [isFast, setIsFast] = useState(false);

  // Match skill level color
  const matchedLevel = theme.levels.find((l) => l.id === level) || theme.levels[1];
  const pulseColor = matchedLevel.color;
  const cycleSeconds = isFast ? '0.6s' : '2.2s';

  const panelStyle = {
    position: 'relative',
    background: 'rgba(27, 23, 48, 0.75)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    textAlign: 'center',
    color: theme.colors.textOnDark,
    border: '0.5px solid rgba(255,255,255,0.2)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  };

  return (
    <Portal>
    <div
      role="dialog"
      aria-label="Circle Beacon Spotting Light"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        backgroundColor: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding:
          'max(40px, env(safe-area-inset-top)) 20px max(40px, env(safe-area-inset-bottom))',
        boxSizing: 'border-box',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Pulsing color layer (the only animated element) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: pulseColor,
          animation: `beaconPulse ${cycleSeconds} ease-in-out infinite`,
        }}
      />

      {/* Top Circle Details */}
      <div style={{ ...panelStyle, padding: '12px 24px' }}>
        <div style={{ fontFamily: theme.fonts.heading, fontSize: '20px', fontWeight: 700 }}>
          {circleName}
        </div>
        <div style={{ fontSize: '12px', color: theme.colors.amber, marginTop: '2px' }}>
          📍 {anchorPoint}
        </div>
      </div>

      {/* Center Beacon Motif / Prompt */}
      <div
        style={{
          ...panelStyle,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          padding: '16px 20px',
          maxWidth: '320px',
        }}
      >
        <div style={{ fontSize: '56px', lineHeight: 1 }}>🪩</div>
        <div
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: '22px',
            fontWeight: 700,
          }}
        >
          Hold Phone Up High!
        </div>
        <p style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: theme.colors.textOnDarkMuted }}>
          Your circle members are looking for this {matchedLevel.label} glow.
        </p>
      </div>

      {/* Bottom Controls */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          width: '100%',
          maxWidth: '300px',
        }}
      >
        {/* Speed Toggle */}
        <button
          type="button"
          onClick={() => setIsFast(!isFast)}
          style={{
            background: 'rgba(255, 255, 255, 0.92)',
            color: '#1B1730',
            fontFamily: theme.fonts.body,
            fontWeight: 700,
            fontSize: '13px',
            padding: '12px 22px',
            minHeight: '44px',
            borderRadius: '999px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
        >
          {isFast ? '⚡ Slower Pulse (2.2s)' : '⚡ Faster Pulse (0.6s)'}
        </button>

        {/* Back Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            background: '#1B1730',
            color: theme.colors.textOnDark,
            fontFamily: theme.fonts.body,
            fontWeight: 700,
            fontSize: '14px',
            padding: '13px 28px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
          }}
        >
          ← Back to Circle Room
        </button>
      </div>
    </div>
    </Portal>
  );
}

export default BeaconPulse;
