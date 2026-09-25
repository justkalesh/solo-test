import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import SectionCard from '../common/SectionCard';
import PrimaryButton from '../common/PrimaryButton';
import GhostButton from '../common/GhostButton';
import ErrorBanner from '../common/ErrorBanner';
import Portal from '../common/Portal';
import { postRequest } from '../../api/apiClient';
import { useDeviceType } from '../../hooks/useDeviceType';

/**
 * CircleToolsModal — SoloSaathi Circle
 *
 * Circle management tools, opened from the circle page:
 * - Captain only: grow (1–20 spots, unlocks), lock to new members, transfer the captain role.
 * - Everyone: leave the circle.
 * The backend (circle-actions) checks the attendee session and the captain role again.
 *
 * @param {Object} props
 * @param {Object} props.circle - Circle summary (members, captainId, isLocked, maxSpots).
 * @param {string} props.registrationId - The viewer's registration.
 * @param {Function} props.onClose
 * @param {Function} props.onCircleUpdate - Receives the updated circle after grow / lock / transfer.
 * @param {Function} props.onLeft - Called after leaving the circle.
 */
export function CircleToolsModal({ circle, registrationId, onClose, onCircleUpdate, onLeft }) {
  const theme = useTheme();
  const { isMobile } = useDeviceType();
  const [view, setView] = useState('menu'); // 'menu' | 'grow' | 'transfer'
  const [growSpots, setGrowSpots] = useState(5);
  const [newCaptainId, setNewCaptainId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const isCaptain = Boolean(circle?.captainId && circle.captainId === registrationId);
  const otherMembers = (circle?.members || []).filter((m) => m.registrationId !== registrationId);

  const runAction = async (action, payload = {}) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await postRequest('circle-actions', {
        action,
        circleId: circle.circleId,
        registrationId,
        ...payload,
      });

      if (action === 'leave') {
        onLeft?.(res);
        return;
      }
      if (action === 'grow') {
        onCircleUpdate?.({ ...circle, isLocked: false, maxSpots: res.maxSpots });
      } else if (action === 'lock') {
        onCircleUpdate?.({ ...circle, isLocked: true });
      } else if (action === 'transferCaptain') {
        onCircleUpdate?.({
          ...circle,
          captainId: res.newCaptainId,
          captainName: res.newCaptainName,
          isCaptain: false,
          members: (circle.members || []).map((m) => ({ ...m, isCaptain: m.registrationId === res.newCaptainId })),
        });
      }
      setSuccess(res.message || 'Done.');
      setView('menu');
    } catch (err) {
      setError(err.message || 'Action failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const rowButton = { width: '100%', textAlign: 'left', padding: '10px', minHeight: '44px' };

  return (
    <Portal>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="circle-tools-title"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}
      >
        <SectionCard
          style={{
            maxWidth: '440px',
            width: '100%',
            padding: isMobile ? '20px' : '24px',
            maxHeight: 'calc(100dvh - 40px)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 id="circle-tools-title" style={{ margin: 0, color: theme.colors.textPrimary, fontSize: '17px' }}>
              {view === 'grow' ? 'Grow Circle' : view === 'transfer' ? 'Transfer Captain Role' : 'Circle Tools'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close circle tools"
              style={{
                background: 'none',
                border: 'none',
                color: theme.colors.textMuted,
                fontSize: '18px',
                cursor: 'pointer',
                padding: '8px 10px',
                margin: '-8px -10px -8px 0',
              }}
            >
              ✕
            </button>
          </div>

          {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
          {success && (
            <div
              role="status"
              style={{
                background: theme.colors.surfaceElevated,
                border: `1px solid ${theme.colors.liveGreen}`,
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                color: theme.colors.textPrimary,
                textAlign: 'center',
              }}
            >
              ✓ {success}
            </div>
          )}

          {view === 'menu' && (
            <>
              {isCaptain ? (
                <>
                  <div
                    style={{
                      background: theme.colors.surfaceElevated,
                      border: `1px solid ${theme.colors.gold}`,
                      borderRadius: '8px',
                      padding: '10px 12px',
                      fontSize: '12px',
                      color: theme.colors.textPrimary,
                    }}
                  >
                    👑 <strong>Captain controls</strong>: you lead this circle.
                    {circle.isLocked ? ' It is locked to new members.' : ''}
                  </div>
                  <GhostButton id="btn-action-grow" onClick={() => setView('grow')} style={rowButton}>
                    🌱 Expand Circle (+Spots & Unlock)
                  </GhostButton>
                  <GhostButton
                    id="btn-action-lock"
                    onClick={() => runAction('lock')}
                    disabled={loading || circle.isLocked}
                    style={rowButton}
                  >
                    🔒 {circle.isLocked ? 'Circle is locked' : 'Lock Circle (Prevent new walk-ins)'}
                  </GhostButton>
                  <GhostButton id="btn-action-transfer" onClick={() => setView('transfer')} style={rowButton}>
                    👑 Transfer Captain Role
                  </GhostButton>
                </>
              ) : (
                <p style={{ fontSize: '12px', color: theme.colors.textMuted, margin: 0, lineHeight: 1.5 }}>
                  Your captain, {circle.captainName || 'the circle captain'}, can grow or lock the circle.
                </p>
              )}

              <GhostButton
                id="btn-action-leave-circle"
                onClick={() => {
                  if (window.confirm('Are you sure you want to leave this circle?')) {
                    runAction('leave');
                  }
                }}
                disabled={loading}
                style={{ ...rowButton, color: theme.colors.textDanger }}
              >
                🚪 Leave Circle
              </GhostButton>
            </>
          )}

          {view === 'grow' && (
            <>
              <p style={{ fontSize: '12px', color: theme.colors.textMuted, margin: 0 }}>
                Add between 1 and 20 spots to your circle. This also unlocks it to new solo dancers.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  id="input-grow-spots"
                  type="number"
                  min="1"
                  max="20"
                  value={growSpots}
                  onChange={(e) => setGrowSpots(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))}
                  style={{
                    width: '80px',
                    background: theme.colors.surfaceElevated,
                    border: `1px solid ${theme.colors.borderLight}`,
                    borderRadius: '8px',
                    padding: '8px',
                    color: theme.colors.textPrimary,
                    textAlign: 'center',
                  }}
                />
                <span style={{ fontSize: '13px', color: theme.colors.textMuted }}>additional spots</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <GhostButton onClick={() => setView('menu')}>Back</GhostButton>
                <PrimaryButton
                  id="btn-confirm-grow"
                  loading={loading}
                  disabled={loading}
                  fullWidth={false}
                  onClick={() => runAction('grow', { spots: growSpots })}
                >
                  Expand Circle
                </PrimaryButton>
              </div>
            </>
          )}

          {view === 'transfer' && (
            <>
              <p style={{ fontSize: '12px', color: theme.colors.textMuted, margin: 0 }}>
                Choose who takes over as captain:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {otherMembers.map((m) => (
                  <label
                    key={m.registrationId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      minHeight: '44px',
                      padding: '8px 12px',
                      background: theme.colors.surfaceElevated,
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="captainChoice"
                      value={m.registrationId}
                      checked={newCaptainId === m.registrationId}
                      onChange={() => setNewCaptainId(m.registrationId)}
                      style={{ width: '18px', height: '18px', flexShrink: 0, accentColor: theme.colors.gold }}
                    />
                    <span style={{ fontSize: '13px', color: theme.colors.textPrimary, minWidth: 0 }}>
                      {m.name}
                      {m.skillLevel && (
                        <span style={{ color: theme.colors.textMuted }}> ({m.skillLevel})</span>
                      )}
                    </span>
                  </label>
                ))}
                {otherMembers.length === 0 && (
                  <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
                    No other members in the circle yet.
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <GhostButton onClick={() => setView('menu')}>Back</GhostButton>
                <PrimaryButton
                  id="btn-confirm-transfer"
                  disabled={!newCaptainId || loading}
                  loading={loading}
                  fullWidth={false}
                  onClick={() => runAction('transferCaptain', { newCaptainId })}
                >
                  Transfer Leadership
                </PrimaryButton>
              </div>
            </>
          )}
        </SectionCard>
      </div>
    </Portal>
  );
}

export default CircleToolsModal;
