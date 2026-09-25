import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import PrimaryButton from '../components/common/PrimaryButton';
import GhostButton from '../components/common/GhostButton';
import SectionCard from '../components/common/SectionCard';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorBanner from '../components/common/ErrorBanner';
import OtpVerificationModal from './OtpVerificationModal';
import TicketUploadStep from './TicketUploadStep';
import PaymentStep from './PaymentStep';
import { apiPost } from '../api/apiClient';
import { useAppContext } from '../context/AppContext';
import { useDeviceType } from '../hooks/useDeviceType';

const CITIES = ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Mumbai'];
const VENUES_BY_CITY = {
  Ahmedabad: ['United Way Garba Grounds', 'Rajpath Club', 'GMDC Ground'],
  Surat: ['VR Surat Grounds', 'Sarthana Ground'],
  Vadodara: ['Akota Stadium Grounds', 'Sursagar Lakefront'],
  Rajkot: ['Race Course Ground'],
  Mumbai: ['Shivaji Park Grounds', 'MMRDA Grounds BKC', 'Goregaon Sports Club'],
};
const AGE_BANDS = ['18-24', '25-34', '35-44', '45+'];
const PEAK_DATES = ['2026-10-17', '2026-10-18', '2026-10-24', '2026-10-25'];

// Upcoming festival season dates (Navratri 2026)
const FESTIVAL_DATES = [
  { date: '2026-10-14', label: 'Oct 14 (Wed) • Day 2' },
  { date: '2026-10-15', label: 'Oct 15 (Thu) • Day 3' },
  { date: '2026-10-16', label: 'Oct 16 (Fri) • Weekend Eve' },
  { date: '2026-10-17', label: 'Oct 17 (Sat) • Peak Weekend 🔥' },
  { date: '2026-10-18', label: 'Oct 18 (Sun) • Peak Weekend 🔥' },
  { date: '2026-10-19', label: 'Oct 19 (Mon) • Day 7' },
  { date: '2026-10-20', label: 'Oct 20 (Tue) • Maha Ashtami' },
  { date: '2026-10-21', label: 'Oct 21 (Wed) • Navami' },
  { date: '2026-10-24', label: 'Oct 24 (Sat) • Grand Finale 🔥' },
  { date: '2026-10-25', label: 'Oct 25 (Sun) • Dussehra Raas 🔥' },
];

