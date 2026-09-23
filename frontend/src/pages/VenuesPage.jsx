import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import SectionCard from '../components/common/SectionCard';
import PrimaryButton from '../components/common/PrimaryButton';
import GhostButton from '../components/common/GhostButton';
import Badge from '../components/common/Badge';
import { useDeviceType } from '../hooks/useDeviceType';
import { MapPin, Navigation, Sparkles } from 'lucide-react';

/**
 * Partner venue directory across India's top Garba cities
 */
export const VENUE_TABLE = {
  Ahmedabad: [
    { name: 'United Way Garba Grounds', lat: 23.0395, lng: 72.5661, gates: 'Gates 1 to 4' },
    { name: 'Rajpath Club', lat: 23.0303, lng: 72.5108, gates: 'Main Club Gate' },
    { name: 'GMDC Ground', lat: 23.0469, lng: 72.5316, gates: 'Helipad & Arena Gates' },
  ],
  Surat: [
    { name: 'VR Surat Grounds', lat: 21.1959, lng: 72.7933, gates: 'Dumas Road Gate' },
    { name: 'Sarthana Ground', lat: 21.228, lng: 72.8619, gates: 'North Entrance' },
  ],
  Vadodara: [
    { name: 'Akota Stadium Grounds', lat: 22.2967, lng: 73.1631, gates: 'Pavilion Gate' },
    { name: 'Sursagar Lakefront', lat: 22.3057, lng: 73.193, gates: 'East Promenade' },
  ],
  Rajkot: [{ name: 'Race Course Ground', lat: 22.305, lng: 70.7833, gates: 'Ring Road Entrance' }],
  Mumbai: [
    { name: 'Shivaji Park Grounds', lat: 19.0283, lng: 72.8375, gates: 'Dadar West Gate' },
    { name: 'MMRDA Grounds BKC', lat: 19.0654, lng: 72.8664, gates: 'Gate 3 / Food Court' },
    { name: 'Goregaon Sports Club', lat: 19.1663, lng: 72.8526, gates: 'Link Road Gate' },
  ],
  Hyderabad: [
    { name: 'Imperial Gardens, Secunderabad', lat: 17.4399, lng: 78.4983, gates: 'Main Arch Gate' },
    { name: "People's Plaza", lat: 17.4126, lng: 78.4611, gates: 'Necklace Road Entry' },
  ],
  Delhi: [
    { name: 'Dwarka Sector 10 Ground', lat: 28.5921, lng: 77.046, gates: 'Metro Station Gate' },
    { name: 'CR Park Kali Mandir Grounds', lat: 28.5355, lng: 77.249, gates: 'Mandir Gate 1' },
  ],
  Bengaluru: [
    { name: 'Chinnaswamy Grounds', lat: 12.9789, lng: 77.5993, gates: 'MG Road Gate' },
    { name: 'Jayamahal Palace Grounds', lat: 12.999, lng: 77.596, gates: 'Palace Main Gate' },
  ],
};

/**
 * Derives normalized short Venue ID (e.g. AH-GMDC)
 */
export function getVenueId(city, venue) {
  const cityPart = (city || '').replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase();
  const venuePart = (venue || '').replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase();
  return `${cityPart}-${venuePart}`;
}

