import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import SectionCard from '../components/common/SectionCard';
import PrimaryButton from '../components/common/PrimaryButton';
import GhostButton from '../components/common/GhostButton';
import ErrorBanner from '../components/common/ErrorBanner';
import { postRequest } from '../api/apiClient';

export default function OrganizerLoginPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [venueId, setVenueId] = useState(sessionStorage.getItem('organizer_venue_id') || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();

    const cleanVenueId = venueId.trim().toUpperCase();
    const cleanPassword = password.trim();

    if (!cleanVenueId) {
      setError('Please enter your Venue ID (e.g. AH-GMDC).');
      return;
    }
    if (!cleanPassword) {
      setError('Please enter your venue organizer password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await postRequest('admin-auth', {
        venueId: cleanVenueId,
        password: cleanPassword,
      });

      // Strict security: Store in sessionStorage ONLY (never localStorage)
      // to avoid persistent tokens on shared booth devices
      sessionStorage.setItem('organizer_token', data.token);
      sessionStorage.setItem('organizer_venue_id', data.venueId);

      navigate('/organizer/dashboard', { replace: true });
    } catch (err) {
      setError(
        err.message || 'Invalid Venue ID or password. Please verify with festival operations.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '460px',
        margin: '0 auto',
        padding: '40px 4vw 80px',
        minHeight: '75vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎪</div>
        <h1
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: '24px',
            color: theme.colors.textPrimary,
            marginBottom: '8px',
          }}
        >
          Organizer Portal Login
        </h1>
        <p style={{ fontSize: '13px', color: theme.colors.textMuted, lineHeight: 1.5 }}>
          Authorized venue ground staff & festival operations access only.
        </p>
      </div>

      <SectionCard style={{ padding: '28px' }}>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && <ErrorBanner message={error} />}

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: theme.colors.textSecondary,
                marginBottom: '6px',
              }}
            >
              Venue ID
            </label>
            <input
              id="input-organizer-venue-id"
              type="text"
              placeholder="e.g. AH-GMDC or AH-UNIT"
              value={venueId}
              onChange={(e) => {
                setVenueId(e.target.value.toUpperCase());
                if (error) setError(null);
              }}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${theme.colors.borderLight}`,
                borderRadius: '8px',
                padding: '11px 14px',
                color: theme.colors.textPrimary,
                fontSize: '14px',
                outline: 'none',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            />
            <div style={{ fontSize: '11px', color: theme.colors.textMuted, marginTop: '4px' }}>
              Format: City prefix + Venue code (e.g. <code>AH-GMDC</code>, <code>SR-VRSU</code>).{' '}
              <Link
                to="/venues"
                style={{
                  color: theme.colors.gold,
                  textDecoration: 'none',
                  display: 'inline-block',
                  padding: '10px 0',
                  margin: '-10px 0',
                }}
              >
                Lookup Venue Codes
              </Link>
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: theme.colors.textSecondary,
                marginBottom: '6px',
              }}
            >
              Organizer Access Key
            </label>
            <input
              id="input-organizer-password"
              type="password"
              placeholder="Enter secure venue key"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${theme.colors.borderLight}`,
                borderRadius: '8px',
                padding: '11px 14px',
                color: theme.colors.textPrimary,
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${theme.colors.borderLight}`,
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '11px',
              color: theme.colors.textMuted,
              lineHeight: 1.4,
            }}
          >
            🔒 <strong>Session Security</strong>: Temporary 12-hour organizer token saved to active
            browser session only. Auto-clears when tab closes.
          </div>

          <PrimaryButton
            id="btn-organizer-login-submit"
            type="submit"
            loading={loading}
            style={{ width: '100%', padding: '12px', fontSize: '14px', marginTop: '4px' }}
          >
            Sign In to Dashboard
          </PrimaryButton>
        </form>
      </SectionCard>
    </div>
  );
}
