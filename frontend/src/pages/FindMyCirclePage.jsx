import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import SectionCard from '../components/common/SectionCard';
import PrimaryButton from '../components/common/PrimaryButton';
import GhostButton from '../components/common/GhostButton';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorBanner from '../components/common/ErrorBanner';
import { postRequest } from '../api/apiClient';

/**
 * Normalizes input string to 10 digits
 */
function normalizePhone(raw) {
  const digits = String(raw || '').trim().replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits;
}

export default function FindMyCirclePage() {
  const theme = useTheme();
  const [phone, setPhone] = useState(sessionStorage.getItem('user_mobile') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Auto-search if phone was already stored in session
  useEffect(() => {
    const saved = sessionStorage.getItem('user_mobile');
    if (saved && normalizePhone(saved).length === 10 && !hasSearched) {
      handleLookup(saved);
    }
  }, []);

  const handleLookup = async (phoneToUse) => {
    const cleanPhone = normalizePhone(phoneToUse || phone);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const data = await postRequest('find-my-circle', { whatsapp: cleanPhone });
      setResultData(data);
      sessionStorage.setItem('user_mobile', cleanPhone);
    } catch (err) {
      setError(err.message || 'Failed to find registrations for this mobile number.');
      setResultData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '620px',
        margin: '0 auto',
        padding: '20px 5vw 40px',
        minHeight: '80vh',
        overflowX: 'hidden',
      }}
    >
      {/* Title & Description */}
      <div style={{ textAlign: 'center', marginBottom: '24px', padding: '0 2vw' }}>
        <div style={{ fontSize: '36px', marginBottom: '8px' }}>📍</div>
        <h1
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: 'clamp(20px, 5vw, 24px)',
            color: theme.colors.textPrimary,
            marginBottom: '8px',
            wordBreak: 'break-word',
          }}
        >
          Find My Circle & Pass
        </h1>
        <p style={{ fontSize: '13px', color: theme.colors.textMuted, lineHeight: 1.5, maxWidth: '380px', margin: '0 auto' }}>
          Enter your registered WhatsApp number to retrieve your Navratri Circle, Beacon, and Digital Entry Pass.
        </p>
      </div>

      {/* Phone input search card */}
      <SectionCard style={{ padding: '16px', marginBottom: '20px' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLookup();
          }}
          style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}
        >
          <label style={{ fontSize: '12px', color: theme.colors.textSecondary, fontWeight: 500 }}>
            Registered Mobile Number
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${theme.colors.borderDefault}`,
                borderRadius: '8px',
                color: theme.colors.textMuted,
                fontSize: '13px',
                flexShrink: 0,
              }}
            >
              +91
            </div>
            <input
              id="input-find-circle-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="e.g. 9876543210"
              maxLength={10}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/\D/g, ''));
                if (error) setError(null);
              }}
              style={{
                flex: 1,
                minWidth: '0',
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${theme.colors.borderDefault}`,
                borderRadius: '8px',
                padding: '10px 14px',
                color: theme.colors.textPrimary,
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <PrimaryButton
            id="btn-find-circle-search"
            type="submit"
            loading={loading}
            style={{ padding: '12px 20px', fontSize: '14px', width: '100%' }}
          >
            Search
          </PrimaryButton>
        </form>
      </SectionCard>

      {/* Error state */}
      {error && <ErrorBanner message={error} style={{ marginBottom: '20px' }} />}

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <LoadingSpinner label="Searching circle records..." />
        </div>
      )}

      {/* Results list */}
      {!loading && hasSearched && resultData && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <span style={{ fontSize: '13px', color: theme.colors.textSecondary }}>
              Found {resultData.totalEntries || 0} festival registration(s)
            </span>
            <span style={{ fontSize: '11px', color: theme.colors.textMuted }}>
              Today: {resultData.todayDate}
            </span>
          </div>

          {(!resultData.registrations || resultData.registrations.length === 0) && (
            <SectionCard style={{ padding: '30px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎟️</div>
              <h3 style={{ fontSize: '16px', color: theme.colors.textPrimary, marginBottom: '6px' }}>
                No Circle Registrations Found
              </h3>
              <p style={{ fontSize: '13px', color: theme.colors.textMuted, marginBottom: '20px' }}>
                We couldn't find any booking for +91 {resultData.whatsapp}. Ready to join a circle
                tonight?
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <Link to="/register" style={{ textDecoration: 'none' }}>
                  <PrimaryButton style={{ padding: '8px 16px', fontSize: '13px' }}>
                    Register Live (Walk-up)
                  </PrimaryButton>
                </Link>
                <Link to="/advance" style={{ textDecoration: 'none' }}>
                  <GhostButton style={{ padding: '8px 16px', fontSize: '13px' }}>
                    Book Advance Pass
                  </GhostButton>
                </Link>
              </div>
            </SectionCard>
          )}

          {/* Cards for each registration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(resultData.registrations || []).map((reg) => {
              const isLive = reg.accessTier === 'live';
              const isUpcoming = reg.accessTier === 'upcoming';
              const isPast = reg.accessTier === 'past';

              return (
                <SectionCard
                  key={reg.registrationId}
                  style={{
                    padding: '20px',
                    position: 'relative',
                    borderLeft: `4px solid ${
                      isLive ? '#10B981' : isUpcoming ? theme.colors.cyan : '#6B7280'
                    }`,
                  }}
                >
                  {/* Top Bar: Event Date & Access Tier Badge */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: theme.colors.textMuted,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Festival Date
                      </div>
                      <div
                        style={{
                          fontFamily: theme.fonts.heading,
                          fontSize: '17px',
                          color: theme.colors.textPrimary,
                          fontWeight: 600,
                        }}
                      >
                        {reg.eventDate}
                      </div>
                    </div>

                    {isLive && (
                      <span
                        style={{
                          background: 'rgba(16,185,129,0.15)',
                          border: '1px solid #10B981',
                          color: '#34D399',
                          padding: '4px 10px',
                          borderRadius: '16px',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: '#10B981',
                          }}
                        />
                        LIVE TONIGHT
                      </span>
                    )}

                    {isUpcoming && (
                      <span
                        style={{
                          background: 'rgba(0,194,209,0.12)',
                          border: `1px solid ${theme.colors.cyan}`,
                          color: theme.colors.cyan,
                          padding: '4px 10px',
                          borderRadius: '16px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        📅 ADVANCE PASS
                      </span>
                    )}

                    {isPast && (
                      <span
                        style={{
                          background: 'rgba(107,114,128,0.15)',
                          border: '1px solid #6B7280',
                          color: '#9CA3AF',
                          padding: '4px 10px',
                          borderRadius: '16px',
                          fontSize: '11px',
                          fontWeight: 500,
                        }}
                      >
                        📁 PAST ARCHIVE
                      </span>
                    )}
                  </div>

                  {/* Venue & Attendee Details */}
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      marginBottom: '14px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: theme.colors.textPrimary,
                        marginBottom: '4px',
                      }}
                    >
                      {reg.venue} • {reg.city}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        fontSize: '12px',
                        color: theme.colors.textMuted,
                      }}
                    >
                      <span>👤 {reg.name}</span>
                      <span>•</span>
                      <span>⚡ Skill: {reg.skillLevel}</span>
                      {reg.isAllWomen && (
                        <>
                          <span>•</span>
                          <span style={{ color: theme.colors.gold }}>🌸 All-Women</span>
                        </>
                      )}
                      {reg.isCaptain && (
                        <>
                          <span>•</span>
                          <span style={{ color: theme.colors.gold }}>👑 Captain</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Circle Info & Meeting Point */}
                  {reg.circleId && (
                    <div
                      style={{
                        marginBottom: '14px',
                        padding: '10px 12px',
                        background: isLive ? 'rgba(227,165,66,0.08)' : 'transparent',
                        border: isLive
                          ? `1px solid ${theme.colors.gold}`
                          : `1px dashed ${theme.colors.borderLight}`,
                        borderRadius: '8px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: isLive ? theme.colors.gold : theme.colors.textSecondary,
                          marginBottom: '2px',
                        }}
                      >
                        {reg.circleName || `Circle #${reg.circleId.slice(-4)}`}
                      </div>
                      {reg.meetingPoint && (
                        <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
                          📍 Meeting Point: <strong>{reg.meetingPoint}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Backend Status Message */}
                  <div
                    style={{
                      fontSize: '12px',
                      color: isLive ? theme.colors.textSecondary : theme.colors.textMuted,
                      marginBottom: '16px',
                      lineHeight: 1.4,
                      fontStyle: isPast ? 'italic' : 'normal',
                    }}
                  >
                    {reg.statusMessage}
                  </div>

                  {/* QR Pass Token Box */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(0,0,0,0.3)',
                      border: `1px solid ${theme.colors.borderLight}`,
                      borderRadius: '8px',
                      padding: '8px 12px',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: theme.colors.textMuted }}>
                      Pass ID:{' '}
                      <code style={{ color: theme.colors.gold, fontWeight: 'bold' }}>
                        {reg.qrPassToken || reg.registrationId}
                      </code>
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        color: isPast ? '#9CA3AF' : '#10B981',
                        border: `1px solid ${isPast ? '#6B7280' : '#10B981'}`,
                        borderRadius: '4px',
                        padding: '2px 6px',
                      }}
                    >
                      {isPast ? 'EXPIRED' : 'VERIFIED PASS'}
                    </div>
                  </div>

                  {/* Action Buttons based on Access Tier */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {/* STATE 1: LIVE TONIGHT -> Full active buttons */}
                    {isLive && (
                      <>
                        <Link
                          to={`/circle/${reg.circleId}`}
                          state={{ circle: { id: reg.circleId, name: reg.circleName, meetingPoint: reg.meetingPoint }, registrationId: reg.registrationId, userName: reg.name }}
                          style={{ textDecoration: 'none', flex: 1 }}
                        >
                          <PrimaryButton
                            id={`btn-open-beacon-${reg.registrationId}`}
                            style={{ width: '100%', padding: '9px 12px', fontSize: '12px' }}
                          >
                            🪩 Open Color Beacon
                          </PrimaryButton>
                        </Link>
                        <Link
                          to={`/chat/${reg.circleId}`}
                          state={{ circle: { id: reg.circleId, name: reg.circleName, meetingPoint: reg.meetingPoint }, registrationId: reg.registrationId, userName: reg.name }}
                          style={{ textDecoration: 'none', flex: 1 }}
                        >
                          <GhostButton
                            id={`btn-open-chat-${reg.registrationId}`}
                            style={{
                              width: '100%',
                              padding: '9px 12px',
                              fontSize: '12px',
                              borderColor: theme.colors.gold,
                              color: theme.colors.gold,
                            }}
                          >
                            💬 Group Chat
                          </GhostButton>
                        </Link>
                      </>
                    )}

                    {/* STATE 2: UPCOMING -> View-only details with notice */}
                    {isUpcoming && (
                      <div
                        style={{
                          width: '100%',
                          textAlign: 'center',
                          padding: '8px',
                          background: 'rgba(0,194,209,0.05)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: theme.colors.cyan,
                        }}
                      >
                        ⏳ Circle assignment & Beacon unlock at 6:30 PM on {reg.eventDate}
                      </div>
                    )}

                    {/* STATE 3: PAST -> Read-only archived pass */}
                    {isPast && (
                      <div
                        style={{
                          width: '100%',
                          textAlign: 'center',
                          padding: '8px',
                          background: 'rgba(255,255,255,0.02)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: theme.colors.textMuted,
                        }}
                      >
                        🔒 Festival night completed. Group Beacon & Chat archived.
                      </div>
                    )}
                  </div>
                </SectionCard>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
