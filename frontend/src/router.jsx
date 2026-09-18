import React from 'react';
import { createBrowserRouter, Navigate, Link } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import HomePage from './pages/HomePage';
import theme from './styles/theme';
import SectionCard from './components/common/SectionCard';
import GhostButton from './components/common/GhostButton';

/**
 * Placeholder component rendered for stubbed Phase 2 routes.
 * In Phase 2, each placeholder will be replaced with its full implementation.
 */
function Phase2Placeholder({ title, description, icon = '⏳' }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '30px 4vw',
      }}
    >
      <SectionCard
        style={{
          maxWidth: '440px',
          width: '100%',
          textAlign: 'center',
          padding: '36px 24px',
        }}
      >
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>{icon}</div>
        <h2
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: '22px',
            color: theme.colors.textPrimary,
            marginBottom: '8px',
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: '13px',
            color: theme.colors.textMuted,
            lineHeight: 1.6,
            marginBottom: '24px',
          }}
        >
          {description}
        </p>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <GhostButton style={{ padding: '10px 20px' }}>← Back to Home</GhostButton>
        </Link>
      </SectionCard>
    </div>
  );
}

/**
 * React Router Configuration
 *
 * All routes are wrapped inside `AppShell` (which provides NavBar,
 * FestiveBackdrop, and Footer).
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      // 1. Home / Landing Screen (Phase 1 active screen)
      {
        index: true,
        element: <HomePage />,
      },

      // -------------------------------------------------------------------------
      // PHASE 2 ROUTE STUBS (To be filled in Phase 2)
      // -------------------------------------------------------------------------

      // Route: /register (Live Walk-Up Registration Flow & AI Ticket Upload)
      {
        path: 'register',
        element: (
          <Phase2Placeholder
            title="Live Walk-Up Registration"
            description="Live registration opens each festival evening at 6:30 PM. Instant AI ticket verification and circle assignment launching in Phase 2."
            icon="🔍"
          />
        ),
      },

      // Route: /advance (Advance Pre-Booking Registration & Razorpay checkout)
      {
        path: 'advance',
        element: (
          <Phase2Placeholder
            title="Advance Circle Pre-Booking"
            description="Reserve your circle days ahead for peak Navratri nights. Includes secure Razorpay payment integration, launching in Phase 2."
            icon="💃"
          />
        ),
      },

      // Route: /find-circle (Look up assigned circle by mobile OTP / ticket code)
      {
        path: 'find-circle',
        element: (
          <Phase2Placeholder
            title="Find My Circle"
            description="Enter your registered phone number or booking ID to retrieve your circle room and Captain assignment. Launching in Phase 2."
            icon="📍"
          />
        ),
      },

      // Route: /circle/:circleId (Active Circle Room, Beacon Screen, & Circle Chat)
      {
        path: 'circle/:circleId',
        element: (
          <Phase2Placeholder
            title="Circle Room & Beacon"
            description="Live group chat, synchronized color beacon screen, and anchor landmark navigation for your matched Mandli. Launching in Phase 2."
            icon="🪩"
          />
        ),
      },

      // Route: /notifications (Festival updates, day-of alerts, captain callouts)
      {
        path: 'notifications',
        element: (
          <Phase2Placeholder
            title="Notifications & Alerts"
            description="Real-time festival alerts, weather notices, and captain callouts for your registered venue. Launching in Phase 2."
            icon="🔔"
          />
        ),
      },

      // Route: /organizer (Organizer Dashboard & Venue Check-in Scanner)
      {
        path: 'organizer',
        element: (
          <Phase2Placeholder
            title="Organizer Dashboard"
            description="Live venue attendance tracking, circle capacity management, and pass verification for venue partners. Launching in Phase 2."
            icon="📊"
          />
        ),
      },

      // Route: /venues (Partner festival grounds and anchor locations)
      {
        path: 'venues',
        element: (
          <Phase2Placeholder
            title="Festival Partner Venues"
            description="Browse participating garba grounds across Gujarat, Mumbai, and India with GPS distance checks. Launching in Phase 2."
            icon="🎪"
          />
        ),
      },

      // Catch-all: redirect unknown paths to home
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

export default router;
