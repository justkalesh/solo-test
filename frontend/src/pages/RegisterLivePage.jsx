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

export function RegisterLivePage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { setUser, setActiveCircle } = useAppContext();
  const { isMobile } = useDeviceType();

  // Form State
  const [step, setStep] = useState(0); // 0: Profile & OTP, 1: Preferences, 2: Ticket, 3: Payment
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

  // Ticket Proof
  const [ticketPhoto, setTicketPhoto] = useState(null);
  const [ticketSerial, setTicketSerial] = useState('');

  // Modals & Async States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [registrationResponse, setRegistrationResponse] = useState(null);

  // Validation
  const validateStep0 = () => {
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

  const validateStep1 = () => {
    if (!city || !venue) {
      setError('Please select a festival city and venue ground.');
      return false;
    }
    if (!skillLevel) {
      setError('Please select your preferred dance rhythm.');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = () => {
    if (!ticketPhoto && !ticketSerial.trim()) {
      setError('Please upload your ticket photo or enter pass serial number.');
      return false;
    }
    setError(null);
    return true;
  };

  // Submit Draft Registration to Netlify backend
  const handleSubmitRegistration = async () => {
    if (!validateStep2()) return;

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
      ticketSerial: ticketSerial ? ticketSerial.trim() : null,
      ticketPhoto: ticketPhoto || null,
    };

    try {
      const response = await apiPost('/register', payload);
      setRegistrationResponse(response);
      setStep(3); // Move to Payment Step
    } catch (err) {
      setError(err.message || 'Live registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentConfirmed = (paymentResult) => {
    const circle = paymentResult.matching?.circle || null;

    const attendeeProfile = {
      name,
      whatsapp,
      registrationId: paymentResult.registrationId,
      circleId: circle?.circleId || null,
    };

    setUser(attendeeProfile);
    if (circle) {
      setActiveCircle(circle);
      navigate(`/circle/${circle.circleId}`);
    } else {
      // Paid but not placed yet (e.g. the webhook got there first): Find My Circle shows it
      navigate('/find-circle');
    }
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
      {/* Step Indicator Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <Badge color={theme.colors.liveGreen} size="sm">
            ● Live Walk-Up
          </Badge>
          <span style={{ fontFamily: theme.fonts.mono, fontSize: '11px', color: theme.colors.amberText, fontWeight: 700 }}>
            STEP {step + 1} OF 4
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0, 1, 2, 3].map((i) => (
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
      </div>

      {error && (
        <div style={{ marginBottom: '16px' }}>
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {/* STEP 0: Attendee Profile & OTP */}
      {step === 0 && (
        <SectionCard>
          <h2 style={{ fontFamily: theme.fonts.heading, fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
            Dancer Profile
          </h2>
          <p style={{ fontSize: '12.5px', color: theme.colors.textMuted, marginBottom: '20px' }}>
            Your name and WhatsApp number are required to receive circle matching updates and meeting point beacons.
          </p>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: theme.colors.textLabel, marginBottom: '5px' }}>
              FULL NAME <span style={{ color: theme.colors.advanced }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Shah"
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
                placeholder="10-digit number"
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
                  color: isPhoneVerified ? theme.colors.liveGreenText : theme.colors.amberText,
                  borderColor: isPhoneVerified ? theme.colors.liveGreen : theme.colors.amber,
                }}
              >
                {isPhoneVerified ? '✓ Verified' : 'Verify'}
              </GhostButton>
            </div>
          </div>

          <PrimaryButton
            onClick={() => {
              if (validateStep0()) setStep(1);
            }}
            style={{ width: '100%' }}
          >
            Continue to Preferences →
          </PrimaryButton>
        </SectionCard>
      )}

      {/* STEP 1: Venue & Dance Rhythm */}
      {step === 1 && (
        <SectionCard>
          <h2 style={{ fontFamily: theme.fonts.heading, fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
            Ground & Dance Style
          </h2>
          <p style={{ fontSize: '12.5px', color: theme.colors.textMuted, marginBottom: '20px' }}>
            Choose where you are dancing and your preferred rhythm so our engine can group you accurately.
          </p>

          {/* City */}
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

          {/* Venue */}
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

          {/* Gender & Age */}
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

          {/* All-Women Toggle (Sakhi Circle) */}
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
              <span style={{ fontSize: '12.5px', color: theme.colors.textPrimary }}>
                🌸 Prefer <strong>All-Women Sakhi Circle</strong>
              </span>
            </label>
          )}

          {/* Captain Volunteer Opt-In */}
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
            <span style={{ fontSize: '12.5px', color: theme.colors.textPrimary }}>
              👑 Volunteer to be <strong>Circle Captain</strong> (Start first round)
            </span>
          </label>

          <div style={{ display: 'flex', gap: '10px' }}>
            <GhostButton onClick={() => setStep(0)} style={{ flex: 1 }}>
              ← Back
            </GhostButton>
            <PrimaryButton
              onClick={() => {
                if (validateStep1()) setStep(2);
              }}
              style={{ flex: 2 }}
            >
              Next: Ticket Proof →
            </PrimaryButton>
          </div>
        </SectionCard>
      )}

      {/* STEP 2: Ticket Verification */}
      {step === 2 && (
        <SectionCard>
          <h2 style={{ fontFamily: theme.fonts.heading, fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
            Festival Ticket Proof
          </h2>
          <p style={{ fontSize: '12.5px', color: theme.colors.textMuted, marginBottom: '20px' }}>
            SoloSaathi is strictly for verified attendees. Upload a pass photo or enter your ticket serial code.
          </p>

          <TicketUploadStep
            ticketPhoto={ticketPhoto}
            ticketSerial={ticketSerial}
            selectedVenue={venue}
            requirePhoto={false}
            onChange={(res) => {
              setTicketPhoto(res.ticketPhoto);
              setTicketSerial(res.ticketSerial);
            }}
          />

          <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            <GhostButton onClick={() => setStep(1)} style={{ flex: 1 }}>
              ← Back
            </GhostButton>
            <PrimaryButton
              onClick={handleSubmitRegistration}
              disabled={loading || (!ticketPhoto && !ticketSerial.trim())}
              style={{ flex: 2 }}
            >
              {loading ? <LoadingSpinner size={18} /> : 'Review & Pay →'}
            </PrimaryButton>
          </div>
        </SectionCard>
      )}

      {/* STEP 3: Razorpay Payment Integration */}
      {step === 3 && registrationResponse && (
        <SectionCard>
          <h2 style={{ fontFamily: theme.fonts.heading, fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
            Complete Registration Pass
          </h2>
          <p style={{ fontSize: '12.5px', color: theme.colors.textMuted, marginBottom: '16px' }}>
            Confirm your circle pass to be instantly placed into your live festival circle.
          </p>

          <PaymentStep
            registrationId={registrationResponse.registrationId}
            registrationData={{
              name,
              whatsapp,
              eventDate: registrationResponse.eventDate,
            }}
            onPaymentSuccess={handlePaymentConfirmed}
            onCancel={() => setStep(2)}
          />
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

export default RegisterLivePage;
