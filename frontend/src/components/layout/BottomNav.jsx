import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAppContext } from '../../context/AppContext';
import { Home, Search, Bell, MapPin, LayoutDashboard } from 'lucide-react';

// Visible bar height (excluding the iOS home-indicator safe area). AppShell reserves this space.
export const BOTTOM_NAV_HEIGHT = 60;

/**
 * BottomNav — Mobile-only fixed bottom tab bar
 *
 * Moves navigation items from the cramped top navbar into a clean
 * thumb-friendly bottom tab bar. Rendered by AppShell only when isMobile.
 */
export function BottomNav() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useAppContext();

  const tabs = [
    { key: 'home', label: 'Home', icon: Home, path: '/' },
    { key: 'venues', label: 'Venues', icon: MapPin, path: '/venues' },
    { key: 'find', label: 'Find', icon: Search, path: '/find-circle' },
    { key: 'alerts', label: 'Alerts', icon: Bell, path: '/notifications', badge: unreadCount },
    { key: 'org', label: 'Organizer', icon: LayoutDashboard, path: '/organizer' },
  ];

  // Sub-routes (e.g. /organizer/login) keep their parent tab highlighted
  const isTabActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
      <nav
        className="bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: theme.colors.surfaceNav || 'rgba(26, 22, 48, 0.98)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: theme.borders.subtle,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'stretch',
          height: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          transform: 'translateZ(0)',
        }}
        aria-label="Bottom Navigation"
      >
        {tabs.map((tab) => {
          const isActive = isTabActive(tab.path);
          const Icon = tab.icon;
          const activeColor = theme.colors.gold;
          const inactiveColor = theme.colors.textMuted;

          return (
            <button
              key={tab.key}
              onClick={() => navigate(tab.path)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 4px',
                borderRadius: '8px',
                transition: 'color 0.2s ease',
                position: 'relative',
                flex: 1,
                minWidth: 0,
              }}
            >
              <div style={{ position: 'relative', lineHeight: 0 }}>
                <Icon
                  size={22}
                  color={isActive ? activeColor : inactiveColor}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                {/* Notification badge */}
                {tab.badge > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-6px',
                      background: theme.colors.magenta,
                      color: '#FFF',
                      borderRadius: '50%',
                      width: '14px',
                      height: '14px',
                      fontSize: '8px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 6px rgba(219, 39, 119, 0.5)',
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? activeColor : inactiveColor,
                  fontFamily: theme.fonts.body,
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
  );
}

export default BottomNav;
