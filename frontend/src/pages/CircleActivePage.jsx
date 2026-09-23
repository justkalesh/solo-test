import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import PrimaryButton from '../components/common/PrimaryButton';
import GhostButton from '../components/common/GhostButton';
import SectionCard from '../components/common/SectionCard';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorBanner from '../components/common/ErrorBanner';
import BeaconPulse from '../components/circle/BeaconPulse';
import CircleMemberList from '../components/circle/CircleMemberList';
import SwitchCircleControl from '../components/circle/SwitchCircleControl';
import { apiPost } from '../api/apiClient';
import { useAppContext } from '../context/AppContext';
import { useDeviceType } from '../hooks/useDeviceType';

export function CircleActivePage() {
  const theme = useTheme();
  const { circleId } = useParams();
  const navigate = useNavigate();
  const { user, activeCircle, setActiveCircle } = useAppContext();
  const { isMobile } = useDeviceType();

  const [showBeacon, setShowBeacon] = useState(false);
  const [showSwitch, setShowSwitch] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [error, setError] = useState(null);

  const [circle, setCircle] = useState(activeCircle || null);

  useEffect(() => {
    if (activeCircle) {
      setCircle(activeCircle);
    }
  }, [activeCircle]);

  const hasValidCircle =
    circle &&
    Array.isArray(circle.members) &&
    circle.meetingPoint;

  if (!hasValidCircle) {
    return (
      <div
        style={{
          width: '100%',
          maxWidth: theme.maxWidths.phone,
          margin: '0 auto',
          padding: isMobile ? '32px 4vw 40px' : '48px 4vw 60px',
          boxSizing: 'border-box',
          textAlign: 'center',
        }}
      >
        <SectionCard style={{ padding: '36px 24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🪩</div>
          <h2
            style={{
              fontFamily: theme.fonts.heading,
              fontSize: '22px',
              fontWeight: 700,
              color: theme.colors.textPrimary,
              marginBottom: '8px',
            }}
          >
            No Active Circle Found
          </h2>
          <p
            style={{
              fontSize: '13.5px',
              color: theme.colors.textMuted,
              lineHeight: 1.6,
              maxWidth: '360px',
              margin: '0 auto 24px',
            }}
          >
            We couldn't find active circle details for this session. If you recently registered, please ensure your registration and payment completed successfully.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '280px', margin: '0 auto' }}>
            <PrimaryButton onClick={() => navigate('/register')} style={{ padding: '12px 20px' }}>
              Register for a Circle
            </PrimaryButton>
            <GhostButton onClick={() => navigate('/find-circle')} style={{ padding: '11px 20px' }}>
              Find My Active Pass
            </GhostButton>
          </div>
        </SectionCard>
      </div>
    );
  }

  const matchedLevel = theme.levels.find((l) => l.id === circle.skillLevel) || theme.levels[1];


  // Record physical gate check-in
  const handleCheckIn = async () => {
    if (checkedIn) return;
    setCheckInLoading(true);
    setError(null);

    try {
      await apiPost('/circle-actions', {
        action: 'showup',
        city: circle.city || 'Ahmedabad',
        venue: circle.venue || 'United Way Garba Grounds',
        gate: 'Gate 3',
        registrationId: user?.registrationId || 'reg_attendee',
        circleId: circle.circleId,
      });
      setCheckedIn(true);
    } catch (err) {
      // Non-blocking error
      setCheckedIn(true);
    } finally {
      setCheckInLoading(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: theme.maxWidths.phone,
        margin: '0 auto',
        padding: isMobile ? '16px 4vw 40px' : '28px 4vw 60px',
        boxSizing: 'border-box',
      }}
    >
      {/* Full-Screen Beacon Light Trigger */}
      {showBeacon && (
        <BeaconPulse
          level={circle.skillLevel}
          circleName={circle.name}
          anchorPoint={circle.meetingPoint}
          onClose={() => setShowBeacon(false)}
        />
      )}

      {/* Header Banner */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <Badge color={matchedLevel.color} icon={<span>🪩</span>} style={{ marginBottom: '8px' }}>
          Active Circle Tonight
        </Badge>
        <h1
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: '28px',
            fontWeight: 700,
            color: theme.colors.textPrimary,
            margin: '4px 0',
          }}
        >
          {circle.name}
        </h1>
        <p style={{ fontSize: '13px', color: theme.colors.textMuted }}>
          {circle.venue} • {matchedLevel.label} Rhythm
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: '16px' }}>
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {/* Anchor Landmark Card */}
      <SectionCard style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ fontSize: '24px' }}>📍</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: theme.colors.amber, textTransform: 'uppercase' }}>
              Designated Circle Anchor Point
            </div>
            <div style={{ fontFamily: theme.fonts.heading, fontSize: '17px', fontWeight: 700, color: theme.colors.textPrimary, marginTop: '2px' }}>
              {circle.meetingPoint}
            </div>
            <p style={{ fontSize: '12px', color: theme.colors.textMuted, margin: '6px 0 0', lineHeight: 1.4 }}>
              Meet your circle members here. Look for attendees holding up their {matchedLevel.label} glow beacon!
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Interactive Beacon Launcher Button */}
      <div style={{ marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => setShowBeacon(true)}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '16px',
            border: `1.5px solid ${matchedLevel.color}`,
            background: `linear-gradient(135deg, ${matchedLevel.bg}, ${theme.colors.cardBgEnd})`,
            boxShadow: `0 8px 30px -4px ${matchedLevel.color}55`,
            color: theme.colors.textPrimary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'transform 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>💡</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: theme.fonts.heading, fontWeight: 700, fontSize: '17px' }}>
                Open Beacon Light
              </div>
              <div style={{ fontSize: '11.5px', color: matchedLevel.color }}>
                Turn your screen into a pulsing {matchedLevel.label} beacon
              </div>
            </div>
          </div>
          <span style={{ fontSize: '20px', color: theme.colors.amber }}>→</span>
        </button>
      </div>

      {/* Primary Communication & Actions Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        <PrimaryButton
          onClick={() => navigate(`/circle/${circle.circleId}/chat`)}
          style={{ padding: '12px', fontSize: '14px' }}
          icon={<span>💬</span>}
        >
          Circle Chat
        </PrimaryButton>

        <GhostButton
          onClick={handleCheckIn}
          disabled={checkedIn || checkInLoading}
          style={{
            padding: '12px',
            fontSize: '13px',
            borderColor: checkedIn ? theme.colors.liveGreen : theme.borders.default,
            color: checkedIn ? theme.colors.liveGreen : theme.colors.textPrimary,
          }}
        >
          {checkInLoading ? <LoadingSpinner size={16} /> : checkedIn ? '✓ At Ground' : '📍 Check In'}
        </GhostButton>
      </div>

      {/* Circle Captain Info Card */}
      <SectionCard style={{ marginBottom: '16px', background: 'rgba(245, 179, 1, 0.08)', borderColor: `${theme.colors.gold}55` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '28px' }}>👑</div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: theme.colors.gold, textTransform: 'uppercase' }}>
              Circle Captain
            </div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: theme.colors.textPrimary }}>
              {circle.captainName || 'Circle Captain'}
            </div>
            <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
              Starting the rhythm and welcoming all solo dancers!
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Member Roster Card */}
      <SectionCard style={{ marginBottom: '20px' }}>
        <CircleMemberList
          members={circle.members}
          captainId={circle.captainId}
          currentUserId={user?.registrationId}
          maxCapacity={circle.maxSpots || 16}
          level={circle.skillLevel}
        />
      </SectionCard>

      {/* Switch Circle Action Drawer */}
      {showSwitch ? (
        <SwitchCircleControl
          circleId={circle.circleId}
          registrationId={user?.registrationId || 'reg_attendee'}
          currentLevel={circle.skillLevel}
          onClose={() => setShowSwitch(false)}
          onSwitchSuccess={(res) => {
            setShowSwitch(false);
            if (res.newCircle) {
              setCircle(res.newCircle);
              setActiveCircle(res.newCircle);
            }
          }}
        />
      ) : (
        <div style={{ textAlign: 'center' }}>
          <GhostButton
            onClick={() => setShowSwitch(true)}
            style={{ fontSize: '12px', color: theme.colors.textMuted }}
          >
            🔄 Need a different rhythm? Switch Circle
          </GhostButton>
        </div>
      )}
    </div>
  );
}

export default CircleActivePage;
