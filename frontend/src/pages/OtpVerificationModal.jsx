import React, { useState, useEffect } from 'react';
import theme from '../styles/theme';
import PrimaryButton from '../components/common/PrimaryButton';
import GhostButton from '../components/common/GhostButton';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorBanner from '../components/common/ErrorBanner';
import { apiPost } from '../api/apiClient';

/**
 * OtpVerificationModal — SoloSaathi Circle
 *
 * Secure phone verification modal handling WhatsApp/SMS OTP dispatch & verification.
 * Enforces:
 * - 10-digit Indian phone format (/^[6-9]\d{9}$/)
 * - 30-second resend cooldown countdown
 * - Hard lockout detection (5 wrong attempts burns code permanently)
 * - Remaining attempts tracking (details.attemptsRemaining)
 */
export function OtpVerificationModal({
  isOpen,
  onClose,
  onVerified,
  initialPhone = '',
}) {
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'code'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [isHardBlocked, setIsHardBlocked] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Sync initial phone
  useEffect(() => {
    if (initialPhone) {
      setPhone(initialPhone.replace(/\D/g, '').slice(-10));
    }
  }, [initialPhone]);

  // Handle 30-second resend countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isOpen) return null;

  const cleanPhone = phone.trim().replace(/\D/g, '').slice(-10);
  const isPhoneValid = /^[6-9]\d{9}$/.test(cleanPhone);

  const handleSendOtp = async () => {
    if (!isPhoneValid) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    setLoading(true);
    setError(null);
    setErrorDetails(null);

    try {
      const response = await apiPost('/send-otp', { whatsapp: cleanPhone });
      setStep('code');
      setCooldown(response.cooldownSeconds || 30);
    } catch (err) {
      if (err.details && err.details.hardBlocked) {
        setIsHardBlocked(true);
      }
      if (err.details && err.details.cooldownRemainingSeconds) {
        setCooldown(err.details.cooldownRemainingSeconds);
      }
      setError(err.message || 'Failed to dispatch verification code. Please try again.');
      setErrorDetails(err.details);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    const cleanCode = code.trim().replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);
    setErrorDetails(null);

    try {
      const response = await apiPost('/verify-otp', {
        whatsapp: cleanPhone,
        code: cleanCode,
      });

      if (response.verified) {
        onVerified({
          whatsapp: cleanPhone,
          verified: true,
          ttlMinutes: response.verifiedTtlMinutes,
        });
        onClose();
      }
    } catch (err) {
      if (err.details && err.details.hardBlocked) {
        setIsHardBlocked(true);
      }
      setError(err.message || 'Incorrect verification code. Please try again.');
      setErrorDetails(err.details);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="otp-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(10, 8, 20, 0.78)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: 'linear-gradient(160deg, #2A2049, #1F1938)',
          borderRadius: '20px',
          border: theme.borders.default,
          boxShadow: '0 16px 40px -10px rgba(0,0,0,0.8)',
          padding: '28px 24px',
          position: 'relative',
          color: theme.colors.textPrimary,
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: theme.colors.textMuted,
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
          <h3
            id="otp-modal-title"
            style={{
              fontFamily: theme.fonts.heading,
              fontSize: '20px',
              fontWeight: 700,
              color: theme.colors.textPrimary,
              marginBottom: '4px',
            }}
          >
            {step === 'phone' ? 'Verify Mobile Number' : 'Enter 6-Digit Code'}
          </h3>
          <p style={{ fontSize: '12.5px', color: theme.colors.textMuted, lineHeight: 1.5 }}>
            {step === 'phone'
              ? 'We will send a 6-digit one-time code via WhatsApp (or SMS) to verify your ticket.'
              : `Code sent to +91 ${cleanPhone}. Valid for 10 minutes.`}
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div style={{ marginBottom: '16px' }}>
            <ErrorBanner
              message={error}
              details={
                errorDetails?.attemptsRemaining !== undefined
                  ? `Remaining tries: ${errorDetails.attemptsRemaining}`
                  : null
              }
              onDismiss={() => setError(null)}
            />
          </div>
        )}

        {/* Hard Block Notice */}
        {isHardBlocked && (
          <div
            style={{
              background: '#3A141A',
              border: '0.5px solid #F43F5E',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '12px',
              color: '#FFA1B2',
              lineHeight: 1.5,
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            <strong>⚠️ Security Lockout:</strong> This code is permanently blocked after 5 failed tries to protect attendees against ticket fraud. Please request a fresh OTP to proceed.
          </div>
        )}

        {/* Step 1: Phone Number Input */}
        {step === 'phone' && (
          <div>
            <label
              style={{
                display: 'block',
                fontFamily: theme.fonts.body,
                fontSize: '11px',
                fontWeight: 700,
                color: theme.colors.textLabel,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '6px',
              }}
            >
              WhatsApp Number <span style={{ color: theme.colors.advanced }}>*</span>
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: theme.colors.surfaceElevated,
                border: theme.borders.default,
                borderRadius: '10px',
                overflow: 'hidden',
                marginBottom: '20px',
              }}
            >
              <span
                style={{
                  padding: '11px 12px',
                  background: 'rgba(255,255,255,0.04)',
                  color: theme.colors.amber,
                  fontFamily: theme.fonts.mono,
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRight: theme.borders.subtle,
                }}
              >
                +91
              </span>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="9876543210"
                style={{
                  flex: 1,
                  padding: '11px 12px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: theme.colors.textPrimary,
                  fontFamily: theme.fonts.mono,
                  fontSize: '15px',
                  letterSpacing: '1px',
                }}
              />
            </div>

            <PrimaryButton
              onClick={handleSendOtp}
              disabled={loading || !isPhoneValid}
              style={{ width: '100%', padding: '13px' }}
            >
              {loading ? <LoadingSpinner size={18} /> : 'Send Verification OTP'}
            </PrimaryButton>
          </div>
        )}

        {/* Step 2: Code Verification */}
        {step === 'code' && (
          <div>
            <label
              style={{
                display: 'block',
                fontFamily: theme.fonts.body,
                fontSize: '11px',
                fontWeight: 700,
                color: theme.colors.textLabel,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '6px',
              }}
            >
              6-Digit Code <span style={{ color: theme.colors.advanced }}>*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              style={{
                width: '100%',
                padding: '12px',
                background: theme.colors.surfaceElevated,
                border: theme.borders.default,
                borderRadius: '10px',
                color: theme.colors.textPrimary,
                fontFamily: theme.fonts.mono,
                fontSize: '20px',
                textAlign: 'center',
                letterSpacing: '6px',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '16px',
              }}
            />

            <PrimaryButton
              onClick={handleVerifyOtp}
              disabled={loading || code.trim().length !== 6 || isHardBlocked}
              style={{ width: '100%', padding: '13px', marginBottom: '12px' }}
            >
              {loading ? <LoadingSpinner size={18} /> : 'Verify Code & Proceed'}
            </PrimaryButton>

            {/* Resend Action & Back */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                color: theme.colors.textMuted,
              }}
            >
              <button
                type="button"
                onClick={() => setStep('phone')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.colors.textMuted,
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                ← Change Number
              </button>

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading || cooldown > 0}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: cooldown > 0 ? theme.colors.textPlaceholder : theme.colors.amber,
                  cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  padding: '4px',
                }}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OtpVerificationModal;
