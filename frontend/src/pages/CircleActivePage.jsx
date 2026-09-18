import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import theme from '../styles/theme';
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
  const { circleId } = useParams();
  const navigate = useNavigate();
  const { user, activeCircle, setActiveCircle } = useAppContext();
  const { isMobile } = useDeviceType();

  const [showBeacon, setShowBeacon] = useState(false);
  const [showSwitch, setShowSwitch] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mock initial circle state if not passed in context
  const [circle, setCircle] = useState(
    activeCircle || {
      circleId: circleId || 'circle_live_01',
      name: 'TAAL TOLI 1',
      skillLevel: 'intermediate',
      city: 'Ahmedabad',
      venue: 'United Way Garba Grounds',
      meetingPoint: 'Near Gate 3 Food Court / Ice Cream Stall',
      captainId: 'reg_mock_captain',
      captainName: 'Aarav Mehta',
      members: [
        { registrationId: 'reg_mock_captain', name: 'Aarav Mehta', gender: 'male', isCaptain: true },
        { registrationId: user?.registrationId || 'reg_user', name: user?.name || 'You', gender: 'female', isCaptain: false },
        { registrationId: 'reg_3', name: 'Priya S.', gender: 'female', isCaptain: false },
        { registrationId: 'reg_4', name: 'Kavita K.', gender: 'female', isCaptain: false },
        { registrationId: 'reg_5', name: 'Rohan D.', gender: 'male', isCaptain: false },
        { registrationId: 'reg_6', name: 'Sneha R.', gender: 'female', isCaptain: false },
        { registrationId: 'reg_7', name: 'Vikram J.', gender: 'male', isCaptain: false },
        { registrationId: 'reg_8', name: 'Neha P.', gender: 'female', isCaptain: false },
        { registrationId: 'reg_9', name: 'Aman G.', gender: 'male', isCaptain: false },
        { registrationId: 'reg_10', name: 'Meera B.', gender: 'female', isCaptain: false },
        { registrationId: 'reg_11', name: 'Karan T.', gender: 'male', isCaptain: false },
        { registrationId: 'reg_12', name: 'Divya M.', gender: 'female', isCaptain: false },
      ],
      maxSpots: 16,
    }
  );

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
            background: `linear-gradient(135deg, ${matchedLevel.bg}, #1F1938)`,
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
              {circle.captainName || 'Aarav Mehta'}
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