/**
 * Haversine formula distance in kilometers
 */
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function VenuesPage() {
  const theme = useTheme();
  const { isMobile } = useDeviceType();
  const [selectedCity, setSelectedCity] = useState('All');
  const [userLocation, setUserLocation] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);

  const cities = ['All', ...Object.keys(VENUE_TABLE)];

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGeoLoading(false);
      },
      (err) => {
        setGeoError('Could not retrieve your location. Showing standard venue list.');
        setGeoLoading(false);
      },
      { timeout: 8000 }
    );
  };

  // Compile all venue items with distance if user location available
  const allVenues = [];
  Object.keys(VENUE_TABLE).forEach((city) => {
    VENUE_TABLE[city].forEach((v) => {
      let dist = null;
      if (userLocation) {
        dist = distanceKm(userLocation.lat, userLocation.lng, v.lat, v.lng);
      }
      allVenues.push({
        ...v,
        city,
        id: getVenueId(city, v.name),
        distanceKm: dist,
      });
    });
  });

  // Sort by distance if GPS active
  if (userLocation) {
    allVenues.sort((a, b) => (a.distanceKm || 9999) - (b.distanceKm || 9999));
  }

  const filteredVenues = allVenues.filter(
    (v) => selectedCity === 'All' || v.city === selectedCity
  );

  const nearestVenue = userLocation && allVenues.length > 0 ? allVenues[0] : null;

  return (
    <div
      style={{
        maxWidth: '840px',
        margin: '0 auto',
        padding: isMobile ? '20px 4vw 40px' : '30px 4vw 80px',
        minHeight: '85vh',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'rgba(0,194,209,0.12)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px',
        }}>
          <MapPin size={24} color={theme.colors.cyan} />
        </div>
        <h1
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: isMobile ? '22px' : '24px',
            color: theme.colors.textPrimary,
            marginBottom: '8px',
          }}
        >
          Partner Festival Grounds
        </h1>
        <p style={{ fontSize: '13px', color: theme.colors.textMuted, lineHeight: 1.5, maxWidth: '420px', margin: '0 auto' }}>
          Authorized festival venues across Gujarat & India with active SoloSaathi matching circles.
        </p>
      </div>

      {/* GPS Location Finder bar */}
      <SectionCard style={{ padding: isMobile ? '14px 16px' : '16px 20px', marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'stretch' : 'center',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Navigation size={16} color={theme.colors.cyan} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: theme.colors.textPrimary }}>
                Find Closest Ground
              </div>
              <div style={{ fontSize: '11px', color: theme.colors.textMuted }}>
                GPS distance to nearest Garba ground.
              </div>
            </div>
          </div>
          <PrimaryButton
            id="btn-venues-locate-me"
            loading={geoLoading}
            onClick={handleLocateMe}
            style={{ padding: '8px 16px', fontSize: '12px', width: isMobile ? '100%' : 'auto' }}
          >
            {userLocation ? '✓ GPS Located' : 'Find Near Me'}
          </PrimaryButton>
        </div>

        {geoError && (
          <div style={{ fontSize: '11px', color: '#F87171', marginTop: '8px' }}>{geoError}</div>
        )}

        {nearestVenue && (
          <div
            style={{
              marginTop: '12px',
              padding: '8px 12px',
              background: 'rgba(227,165,66,0.1)',
              border: `1px solid ${theme.colors.gold}`,
              borderRadius: '6px',
              fontSize: '12px',
              color: theme.colors.gold,
            }}
          >
            <Sparkles size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} color={theme.colors.gold} /> Nearest Ground:{' '}
            <strong>
              {nearestVenue.name} ({nearestVenue.city})
            </strong>{' '}
            — ~{nearestVenue.distanceKm.toFixed(1)} km away!
          </div>
        )}
      </SectionCard>

      {/* City Filter Pills */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '20px',
        }}
      >
        {cities.map((c) => (
          <button
            key={c}
            onClick={() => setSelectedCity(c)}
            style={{
              flexShrink: 0,
              background:
                selectedCity === c
                  ? `linear-gradient(135deg, ${theme.colors.gold}, ${theme.colors.amber})`
                  : 'rgba(255,255,255,0.05)',
              border: `1px solid ${selectedCity === c ? 'transparent' : theme.colors.borderDefault}`,
              borderRadius: '20px',
              color: selectedCity === c ? '#14101F' : theme.colors.textSecondary,
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: selectedCity === c ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Venues Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: isMobile ? '12px' : '16px',
        }}
      >
        {filteredVenues.map((v) => {
          const isNearest = nearestVenue && nearestVenue.id === v.id;

          return (
            <SectionCard
              key={v.id}
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: isNearest ? `2px solid ${theme.colors.gold}` : undefined,
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10px',
                      color: theme.colors.cyan,
                      background: 'rgba(0,194,209,0.1)',
                      border: `1px solid ${theme.colors.cyan}`,
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontWeight: 600,
                    }}
                  >
                    ID: {v.id}
                  </span>
                  <span style={{ fontSize: '11px', color: theme.colors.textMuted }}>{v.city}</span>
                </div>

                <h3
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: theme.colors.textPrimary,
                    margin: '0 0 4px',
                  }}
                >
                  {v.name}
                </h3>
                <div style={{ fontSize: '11px', color: theme.colors.textMuted, marginBottom: '12px' }}>
                  Gates: {v.gates}
                </div>

                {v.distanceKm !== null && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: isNearest ? theme.colors.gold : theme.colors.textSecondary,
                      marginBottom: '12px',
                      fontWeight: isNearest ? 600 : 400,
                    }}
                  >
                    <MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} /> ~{v.distanceKm.toFixed(1)} km from you {isNearest ? '• Nearest!' : ''}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px', marginTop: '14px' }}>
                <Link
                  to={`/register?city=${encodeURIComponent(v.city)}&venue=${encodeURIComponent(v.name)}`}
                  style={{ textDecoration: 'none', flex: 1 }}
                >
                  <PrimaryButton style={{ width: '100%', padding: isMobile ? '10px' : '7px', fontSize: isMobile ? '13px' : '11px' }}>
                    Register Live
                  </PrimaryButton>
                </Link>
                <Link
                  to={`/advance?city=${encodeURIComponent(v.city)}&venue=${encodeURIComponent(v.name)}`}
                  style={{ textDecoration: 'none', flex: 1 }}
                >
                  <GhostButton style={{ width: '100%', padding: isMobile ? '10px' : '7px', fontSize: isMobile ? '13px' : '11px' }}>
                    Book Advance
                  </GhostButton>
                </Link>
              </div>
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
