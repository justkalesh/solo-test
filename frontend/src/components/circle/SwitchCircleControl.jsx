import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import PrimaryButton from '../common/PrimaryButton';
import GhostButton from '../common/GhostButton';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorBanner from '../common/ErrorBanner';
import { apiPost } from '../../api/apiClient';

/**
 * SwitchCircleControl — SoloSaathi Circle
 *
 * Enables circle participants to change groups if dance tempo or vibe isn't fitting.
 * Enforces backend operational constraints:
 * - Max 3 switches per night (SWITCH_CIRCLE_MAX_PER_NIGHT = 3)
 * - 5-minute initial lock after joining (SWITCH_CIRCLE_LOCK_MINUTES = 5)
 * - 20-minute cooldown between switches (SWITCH_CIRCLE_COOLDOWN_MINUTES = 20)
 */
export function SwitchCircleControl({
  circleId,
  registrationId,
  currentLevel = 'intermediate',
  onSwitchSuccess,
  onClose,
}) {
  const theme = useTheme();
  const [targetLevel, setTargetLevel] = useState(currentLevel);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSwitch = async () => {
    if (targetLevel === currentLevel) {
      setError('Please select a different skill level to switch to.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiPost('/circle-actions', {
        action: 'switchCircle',
        circleId,
        registrationId,
        newSkillLevel: targetLevel,
      });

      if (onSwitchSuccess) {
        onSwitchSuccess(response);
      }
    } catch (err) {
      setError(err.message || 'Failed to switch circle. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: theme.gradients.cardNeutral,
        borderRadius: '16px',
        border: theme.borders.default,
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ fontFamily: theme.fonts.heading, fontSize: '16px', fontWeight: 700, margin: 0 }}>
          🔄 Switch Garba Circle
        </h4>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close switch panel"
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.colors.textMuted,
              cursor: 'pointer',
              minWidth: '40px',
              minHeight: '40px',
              margin: '-10px -12px -10px 0',
            }}
          >
            ✕
          </button>
        )}
      </div>

      <p style={{ fontSize: '12px', color: theme.colors.textMuted, lineHeight: 1.5, marginBottom: '16px' }}>
        Looking for a different dance tempo? You can switch circles up to 3 times per night (subject to a 20-minute cooldown).
      </p>

      {error && (
        <div style={{ marginBottom: '12px' }}>
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {/* Target Level Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        {theme.levels.map((lvl) => {
          const isSelected = targetLevel === lvl.id;
          const isCurrent = currentLevel === lvl.id;

          return (
            <button
              key={lvl.id}
              type="button"
              onClick={() => setTargetLevel(lvl.id)}
              aria-pressed={isSelected}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                width: '100%',
                minHeight: '44px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: isSelected ? `${lvl.color}22` : 'rgba(255,255,255,0.03)',
                border: isSelected ? `1px solid ${lvl.color}` : theme.borders.subtle,
                color: theme.colors.textPrimary,
                font: 'inherit',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <span aria-hidden="true">{lvl.icon}</span>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: theme.colors.textPrimary, whiteSpace: 'nowrap' }}>
                    {lvl.label}
                  </span>
                  {isCurrent && (
                    <span style={{ fontSize: '11px', color: lvl.textColor }}>Current</span>
                  )}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: lvl.textColor, fontWeight: 700, textAlign: 'right', minWidth: 0 }}>
                {lvl.tag}
              </span>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <PrimaryButton
          onClick={handleSwitch}
          disabled={loading || targetLevel === currentLevel}
          style={{ flex: 1, padding: '12px' }}
        >
          {loading ? <LoadingSpinner size={16} /> : 'Confirm Switch'}
        </PrimaryButton>
        {onClose && (
          <GhostButton onClick={onClose} style={{ padding: '12px' }}>
            Cancel
          </GhostButton>
        )}
      </div>
    </div>
  );
}

export default SwitchCircleControl;
