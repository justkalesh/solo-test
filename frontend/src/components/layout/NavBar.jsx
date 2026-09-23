import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme, useThemeMode } from '../../context/ThemeContext';
import headerLogo from '../../assets/logo/Header.png';
import { GhostButton } from '../common/GhostButton';
import { useAppContext } from '../../context/AppContext';
import { useDeviceType } from '../../hooks/useDeviceType';

/**
 * NavBar — SoloSaathi Circle
 *
 * Top navigation bar featuring the brand logo mark, active venue indicator,
 * notification badge, and quick access navigation buttons.
 */
export function NavBar() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount, selectedVenue, selectedCity } = useAppContext();
  const { isMobile } = useDeviceType();
  const { mode, toggleTheme } = useThemeMode();

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        width: '100%',
        background: theme.colors.surfaceNav,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: theme.borders.subtle,
      }}
    >


      {/* Main Nav Content */}
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isMobile ? '10px 4vw' : '12px 4vw',
          maxWidth: theme.maxWidths.desktop,
          margin: '0 auto',
          gap: '12px',
        }}
        aria-label="Main Navigation"
      >
        {/* Brand Logo */}
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            textDecoration: 'none',
            outline: 'none',
          }}
          aria-label="SoloSaathi Circle Home"
        >
          <img
            src={headerLogo}
            alt="SoloSaathi Circle"
            style={{
              height: isMobile ? '32px' : '38px',
              maxWidth: isMobile ? '160px' : '200px',
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </Link>

        {/* Navigation Action Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '6px' : '10px',
            flexWrap: 'nowrap',
          }}
        >
          <GhostButton
            onClick={() => navigate('/find-circle')}
            active={location.pathname === '/find-circle'}
            style={{ padding: isMobile ? '7px 10px' : '8px 14px', fontSize: isMobile ? '11.5px' : '12.5px' }}
          >
            Find Circle
          </GhostButton>

          <GhostButton
            onClick={() => navigate('/notifications')}
            active={location.pathname === '/notifications'}
            style={{
              position: 'relative',
              padding: isMobile ? '7px 10px' : '8px 12px',
              minWidth: isMobile ? '34px' : '38px',
            }}
            aria-label="Notifications"
          >
            <span>🔔</span>
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: theme.colors.magenta,
                  color: '#FFF',
                  borderRadius: '50%',
                  width: '15px',
                  height: '15px',
                  fontSize: '9px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 6px #DB2777',
                }}
              >
                {unreadCount}
              </span>
            )}
          </GhostButton>

          {!isMobile && (
            <GhostButton
              onClick={() => navigate('/venues')}
              active={location.pathname === '/venues'}
            >
              Venues
            </GhostButton>
          )}

          <GhostButton
            onClick={() => navigate('/organizer')}
            active={location.pathname === '/organizer'}
            style={{
              borderColor: `${theme.colors.amber}55`,
              color: theme.colors.amber,
              padding: isMobile ? '7px 10px' : '8px 14px',
              fontSize: isMobile ? '11.5px' : '12.5px',
            }}
          >
            📊 {isMobile ? 'Org' : 'Organizer'}
          </GhostButton>

          {/* Dark/Light Mode Toggle */}
          <button
            onClick={toggleTheme}
            aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={mode === 'dark' ? 'Light mode' : 'Dark mode'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: isMobile ? '18px' : '20px',
              padding: '6px',
              borderRadius: '8px',
              transition: theme.transitions.fast,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {mode === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>
    </header>
  );
}

export default NavBar;
