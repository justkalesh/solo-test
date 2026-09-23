import React from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';
import Footer from './Footer';
import FestiveBackdrop from '../effects/FestiveBackdrop';
import BottomNav, { BOTTOM_NAV_HEIGHT } from './BottomNav';
import { useDeviceType } from '../../hooks/useDeviceType';

/**
 * AppShell — Top-Level Application Frame
 *
 * Wraps every routed page with:
 * 1. Responsive ambient festive glow backdrop (`FestiveBackdrop`)
 * 2. Sticky navigation bar (`NavBar`)
 * 3. Page content outlet / container (`<Outlet />`)
 * 4. Production credits footer (`Footer`)
 */
export function AppShell({ children }) {
  const { isMobile } = useDeviceType();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        // Reserve room below the footer so the fixed BottomNav never covers page content
        paddingBottom: isMobile
          ? `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`
          : 0,
      }}
    >
      {/* Viewport-responsive ambient glow & sparks */}
      <FestiveBackdrop />

      {/* Top Header / App Bar */}
      <NavBar />

      {/* Main Page Canvas */}
      <main
        style={{
          flex: 1,
          width: '100%',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children || <Outlet />}
      </main>

      {/* Persistent Production Footer */}
      <Footer />

      {/* Mobile Bottom Navigation */}
      {isMobile && <BottomNav />}
    </div>
  );
}

export default AppShell;
