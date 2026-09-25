import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
import CircleToolsModal from '../components/circle/CircleToolsModal';
import OtpVerificationModal from './OtpVerificationModal';
import { apiPost, getRequest, hasAttendeeSession } from '../api/apiClient';
import { useAppContext } from '../context/AppContext';
import { useDeviceType } from '../hooks/useDeviceType';

// Venue SOS contact (WhatsApp number with country code, e.g. 919876543210); the button is hidden if unset
const SOS_WHATSAPP = import.meta.env.VITE_SOS_WHATSAPP || '';

/**
 * CircleActivePage — the attendee's circle for tonight.
 *
 * Loads the circle named in the URL through get-circle (members only, with the attendee session),
 * so it works after a reload and from Find My Circle. The last circle opened is also kept in
 * AppContext (localStorage) and shown while it refreshes. A circle that was merged redirects
 * to the circle the attendee is in now.
 */
export function CircleActivePage() {
  const theme = useTheme();
  const { circleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, activeCircle, setActiveCircle } = useAppContext();
  const { isMobile } = useDeviceType();

  const cached = activeCircle && activeCircle.circleId === circleId ? activeCircle : null;

  const [circle, setCircle] = useState(cached);
  const [registrationId, setRegistrationId] = useState(
    location.state?.registrationId || (user?.circleId === circleId ? user?.registrationId : null) || null
  );
  const [loadState, setLoadState] = useState(cached ? 'ready' : 'loading'); // loading | ready | needsVerify | notFound
  const [mergedNotice, setMergedNotice] = useState(null);
  const [showVerify, setShowVerify] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [showBeacon, setShowBeacon] = useState(false);
  const [showSwitch, setShowSwitch] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load (or refresh) the circle from the server
  useEffect(() => {
    let cancelled = false;
    const cachedNow = activeCircle && activeCircle.circleId === circleId ? activeCircle : null;
    if (cachedNow) {
      setCircle(cachedNow);
      setLoadState('ready');
    }
    if (!hasAttendeeSession()) {
      if (!cachedNow) setLoadState('needsVerify');
      return undefined;
    }
    if (!cachedNow) setLoadState('loading');

    getRequest('get-circle', { circleId }, { sessionPhone: user?.whatsapp })
      .then((data) => {
        if (cancelled) return;
        setCircle(data.circle);
        setRegistrationId(data.registrationId);
        setActiveCircle(data.circle);
        setLoadState('ready');
        if (data.redirectedFrom) {
          setMergedNotice(
            `Your circle was merged into ${data.circle.name} so everyone dances in a fuller group.`
          );
          navigate(`/circle/${data.circle.circleId}`, { replace: true, state: location.state });
        }
      })
      .catch((err) => {
        if (cancelled || cachedNow) return;
        setLoadState(err.details?.sessionRequired ? 'needsVerify' : 'notFound');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleId, reloadKey]);

  const updateCircle = (next) => {
    setCircle(next);
    setActiveCircle(next);
  };

  const pagePadding = isMobile ? '32px 4vw 40px' : '48px 4vw 60px';

  if (loadState === 'loading') {
    return (
      <div style={{ width: '100%', maxWidth: theme.maxWidths.phone, margin: '0 auto', padding: pagePadding, textAlign: 'center' }}>
        <LoadingSpinner label="Loading your circle..." />
      </div>
    );
  }

  const hasValidCircle = loadState === 'ready' && circle && Array.isArray(circle.members) && circle.meetingPoint;

  if (!hasValidCircle) {
    const needsVerify = loadState === 'needsVerify';
    return (
      <div
        style={{
          width: '100%',
          maxWidth: theme.maxWidths.phone,
          margin: '0 auto',
          padding: pagePadding,
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
            {needsVerify ? 'Verify It’s You' : 'No Active Circle Found'}
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
            {needsVerify
              ? 'Confirm your WhatsApp number with a one-time code to open your circle on this device.'
              : "We couldn't find this circle for your number. If you recently registered, please ensure your registration and payment completed successfully."}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '280px', margin: '0 auto' }}>
            {needsVerify ? (
              <PrimaryButton onClick={() => setShowVerify(true)} style={{ padding: '12px 20px' }}>
                Verify with OTP
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={() => navigate('/register')} style={{ padding: '12px 20px' }}>
                Register for a Circle
              </PrimaryButton>
            )}
            <GhostButton onClick={() => navigate('/find-circle')} style={{ padding: '11px 20px' }}>
              Find My Active Pass
            </GhostButton>
          </div>
        </SectionCard>

        <OtpVerificationModal
          isOpen={showVerify}
          initialPhone={user?.whatsapp || ''}
          onClose={() => setShowVerify(false)}
          onVerified={() => {
            setShowVerify(false);
            setReloadKey((k) => k + 1);
          }}
        />
      </div>
    );
  }

  const matchedLevel = theme.levels.find((l) => l.id === circle.skillLevel) || theme.levels[1];

  // Record physical gate check-in (the server uses the registration's own venue and night)
  const handleCheckIn = async () => {
    if (checkedIn || !registrationId) return;
    setCheckInLoading(true);
    setError(null);

    try {
      await apiPost('/circle-actions', {
        action: 'showup',
        gate: 'Gate 3',
        registrationId,
        circleId: circle.circleId,
      });
      setCheckedIn(true);
    } catch (err) {
      setError(err.message || 'Check-in failed. Please try again.');
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

      {showTools && (
        <CircleToolsModal
          circle={circle}
          registrationId={registrationId}
          onClose={() => setShowTools(false)}
          onCircleUpdate={updateCircle}
          onLeft={() => {
            setShowTools(false);
            setActiveCircle(null);
            navigate('/find-circle', { replace: true });
          }}
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

      {mergedNotice && (
        <div
          role="status"
          style={{
            marginBottom: '16px',
            padding: '10px 14px',
            borderRadius: '10px',
            background: theme.colors.surfaceElevated,
            border: `1px solid ${theme.colors.borderLight}`,
            fontSize: '12.5px',
            color: theme.colors.textPrimary,
            lineHeight: 1.5,
          }}
        >
          🔀 {mergedNotice}
        </div>
      )}

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
            <div style={{ fontSize: '11px', fontWeight: 700, color: theme.colors.amberText, textTransform: 'uppercase' }}>
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
              <div style={{ fontSize: '11.5px', color: matchedLevel.textColor }}>
                Turn your screen into a pulsing {matchedLevel.label} beacon
              </div>
            </div>
          </div>
          <span style={{ fontSize: '20px', color: theme.colors.amberText }}>→</span>
        </button>
      </div>

      {/* Circle tools & check-in */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: SOS_WHATSAPP ? '10px' : '20px' }}>
        <PrimaryButton
          onClick={() => setShowTools(true)}
          disabled={!registrationId}
          style={{ padding: '12px', fontSize: '14px' }}
          icon={<span>⚙️</span>}
        >
          Circle Tools
        </PrimaryButton>

        <GhostButton
          onClick={handleCheckIn}
          disabled={checkedIn || checkInLoading || !registrationId}
          style={{
            padding: '12px',
            fontSize: '13px',
            borderColor: checkedIn ? theme.colors.liveGreen : theme.borders.default,
            color: checkedIn ? theme.colors.liveGreenText : theme.colors.textPrimary,
          }}
        >
          {checkInLoading ? <LoadingSpinner size={16} /> : checkedIn ? '✓ At Ground' : '📍 Check In'}
        </GhostButton>
      </div>

      {SOS_WHATSAPP && (
        <a
          href={`https://wa.me/${SOS_WHATSAPP}?text=${encodeURIComponent(
            `SOS: I need help at ${circle.venue || 'the venue'} (${circle.name}).`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            minHeight: '44px',
            marginBottom: '20px',
            borderRadius: '12px',
            border: `1px solid ${theme.colors.borderDanger}`,
            background: theme.colors.surfaceElevated,
            color: theme.colors.textDanger,
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          🚨 Venue SOS Assistance
        </a>
      )}

      {/* Circle Captain Info Card */}
      <SectionCard style={{ marginBottom: '16px', background: theme.colors.surfaceElevated, borderColor: `${theme.colors.gold}55` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '28px' }}>👑</div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: theme.colors.amberText, textTransform: 'uppercase' }}>
              Circle Captain
            </div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: theme.colors.textPrimary }}>
              {circle.captainName || 'Circle Captain'}
              {circle.captainId && circle.captainId === registrationId ? ' (you)' : ''}
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
          currentUserId={registrationId}
          maxCapacity={circle.maxSpots || 24}
          level={circle.skillLevel}
        />
      </SectionCard>

      {/* Switch Circle Action Drawer */}
      {showSwitch ? (
        <SwitchCircleControl
          circleId={circle.circleId}
          registrationId={registrationId}
          currentLevel={circle.skillLevel}
          onClose={() => setShowSwitch(false)}
          onSwitchSuccess={(res) => {
            setShowSwitch(false);
            if (res.newCircle) {
              updateCircle(res.newCircle);
              navigate(`/circle/${res.newCircle.circleId}`, { replace: true, state: { registrationId } });
            }
          }}
        />
      ) : (
        <div style={{ textAlign: 'center' }}>
          <GhostButton
            onClick={() => setShowSwitch(true)}
            disabled={!registrationId}
            style={{ fontSize: '12px', minHeight: '40px', color: theme.colors.textMuted }}
          >
            🔄 Need a different rhythm? Switch Circle
          </GhostButton>
        </div>
      )}
    </div>
  );
}

export default CircleActivePage;
