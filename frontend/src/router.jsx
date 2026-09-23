import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import LoadingSpinner from './components/common/LoadingSpinner';

// Route-level Code Splitting using React.lazy()
// Loads each page bundle on-demand to optimize weak festival-ground network performance
const HomePage = lazy(() => import('./pages/HomePage'));
const RegisterLivePage = lazy(() => import('./pages/RegisterLivePage'));
const RegisterAdvancePage = lazy(() => import('./pages/RegisterAdvancePage'));
const FindMyCirclePage = lazy(() => import('./pages/FindMyCirclePage'));
const CircleActivePage = lazy(() => import('./pages/CircleActivePage'));
const CircleChatPage = lazy(() => import('./pages/CircleChatPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const OrganizerLoginPage = lazy(() => import('./pages/OrganizerLoginPage'));
const OrganizerDashboardPage = lazy(() => import('./pages/OrganizerDashboardPage'));
const VenuesPage = lazy(() => import('./pages/VenuesPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

/**
 * Suspense wrapper for lazy-loaded route components
 */
function SuspenseWrapper({ children }) {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
            padding: '40px 20px',
          }}
        >
          <LoadingSpinner label="Connecting to festival ground..." />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

/**
 * React Router Configuration — SoloSaathi Circle Production
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      // 1. Home / Landing Screen
      {
        index: true,
        element: (
          <SuspenseWrapper>
            <HomePage />
          </SuspenseWrapper>
        ),
      },

      // 2. Live Walk-Up Registration (6:30 PM gate rush, OTP, AI ticket verification, Razorpay)
      {
        path: 'register',
        element: (
          <SuspenseWrapper>
            <RegisterLivePage />
          </SuspenseWrapper>
        ),
      },

      // 3. Advance Pre-Booking Registration (Peak/Base pricing, OCR ticket verification, Razorpay)
      {
        path: 'advance',
        element: (
          <SuspenseWrapper>
            <RegisterAdvancePage />
          </SuspenseWrapper>
        ),
      },

      // 4. Find My Circle & Passes (WhatsApp lookup across live, upcoming, past tiers)
      {
        path: 'find-circle',
        element: (
          <SuspenseWrapper>
            <FindMyCirclePage />
          </SuspenseWrapper>
        ),
      },

      // 5. Active Circle Hub (Beacon pulse, meeting anchor, member roster, gate check-in)
      {
        path: 'circle/:circleId',
        element: (
          <SuspenseWrapper>
            <CircleActivePage />
          </SuspenseWrapper>
        ),
      },

      // 6. Circle Group Chat (Ephemeral chat, chips, 1:00 AM IST auto-close, captain controls)
      {
        path: 'chat/:circleId',
        element: (
          <SuspenseWrapper>
            <CircleChatPage />
          </SuspenseWrapper>
        ),
      },

      // 7. Festival Notifications & Day-of Alerts
      {
        path: 'notifications',
        element: (
          <SuspenseWrapper>
            <NotificationsPage />
          </SuspenseWrapper>
        ),
      },

      // 8. Organizer Portal: Login & Venue Analytics Dashboard
      {
        path: 'organizer',
        element: <Navigate to="/organizer/dashboard" replace />,
      },
      {
        path: 'organizer/login',
        element: (
          <SuspenseWrapper>
            <OrganizerLoginPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'organizer/dashboard',
        element: (
          <SuspenseWrapper>
            <OrganizerDashboardPage />
          </SuspenseWrapper>
        ),
      },

      // 9. Partner Festival Grounds Directory (GPS Haversine distance calculator)
      {
        path: 'venues',
        element: (
          <SuspenseWrapper>
            <VenuesPage />
          </SuspenseWrapper>
        ),
      },

      // 10. 404 — Not Found
      {
        path: '*',
        element: (
          <SuspenseWrapper>
            <NotFoundPage />
          </SuspenseWrapper>
        ),
      },
    ],
  },
]);

export default router;
