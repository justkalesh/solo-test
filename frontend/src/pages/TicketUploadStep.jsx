import React, { useState, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import GhostButton from '../components/common/GhostButton';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorBanner from '../components/common/ErrorBanner';
import { apiPost } from '../api/apiClient';

/**
 * Compresses an image file client-side using HTML5 Canvas
 * to prevent multi-megabyte payloads over mobile connections.
 */
async function compressImageFile(file, maxWidth = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to dataURL (base64)
        const base64 = canvas.toDataURL('image/jpeg', quality);
        resolve(base64);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * TicketUploadStep — SoloSaathi Circle
 *
 * Festival pass proof upload component:
 * - Direct image upload / phone camera capture
 * - Client-side image compression
 * - Optional pre-check invoking Anthropic Claude Vision (`/verify-ticket`)
 * - Non-blocking venue mismatch alerts
 * - Serial number fallback for walk-up Live registration
 */
export function TicketUploadStep({
  ticketPhoto,
  ticketSerial,
  selectedVenue = '',
  requirePhoto = false,
  onChange,
}) {
  const theme = useTheme();
  const [mode, setMode] = useState(requirePhoto || ticketPhoto ? 'photo' : 'serial');
  const [loadingOcr, setLoadingOcr] = useState(false);
  const [ocrData, setOcrData] = useState(null);
  const [mismatchWarning, setMismatchWarning] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoadingOcr(true);

    try {
      // 1. Client-side canvas compression
      const base64Data = await compressImageFile(file);

      // 2. Pre-verify ticket via Anthropic Claude Vision
      let ocrResult = null;
      let warning = null;
      try {
        const response = await apiPost('/verify-ticket', {
          ticketPhoto: base64Data,
          selectedVenue,
        });
        ocrResult = response;
        warning = response.mismatchWarning || null;
        setOcrData(response);
        setMismatchWarning(warning);
      } catch (ocrErr) {
        console.warn('Non-fatal OCR warning:', ocrErr.message);
      }

      onChange({
        ticketPhoto: base64Data,
        ticketSerial: '',
        ocrResult,
        mismatchWarning: warning,
      });
    } catch (compressErr) {
      setError('Failed to process ticket image. Please try a different photo.');
    } finally {
      setLoadingOcr(false);
    }
  };

  const handleSerialChange = (val) => {
    setOcrData(null);
    setMismatchWarning(null);
    onChange({
      ticketPhoto: null,
      ticketSerial: val,
      ocrResult: null,
      mismatchWarning: null,
    });
  };

  const handleRemovePhoto = () => {
    setOcrData(null);
    setMismatchWarning(null);
    onChange({
      ticketPhoto: null,
      ticketSerial: '',
      ocrResult: null,
      mismatchWarning: null,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* Mode Selector (Only available if photo is not mandatory) */}
      {!requirePhoto && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '16px',
            background: 'rgba(255,255,255,0.04)',
            padding: '4px',
            borderRadius: '10px',
          }}
        >
          <button
            type="button"
            onClick={() => setMode('photo')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: theme.fonts.body,
              fontSize: '12px',
              fontWeight: mode === 'photo' ? 700 : 500,
              background: mode === 'photo' ? theme.colors.surfaceElevated : 'transparent',
              color: mode === 'photo' ? theme.colors.textPrimary : theme.colors.textMuted,
            }}
          >
            📸 Upload Pass Photo
          </button>
          <button
            type="button"
            onClick={() => setMode('serial')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: theme.fonts.body,
              fontSize: '12px',
              fontWeight: mode === 'serial' ? 700 : 500,
              background: mode === 'serial' ? theme.colors.surfaceElevated : 'transparent',
              color: mode === 'serial' ? theme.colors.textPrimary : theme.colors.textMuted,
            }}
          >
            🔢 Enter Pass Serial
          </button>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: '14px' }}>
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {/* Mode A: Photo Upload */}
      {mode === 'photo' && (
        <div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {!ticketPhoto ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '1.5px dashed #4A3B6E',
                borderRadius: '14px',
                padding: '28px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(36, 29, 61, 0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              {loadingOcr ? (
                <div style={{ padding: '10px 0' }}>
                  <LoadingSpinner size={28} label="Verifying ticket with Claude Vision..." />
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎟️</div>
                  <div
                    style={{
                      fontFamily: theme.fonts.heading,
                      fontSize: '15px',
                      fontWeight: 700,
                      color: theme.colors.textPrimary,
                      marginBottom: '4px',
                    }}
                  >
                    Tap to Capture or Upload Ticket
                  </div>
                  <p style={{ fontSize: '12px', color: theme.colors.textMuted, margin: 0 }}>
                    Physical pass, digital wristband, or booking screenshot (JPG, PNG)
                  </p>
                </>
              )}
            </div>
          ) : (
            <div
              style={{
                position: 'relative',
                borderRadius: '14px',
                overflow: 'hidden',
                border: theme.borders.default,
                background: theme.colors.surfaceElevated,
                padding: '12px',
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <img
                  src={ticketPhoto}
                  alt="Uploaded Ticket Preview"
                  style={{
                    width: '64px',
                    height: '64px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '0.5px solid rgba(255,255,255,0.1)',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: theme.colors.liveGreen,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>✓</span> Ticket Attached
                  </div>
                  {ocrData?.pass_id && (
                    <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.mono }}>
                      Pass ID: {ocrData.pass_id}
                    </div>
                  )}
                  {ocrData?.venue && (
                    <div style={{ fontSize: '11px', color: theme.colors.textMuted }}>
                      Venue: {ocrData.venue}
                    </div>
                  )}
                </div>
                <GhostButton
                  onClick={handleRemovePhoto}
                  style={{ padding: '6px 10px', fontSize: '11px', color: '#FFA1B2' }}
                >
                  Change
                </GhostButton>
              </div>
            </div>
          )}

          {/* AI Mismatch Warning Notice (Non-Blocking) */}
          {mismatchWarning && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(255, 176, 32, 0.12)',
                border: '0.5px solid rgba(255, 176, 32, 0.4)',
                color: theme.colors.amber,
                fontSize: '12px',
                lineHeight: 1.45,
              }}
            >
              <strong>⚠️ Ground Location Notice:</strong> {mismatchWarning}
            </div>
          )}
        </div>
      )}

      {/* Mode B: Serial Input */}
      {mode === 'serial' && !requirePhoto && (
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
            Ticket Pass Serial Number <span style={{ color: theme.colors.advanced }}>*</span>
          </label>
          <input
            type="text"
            value={ticketSerial || ''}
            onChange={(e) => handleSerialChange(e.target.value)}
            placeholder="e.g. UWG-2026-88412"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '11px 12px',
              borderRadius: '10px',
              border: theme.borders.default,
              background: theme.colors.surfaceElevated,
              color: theme.colors.textPrimary,
              fontFamily: theme.fonts.mono,
              fontSize: '14px',
              outline: 'none',
              letterSpacing: '0.5px',
            }}
          />
          <span style={{ display: 'block', fontSize: '11px', color: theme.colors.textPlaceholder, marginTop: '4px' }}>
            Printed on your physical festival badge or booking confirmation SMS
          </span>
        </div>
      )}
    </div>
  );
}

export default TicketUploadStep;
