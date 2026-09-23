import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme, useThemeMode } from '../../context/ThemeContext';
import headerLogo from '../../assets/logo/Logo_Name.png';
import { GhostButton } from '../common/GhostButton';
import { useAppContext } from '../../context/AppContext';
import { useDeviceType } from '../../hooks/useDeviceType';
import { Sun, Moon, Bell, LayoutDashboard, MapPin, Search } from 'lucide-react';

/**
 * NavBar — SoloSaathi Circle
 *
 * Top navigation bar. On mobile, shows only logo + theme toggle
 * (all other nav moved to BottomNav). On desktop, full navigation.
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
        background: theme.colors.surfaceNav || 'rgba(26, 22, 48, 0.96)',
        borderBottom: theme.borders.subtle,
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
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
              height: isMobile ? '34px' : '42px',
              maxWidth: isMobile ? '200px' : '260px',
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
              mixBlendMode: 'screen',
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
          {/* Desktop-only nav buttons */}
          {!isMobile && (
            <>
              <GhostButton
                onClick={() => navigate('/find-circle')}
                active={location.pathname === '/find-circle'}
                style={{ padding: '8px 14px', fontSize: '12.5px' }}
                icon={<Search size={14} />}
              >
                Find Circle
              </GhostButton>

              <GhostButton
                onClick={() => navigate('/notifications')}
                active={location.pathname === '/notifications'}
                style={{
                  position: 'relative',
                  padding: '8px 12px',
                  minWidth: '38px',
                }}
                aria-label="Notifications"
              >
                <Bell size={16} />
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

              <GhostButton
                onClick={() => navigate('/venues')}
                active={location.pathname === '/venues'}
                icon={<MapPin size={14} />}
              >
                Venues
              </GhostButton>

              <GhostButton
                onClick={() => navigate('/organizer')}
                active={location.pathname === '/organizer'}
                style={{
                  borderColor: `${theme.colors.amber}55`,
                  color: theme.colors.amber,
                  padding: '8px 14px',
                  fontSize: '12.5px',
                }}
                icon={<LayoutDashboard size={14} color={theme.colors.amber} />}
              >
                Organizer
              </GhostButton>
            </>
          )}

          {/* Dark/Light Mode Toggle — shown on both mobile & desktop */}
          <button
            onClick={toggleTheme}
            aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={mode === 'dark' ? 'Light mode' : 'Dark mode'}
            style={{
              background: 'none',
              border: `1px solid ${theme.colors.borderDefault}`,
              cursor: 'pointer',
              padding: '7px',
              borderRadius: '10px',
              transition: theme.transitions.fast,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.colors.textSecondary,
            }}
          >
            {mode === 'dark'
              ? <Sun size={16} color={theme.colors.amber} />
              : <Moon size={16} color={theme.colors.violet} />
            }
          </button>
        </div>
      </nav>
    </header>
  );
}

export default NavBar;