export function RegisterAdvancePage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { setUser } = useAppContext();
  const { isMobile } = useDeviceType();

  const [step, setStep] = useState(0); // 0: Date, 1: Profile & OTP, 2: Preferences, 3: Ticket, 4: Payment
  const [eventDate, setEventDate] = useState('2026-10-17');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [city, setCity] = useState('Ahmedabad');
  const [venue, setVenue] = useState('United Way Garba Grounds');
  const [gender, setGender] = useState('female');
  const [ageBand, setAgeBand] = useState('18-24');
  const [skillLevel, setSkillLevel] = useState('intermediate');
  const [allWomenToggle, setAllWomenToggle] = useState(false);
  const [captainOptIn, setCaptainOptIn] = useState(false);

  // Mandatory Ticket Photo for Advance
  const [ticketPhoto, setTicketPhoto] = useState(null);

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [registrationResponse, setRegistrationResponse] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const isPeak = PEAK_DATES.includes(eventDate);
  const price = isPeak ? 249 : 199;

  const validateProfile = () => {
    if (!name.trim()) {
      setError('Please enter your full name.');
      return false;
    }
    const cleanPhone = whatsapp.trim().replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return false;
    }
    if (!isPhoneVerified) {
      setError('Please verify your mobile number with OTP before continuing.');
      setShowOtpModal(true);
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmitAdvanceRegistration = async () => {
    if (!ticketPhoto) {
      setError('Advance pre-booking requires a photo of your festival ticket or pass.');
      return;
    }

    setLoading(true);
    setError(null);

    const cleanPhone = whatsapp.trim().replace(/\D/g, '').slice(-10);

    const payload = {
      name: name.trim(),
      whatsapp: cleanPhone,
      city,
      venue,
      gender,
      ageBand,
      skillLevel,
      allWomenToggle: Boolean(allWomenToggle),
      captainOptIn: Boolean(captainOptIn),
      ticketPhoto,
      eventDate,
    };

    try {
      const response = await apiPost('/advance-register', payload);
      setRegistrationResponse(response);
      setStep(4); // Move to Payment
    } catch (err) {
      setError(err.message || 'Advance registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentConfirmed = (paymentResult) => {
    const attendeeProfile = {
      name,
      whatsapp,
      registrationId: paymentResult.registrationId,
      eventDate,
      venue,
      city,
    };

    setUser(attendeeProfile);
    setConfirmedBooking({
      registrationId: paymentResult.registrationId,
      paymentId: paymentResult.paymentId,
      eventDate,
      venue,
      city,
      skillLevel,
    });
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: theme.maxWidths.phone,
        margin: '0 auto',
        padding: isMobile ? '20px 4vw 40px' : '36px 4vw 60px',
        boxSizing: 'border-box',
      }}
    >
      {/* Step Indicator */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <Badge color={theme.colors.gold} size="sm">
            💃 Advance Pre-Booking
          </Badge>
          <span style={{ fontFamily: theme.fonts.mono, fontSize: '11px', color: theme.colors.amber, fontWeight: 700 }}>
            {confirmedBooking ? 'CONFIRMED' : `STEP ${step + 1} OF 5`}
          </span>
        </div>
        {!confirmedBooking && (
          <div style={{ display: 'flex', gap: '6px' }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: '6px',
                  borderRadius: '3px',
                  background: i <= step ? theme.gradients.primary : '#3A3257',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {error && (
        <div style={{ marginBottom: '16px' }}>
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {/* STEP 0: Event Date Selection */}
      {!confirmedBooking && step === 0 && (
        <SectionCard>
          <h2 style={{ fontFamily: theme.fonts.heading, fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
            Select Festival Night
          </h2>
          <p style={{ fontSize: '12.5px', color: theme.colors.textMuted, marginBottom: '20px' }}>
            Reserve your Mandli circle spot in advance for peak Navratri nights across Gujarat.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {FESTIVAL_DATES.map((d) => {
              const isSelected = eventDate === d.date;
              const dateIsPeak = PEAK_DATES.includes(d.date);

              return (
                <div
                  key={d.date}
                  onClick={() => setEventDate(d.date)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: isSelected ? 'rgba(245, 179, 1, 0.15)' : 'rgba(255,255,255,0.03)',
                    border: isSelected ? `1px solid ${theme.colors.gold}` : theme.borders.subtle,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: theme.colors.textPrimary }}>
                      {d.label}
                    </div>
                    <div style={{ fontSize: '11px', color: theme.colors.textSecondary }}>
                      {dateIsPeak ? 'Peak Weekend Night • High Demand' : 'Standard Night'}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: theme.fonts.mono,
                      fontWeight: 700,
                      fontSize: '14px',
                      color: dateIsPeak ? theme.colors.pink : theme.colors.gold,
                    }}
                  >
                    ₹{dateIsPeak ? 249 : 199}
                  </span>
                </div>
              );
            })}
          </div>

          <PrimaryButton onClick={() => setStep(1)} style={{ width: '100%' }}>
            Proceed with {eventDate} (₹{price}) →
          </PrimaryButton>
        </SectionCard>
      )}

      {/* STEP 1: Attendee Profile & OTP */}
      {!confirmedBooking && step === 1 && (
        <SectionCard>
          <h2 style={{ fontFamily: theme.fonts.heading, fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
            Attendee Details
          </h2>
          <p style={{ fontSize: '12.5px', color: theme.colors.textMuted, marginBottom: '20px' }}>
            We'll notify you 48 hours before the event when your circle is finalized.
          </p>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: theme.colors.textLabel, marginBottom: '5px' }}>
              FULL NAME <span style={{ color: theme.colors.advanced }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rohan Mehta"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '11px 12px',
                borderRadius: '10px',
                border: theme.borders.default,
                background: theme.colors.surfaceElevated,
                color: theme.colors.textPrimary,
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: theme.colors.textLabel, marginBottom: '5px' }}>
              WHATSAPP NUMBER <span style={{ color: theme.colors.advanced }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                value={whatsapp}
                onChange={(e) => {
                  setWhatsapp(e.target.value.replace(/\D/g, ''));
                  setIsPhoneVerified(false);
                }}
                placeholder="10-digit mobile"
                style={{
                  flex: 1,
                  minWidth: 0,
                  boxSizing: 'border-box',
                  padding: '11px 12px',
                  borderRadius: '10px',
                  border: theme.borders.default,
                  background: theme.colors.surfaceElevated,
                  color: theme.colors.textPrimary,
                  fontFamily: theme.fonts.mono,
                  outline: 'none',
                }}
              />
              <GhostButton
                onClick={() => setShowOtpModal(true)}
                active={isPhoneVerified}
                style={{
                  padding: '11px 16px',
                  flexShrink: 0,
                  color: isPhoneVerified ? theme.colors.liveGreen : theme.colors.amber,
                  borderColor: isPhoneVerified ? theme.colors.liveGreen : theme.colors.amber,
                }}
              >
                {isPhoneVerified ? '✓ Verified' : 'Verify'}
              </GhostButton>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <GhostButton onClick={() => setStep(0)} style={{ flex: 1 }}>
              ← Back
            </GhostButton>
            <PrimaryButton
              onClick={() => {
                if (validateProfile()) setStep(2);
              }}
              style={{ flex: 2 }}
            >
              Continue →
            </PrimaryButton>
          </div>
        </SectionCard>
      )}

      {/* STEP 2: Venue & Preferences */}
      {!confirmedBooking && step === 2 && (
        <SectionCard>
          <h2 style={{ fontFamily: theme.fonts.heading, fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
            Venue & Preferences
          </h2>
          <p style={{ fontSize: '12.5px', color: theme.colors.textMuted, marginBottom: '20px' }}>
            Select your target ground and dance energy level.
          </p>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: theme.colors.textLabel, marginBottom: '5px' }}>
              FESTIVAL CITY
            </label>
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setVenue(VENUES_BY_CITY[e.target.value]?.[0] || '');
              }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '11px 12px',
                borderRadius: '10px',
                border: theme.borders.default,
                background: theme.colors.surfaceElevated,
                color: theme.colors.textPrimary,
                outline: 'none',
              }}
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: theme.colors.textLabel, marginBottom: '5px' }}>
              GROUND / VENUE
            </label>
            <select
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '11px 12px',
                borderRadius: '10px',
                border: theme.borders.default,
                background: theme.colors.surfaceElevated,
                color: theme.colors.textPrimary,
                outline: 'none',
              }}
            >
              {(VENUES_BY_CITY[city] || []).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Skill Level Selection */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: theme.colors.textLabel, marginBottom: '8px' }}>
              GARBA SKILL LEVEL
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {theme.levels.map((lvl) => {
                const isSelected = skillLevel === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setSkillLevel(lvl.id)}
                    aria-pressed={isSelected}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      width: '100%',
                      minHeight: '44px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: isSelected ? `${lvl.color}22` : 'rgba(255,255,255,0.03)',
                      border: isSelected ? `1px solid ${lvl.color}` : theme.borders.subtle,
                      color: theme.colors.textPrimary,
                      font: 'inherit',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span aria-hidden="true">{lvl.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' }}>{lvl.label}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: lvl.textColor, fontWeight: 700, textAlign: 'right', minWidth: 0 }}>
                      {lvl.tag}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '18px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: theme.colors.textLabel, marginBottom: '5px' }}>
                GENDER
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '11px 12px',
                  borderRadius: '10px',
                  border: theme.borders.default,
                  background: theme.colors.surfaceElevated,
                  color: theme.colors.textPrimary,
                  outline: 'none',
                }}
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: theme.colors.textLabel, marginBottom: '5px' }}>
                AGE BAND
              </label>
              <select
                value={ageBand}
                onChange={(e) => setAgeBand(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '11px 12px',
                  borderRadius: '10px',
                  border: theme.borders.default,
                  background: theme.colors.surfaceElevated,
                  color: theme.colors.textPrimary,
                  outline: 'none',
                }}
              >
                {AGE_BANDS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {gender === 'female' && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: allWomenToggle ? 'rgba(219, 39, 119, 0.15)' : 'rgba(255,255,255,0.02)',
                border: allWomenToggle ? theme.borders.pink : theme.borders.subtle,
                cursor: 'pointer',
                marginBottom: '14px',
              }}
            >
              <input
                type="checkbox"
                checked={allWomenToggle}
                onChange={(e) => setAllWomenToggle(e.target.checked)}
                style={{ accentColor: theme.colors.pink, width: '18px', height: '18px', flexShrink: 0 }}
              />
              <span style={{ fontSize: '12.5px' }}>🌸 Prefer <strong>All-Women Sakhi Circle</strong></span>
            </label>
          )}

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: captainOptIn ? 'rgba(245, 179, 1, 0.15)' : 'rgba(255,255,255,0.02)',
              border: captainOptIn ? theme.borders.gold : theme.borders.subtle,
              cursor: 'pointer',
              marginBottom: '20px',
            }}
          >
            <input
              type="checkbox"
              checked={captainOptIn}
              onChange={(e) => setCaptainOptIn(e.target.checked)}
              style={{ accentColor: theme.colors.gold, width: '18px', height: '18px', flexShrink: 0 }}
            />
            <span style={{ fontSize: '12.5px' }}>👑 Volunteer to be <strong>Circle Captain</strong></span>
          </label>

          <div style={{ display: 'flex', gap: '10px' }}>
            <GhostButton onClick={() => setStep(1)} style={{ flex: 1 }}>
              ← Back
            </GhostButton>
            <PrimaryButton onClick={() => setStep(3)} style={{ flex: 2 }}>
              Next: Ticket Pass →
            </PrimaryButton>
          </div>
        </SectionCard>
      )}

      {/* STEP 3: Mandatory Ticket Photo */}
      {!confirmedBooking && step === 3 && (
        <SectionCard>
          <h2 style={{ fontFamily: theme.fonts.heading, fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
            Upload Festival Ticket Proof
          </h2>
          <p style={{ fontSize: '12.5px', color: theme.colors.textMuted, marginBottom: '20px' }}>
            Advance bookings require a clear photo or screenshot of your booking pass to verify the event date and venue.
          </p>

          <TicketUploadStep
            ticketPhoto={ticketPhoto}
            selectedVenue={venue}
            requirePhoto={true}
            onChange={(res) => setTicketPhoto(res.ticketPhoto)}
          />

          <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            <GhostButton onClick={() => setStep(2)} style={{ flex: 1 }}>
              ← Back
            </GhostButton>
            <PrimaryButton
              onClick={handleSubmitAdvanceRegistration}
              disabled={loading || !ticketPhoto}
              style={{ flex: 2 }}
            >
              {loading ? <LoadingSpinner size={18} /> : `Proceed to Payment (₹${price}) →`}
            </PrimaryButton>
          </div>
        </SectionCard>
      )}

      {/* STEP 4: Razorpay Payment Checkout */}
      {!confirmedBooking && step === 4 && registrationResponse && (
        <SectionCard>
          <h2 style={{ fontFamily: theme.fonts.heading, fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
            Confirm Advance Circle Pass
          </h2>
          <p style={{ fontSize: '12.5px', color: theme.colors.textMuted, marginBottom: '16px' }}>
            Secure your spot in the matching pool for {eventDate}.
          </p>

          <PaymentStep
            registrationId={registrationResponse.registrationId}
            registrationData={{
              name,
              whatsapp,
              eventDate,
            }}
            onPaymentSuccess={handlePaymentConfirmed}
            onCancel={() => setStep(3)}
          />
        </SectionCard>
      )}

      {/* STEP 5: Advance Booking Confirmation */}
      {confirmedBooking && (
        <SectionCard style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
          <h2
            style={{
              fontFamily: theme.fonts.heading,
              fontSize: '24px',
              fontWeight: 700,
              color: theme.colors.textPrimary,
              marginBottom: '8px',
            }}
          >
            Advance Booking Confirmed!
          </h2>
          <p
            style={{
              fontSize: '13px',
              color: theme.colors.textMuted,
              maxWidth: '380px',
              margin: '0 auto 24px',
              lineHeight: 1.6,
            }}
          >
            You are queued in the matching pool for <strong>{confirmedBooking.eventDate}</strong> at{' '}
            <strong>{confirmedBooking.venue}</strong>.
          </p>

          <div
            style={{
              background: theme.colors.surfaceElevated,
              borderRadius: '12px',
              border: theme.borders.default,
              padding: '16px',
              textAlign: 'left',
              marginBottom: '24px',
              fontFamily: theme.fonts.mono,
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div>Booking ID: {confirmedBooking.registrationId}</div>
            <div>Payment Ref: {confirmedBooking.paymentId}</div>
            <div>Skill Level: {confirmedBooking.skillLevel}</div>
            <div style={{ color: theme.colors.liveGreen }}>Status: Confirmed in Advance Pool</div>
          </div>

          <p style={{ fontSize: '12px', color: theme.colors.amber, marginBottom: '24px' }}>
            🗓️ Circle announcements and chat links unlock 48 hours prior to the festival night. You can review your pass anytime via "Find My Circle".
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <PrimaryButton onClick={() => navigate('/find-circle')} style={{ width: '100%' }}>
              View in My Circles
            </PrimaryButton>
            <GhostButton onClick={() => navigate('/')} style={{ width: '100%' }}>
              Back to Home
            </GhostButton>
          </div>
        </SectionCard>
      )}

      {/* OTP Verification Modal */}
      <OtpVerificationModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        initialPhone={whatsapp}
        onVerified={({ whatsapp: verifiedPhone }) => {
          setWhatsapp(verifiedPhone);
          setIsPhoneVerified(true);
        }}
      />
    </div>
  );
}

export default RegisterAdvancePage;
