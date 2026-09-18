import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import theme from '../../styles/theme';
import { LogoFull, LogoMark } from '../../assets/logo';
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
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount, selectedVenue, selectedCity } = useAppContext();
  const { isMobile } = useDeviceType();

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        width: '100%',
        background: 'rgba(26, 22, 48, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: theme.borders.subtle,
      }}
    >
      {/* Top Event Status Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 4vw',
          maxWidth: theme.maxWidths.desktop,
          margin: '0 auto',
          fontSize: '11px',
          color: theme.colors.textMuted,
          borderBottom: '0.5px solid rgba(74, 59, 110, 0.4)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>📍</span>
          <span style={{ color: theme.colors.textPrimary, fontWeight: 500 }}>
            {selectedVenue ? `${selectedVenue}, ${selectedCity}` : 'Ahmedabad'}
          </span>
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: theme.colors.liveGreen,
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: theme.colors.liveGreen,
              boxShadow: theme.shadows.glowLive,
              display: 'inline-block',
            }}
          />
          Navratri Live
        </span>
      </div>

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
          {isMobile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LogoMark size={38} />
              <span
                style={{
                  fontFamily: theme.fonts.heading,
                  fontWeight: 700,
                  fontSize: '18px',
                  color: theme.colors.textPrimary,
                  letterSpacing: '0.3px',
                }}
              >
                SoloSaathi
              </span>
            </div>
          ) : (
            <LogoFull size={180} />
          )}
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
        </div>
      </nav>
    </header>
  );
}

export default NavBar;
