import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import SectionCard from '../components/common/SectionCard';
import PrimaryButton from '../components/common/PrimaryButton';
import GhostButton from '../components/common/GhostButton';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorBanner from '../components/common/ErrorBanner';
import { apiRequest } from '../api/apiClient';

export default function OrganizerDashboardPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const token = sessionStorage.getItem('organizer_token');
  const storedVenueId = sessionStorage.getItem('organizer_venue_id') || '';

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  // Gatekeeper: verify token exists
  useEffect(() => {
    if (!token) {
      navigate('/organizer/login', { replace: true });
      return;
    }
    fetchStats();
  }, [token, selectedDate]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiRequest('organizer-stats', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          venue: storedVenueId,
          eventDate: selectedDate,
        },
      });

      setStats(data);
    } catch (err) {
      if (err.status === 401) {
        sessionStorage.removeItem('organizer_token');
        navigate('/organizer/login', { replace: true });
      } else {
        setError(err.message || 'Failed to load organizer analytics. Please check credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('organizer_token');
    sessionStorage.removeItem('organizer_venue_id');
    navigate('/organizer/login', { replace: true });
  };

  if (!token) return null;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '900px',
        margin: '0 auto',
        padding: '30px 4vw 80px',
        minHeight: '85vh',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          paddingBottom: '20px',
          borderBottom: `1px solid ${theme.colors.borderLight}`,
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '20px' }}>🎪</span>
            <h1
              style={{
                fontFamily: theme.fonts.heading,
                fontSize: '22px',
                color: theme.colors.textPrimary,
                margin: 0,
              }}
            >
              Organizer Operations Hub
            </h1>
            <Badge color={theme.colors.gold} style={{ fontSize: '11px', textTransform: 'uppercase' }}>
              {stats?.venue || storedVenueId}
            </Badge>
          </div>
          <p style={{ fontSize: '12px', color: theme.colors.textMuted, margin: 0 }}>
            Real-time aggregate gate showups and circle allocation statistics.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', maxWidth: '100%' }}>
          <input
            id="input-organizer-date-filter"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${theme.colors.borderLight}`,
              borderRadius: '8px',
              padding: '6px 10px',
              minHeight: '40px',
              flex: '1 1 140px',
              minWidth: 0,
              color: theme.colors.textPrimary,
              fontSize: '12px',
            }}
          />
          <GhostButton
            id="btn-organizer-refresh"
            onClick={fetchStats}
            style={{ padding: '8px 12px', minHeight: '40px', fontSize: '12px' }}
          >
            🔄 Refresh
          </GhostButton>
          <GhostButton
            id="btn-organizer-logout"
            onClick={handleLogout}
            style={{ padding: '8px 12px', minHeight: '40px', fontSize: '12px', color: '#F87171' }}
          >
            Sign Out
          </GhostButton>
        </div>
      </div>

      {/* Privacy Guarantee Banner */}
      <div
        style={{
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid #10B981',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <span style={{ fontSize: '22px' }}>🛡️</span>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#34D399' }}>
            Zero-PII Privacy Protection Enforced
          </div>
          <div style={{ fontSize: '11px', color: theme.colors.textMuted, lineHeight: 1.4 }}>
            In compliance with SoloSaathi Circle safety standards, no attendee names, mobile
            numbers, or financial transactions are ever transmitted or accessible to venue grounds.
            All metrics shown are strictly anonymous aggregate totals.
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} style={{ marginBottom: '20px' }} />}

      {loading && !stats && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <LoadingSpinner label="Fetching aggregate operations data..." />
        </div>
      )}

      {stats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top KPI Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
              gap: '16px',
            }}
          >
            {/* Show-up Count & Rate */}
            <SectionCard style={{ padding: '20px' }}>
              <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '6px' }}>
                Gate Check-ins (Showups)
              </div>
              <div
                style={{
                  fontFamily: theme.fonts.heading,
                  fontSize: '32px',
                  fontWeight: 700,
                  color: '#10B981',
                  lineHeight: 1,
                  marginBottom: '6px',
                }}
              >
                {stats.attendance?.totalShowups || 0}
              </div>
              <div style={{ fontSize: '12px', color: theme.colors.textSecondary }}>
                Rate:{' '}
                <strong style={{ color: theme.colors.textPrimary }}>
                  {stats.attendance?.showUpRatePercentage || 0}%
                </strong>{' '}
                of registered
              </div>
            </SectionCard>

            {/* Total Registrations */}
            <SectionCard style={{ padding: '20px' }}>
              <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '6px' }}>
                Total Registrations
              </div>
              <div
                style={{
                  fontFamily: theme.fonts.heading,
                  fontSize: '32px',
                  fontWeight: 700,
                  color: theme.colors.textPrimary,
                  lineHeight: 1,
                  marginBottom: '6px',
                }}
              >
                {stats.registrations?.total || 0}
              </div>
              <div style={{ fontSize: '12px', color: theme.colors.textSecondary }}>
                Live Walk-in: <strong>{stats.registrations?.live || 0}</strong> • Advance:{' '}
                <strong>{stats.registrations?.advance || 0}</strong>
              </div>
            </SectionCard>

            {/* Circles Formed */}
            <SectionCard style={{ padding: '20px' }}>
              <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '6px' }}>
                Circles Formed
              </div>
              <div
                style={{
                  fontFamily: theme.fonts.heading,
                  fontSize: '32px',
                  fontWeight: 700,
                  color: theme.colors.gold,
                  lineHeight: 1,
                  marginBottom: '6px',
                }}
              >
                {stats.circles?.totalFormed || 0}
              </div>
              <div style={{ fontSize: '12px', color: theme.colors.textSecondary }}>
                Avg Size: <strong>{stats.circles?.averageSize || 0}</strong> • All-Women:{' '}
                <strong>{stats.circles?.allWomenCircleCount || 0}</strong>
              </div>
            </SectionCard>
          </div>

          {/* Detailed Breakdown Sections */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
              gap: '16px',
            }}
          >
            {/* Skill Level Distribution */}
            <SectionCard style={{ padding: '22px' }}>
              <h3
                style={{
                  fontSize: '15px',
                  color: theme.colors.textPrimary,
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>⚡</span> Skill Level Distribution
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  {
                    label: 'Beginner (2-Taali Basics)',
                    count: stats.skillLevelBreakdown?.beginner || 0,
                    color: '#22C55E',
                  },
                  {
                    label: 'Intermediate (3-Taali & Sanedo)',
                    count: stats.skillLevelBreakdown?.intermediate || 0,
                    color: '#FFB020',
                  },
                  {
                    label: 'Advanced (Fast Raas / Dodhiya)',
                    count: stats.skillLevelBreakdown?.advanced || 0,
                    color: '#F43F5E',
                  },
                ].map((item, idx) => {
                  const total = stats.registrations?.total || 1;
                  const pct = Math.round((item.count / total) * 100);
                  return (
                    <div key={idx}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                          marginBottom: '4px',
                          color: theme.colors.textSecondary,
                        }}
                      >
                        <span>{item.label}</span>
                        <span style={{ fontWeight: 600, color: theme.colors.textPrimary }}>
                          {item.count} ({pct}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: '6px',
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: item.color,
                            borderRadius: '3px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {/* Gender Distribution */}
            <SectionCard style={{ padding: '22px' }}>
              <h3
                style={{
                  fontSize: '15px',
                  color: theme.colors.textPrimary,
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>👥</span> Gender Ratio & Balance
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  {
                    label: 'Female Attendees',
                    count: stats.genderBalance?.female || 0,
                    color: theme.colors.pink,
                  },
                  {
                    label: 'Male Attendees',
                    count: stats.genderBalance?.male || 0,
                    color: theme.colors.cyan,
                  },
                  {
                    label: 'Prefer not to say',
                    count: stats.genderBalance?.prefer_not_to_say || 0,
                    color: '#9CA3AF',
                  },
                ].map((item, idx) => {
                  const total = stats.registrations?.total || 1;
                  const pct = Math.round((item.count / total) * 100);
                  return (
                    <div key={idx}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                          marginBottom: '4px',
                          color: theme.colors.textSecondary,
                        }}
                      >
                        <span>{item.label}</span>
                        <span style={{ fontWeight: 600, color: theme.colors.textPrimary }}>
                          {item.count} ({pct}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: '6px',
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: item.color,
                            borderRadius: '3px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>

          {/* Freshness Footer */}
          <div
            style={{
              textAlign: 'center',
              fontSize: '11px',
              color: theme.colors.textMuted,
              paddingTop: '10px',
            }}
          >
            Last server sync: {new Date(stats.dataFreshnessTimestamp || Date.now()).toLocaleTimeString()} • Auto-calculated across venue partitions
          </div>
        </div>
      )}
    </div>
  );
}
