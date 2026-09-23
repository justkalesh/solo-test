import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import SectionCard from '../components/common/SectionCard';
import GhostButton from '../components/common/GhostButton';
import Badge from '../components/common/Badge';

const DEFAULT_NOTIFICATIONS = [
  {
    id: 'n1',
    title: '⏰ Chat Auto-Closing Notice',
    message:
      'Navratri night winds down at 1:00 AM IST. Group chats will automatically archive for the night per festival ground guidelines.',
    time: '12:45 AM',
    tag: 'Safety Alert',
    tagColor: '#F5B301',
    unread: true,
    actionLink: '/find-circle',
    actionLabel: 'View Circle Pass',
  },
  {
    id: 'n2',
    title: '📍 Meeting Point Assigned',
    message:
      'Your Circle Captain has set the rendezvous spot: Near Main Stage / Stall 5. Turn on your color beacon when you approach!',
    time: '7:15 PM',
    tag: 'Circle Update',
    tagColor: '#10B981',
    unread: true,
    actionLink: '/find-circle',
    actionLabel: 'Open Beacon',
  },
  {
    id: 'n3',
    title: '🚪 Gates Open at 6:30 PM',
    message:
      'Live walk-up registrations and AI ticket verification are now live! Head to the SoloSaathi booth near Gate 2.',
    time: '6:30 PM',
    tag: 'Ground Notice',
    tagColor: '#00C2D1',
    unread: false,
    actionLink: '/register',
    actionLabel: 'Register Walk-Up',
  },
  {
    id: 'n4',
    title: '🎟️ Advance Booking Confirmed',
    message:
      'Your pre-booked slot for peak Navratri night is locked. Circle matching completes 48 hours prior to the event.',
    time: 'Yesterday',
    tag: 'Booking',
    tagColor: '#7C3AED',
    unread: false,
    actionLink: '/find-circle',
    actionLabel: 'My Passes',
  },
];

export default function NotificationsPage() {
  const theme = useTheme();
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const clearNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

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

        {notifications.some((n) => n.unread) && (
          <GhostButton
            onClick={markAllAsRead}
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
                background: n.unread ? theme.gradients.cardNeutral : theme.colors.surfaceElevated,
                borderLeft: n.unread
                  ? `4px solid ${n.tagColor || theme.colors.gold}`
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
                      color: n.tagColor || theme.colors.gold,
                      background: 'rgba(255,255,255,0.06)',
                      border: `1px solid ${n.tagColor || theme.colors.gold}`,
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
                  onClick={() => clearNotification(n.id)}
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
                      color: theme.colors.gold,
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
