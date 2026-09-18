import React, { useState } from 'react';
import theme from '../../styles/theme';

/**
 * BeaconPulse — SoloSaathi Circle
 *
 * Full-screen light beacon designed to help matched attendees spot each other
 * in noisy, packed festival grounds at night.
 *
 * Performance Architecture:
 * - 100% CSS animation driven via `@keyframes beaconPulse`
 * - Battery-conscious: zero JS `setInterval` renders
 * - Hardware accelerated (`opacity`, `transform`)
 */
export function BeaconPulse({
  level = 'intermediate',
  circleName = 'Solo Circle',
  anchorPoint = 'Anchor Landmark',
  onClose,
}) {
  const [isFast, setIsFast] = useState(false);

  // Match skill level color
  const matchedLevel = theme.levels.find((l) => l.id === level) || theme.levels[1];
  const pulseColor = matchedLevel.color;
  const cycleSeconds = isFast ? '0.6s' : '2.2s';

  return (
    <div
      role="dialog"
      aria-label="Circle Beacon Spotting Light"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        backgroundColor: pulseColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '40px 20px',
        boxSizing: 'border-box',
        animation: `beaconPulse ${cycleSeconds} ease-in-out infinite`,
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Top Circle Details */}
      <div
        style={{
          background: 'rgba(27, 23, 48, 0.75)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '12px 24px',
          textAlign: 'center',
          color: theme.colors.textPrimary,
          border: '0.5px solid rgba(255,255,255,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
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
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          color: '#1B1730',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '64px', filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.3))' }}>
          🪩
        </div>
        <div
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: '22px',
            fontWeight: 700,
            textShadow: '0 1px 4px rgba(255,255,255,0.6)',
          }}
        >
          Hold Phone Up High!
        </div>
        <p style={{ fontSize: '13px', fontWeight: 600, maxWidth: '280px', margin: 0 }}>
          Your circle members are looking for this {matchedLevel.label} glow.
        </p>
      </div>

      {/* Bottom Controls */}
      <div
        style={{
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
            background: 'rgba(255, 255, 255, 0.85)',
            color: '#1B1730',
            fontFamily: theme.fonts.body,
            fontWeight: 700,
            fontSize: '13px',
            padding: '10px 22px',
            borderRadius: '999px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            transition: 'transform 0.15s ease',
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
            color: theme.colors.textPrimary,
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
  );
}

export default BeaconPulse;
