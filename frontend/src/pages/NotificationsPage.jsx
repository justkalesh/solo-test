import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import SectionCard from '../components/common/SectionCard';
import GhostButton from '../components/common/GhostButton';
import Badge from '../components/common/Badge';
import { useAppContext } from '../context/AppContext';


export default function NotificationsPage() {
  const theme = useTheme();
  const { notifications, markAllNotificationsRead, dismissNotification } = useAppContext();
  const toneColor = (n) => theme.colors[n.tone] || theme.colors.gold;
  const toneText = (n) => theme.colors[`${n.tone}Text`] || theme.colors.goldText;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '580px',
        margin: '0 auto',
        padding: '30px 4vw 80px',
        minHeight: '80vh',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontFamily: theme.fonts.heading,
              fontSize: '24px',
              color: theme.colors.textPrimary,
              margin: '0 0 4px',
            }}
          >
            🔔 Festival Alerts
          </h1>
          <p style={{ fontSize: '13px', color: theme.colors.textMuted, margin: 0 }}>
            Live venue updates, captain announcements, and ground alerts.
          </p>
        </div>

        {notifications.some((n) => !n.read) && (
          <GhostButton
            onClick={markAllNotificationsRead}
            style={{ padding: '8px 12px', fontSize: '12px', minHeight: '36px', height: 'fit-content', flexShrink: 0 }}
          >
            Mark all read
          </GhostButton>
        )}
      </div>

      {notifications.length === 0 ? (
        <SectionCard style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔕</div>
          <h3 style={{ fontSize: '16px', color: theme.colors.textPrimary, marginBottom: '6px' }}>
            No New Notifications
          </h3>
          <p style={{ fontSize: '13px', color: theme.colors.textMuted }}>
            You're all caught up on tonight's festival alerts!
          </p>
        </SectionCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map((n) => (
            <SectionCard
              key={n.id}
              style={{
                padding: '16px',
                position: 'relative',
                background: !n.read ? theme.gradients.cardNeutral : theme.colors.surfaceElevated,
                borderLeft: !n.read
                  ? `4px solid ${toneColor(n)}`
                  : `1px solid ${theme.colors.borderLight}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      color: toneText(n),
                      background: theme.colors.surfaceElevated,
                      border: `1px solid ${toneColor(n)}`,
                      borderRadius: '12px',
                      padding: '2px 8px',
                      fontWeight: 600,
                    }}
                  >
                    {n.tag}
                  </span>
                  <span style={{ fontSize: '11px', color: theme.colors.textMuted }}>{n.time}</span>
                </div>
                <button
                  onClick={() => dismissNotification(n.id)}
                  aria-label="Dismiss notification"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: theme.colors.textMuted,
                    cursor: 'pointer',
                    fontSize: '14px',
                    minWidth: '40px',
                    minHeight: '40px',
                    margin: '-10px -10px 0 0',
                    flexShrink: 0,
                  }}
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>

              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: theme.colors.textPrimary,
                  marginBottom: '6px',
                }}
              >
                {n.title}
              </h3>
              <p
                style={{
                  fontSize: '12px',
                  color: theme.colors.textSecondary,
                  lineHeight: 1.5,
                  marginBottom: '12px',
                }}
              >
                {n.message}
              </p>

              {n.actionLink && (
                <Link
                  to={n.actionLink}
                  style={{ textDecoration: 'none', display: 'inline-block', padding: '10px 0', margin: '-10px 0' }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: theme.colors.goldText,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {n.actionLabel || 'View Details'} →
                  </span>
                </Link>
              )}
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
