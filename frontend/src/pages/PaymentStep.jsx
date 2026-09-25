import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import PrimaryButton from '../components/common/PrimaryButton';
import GhostButton from '../components/common/GhostButton';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorBanner from '../components/common/ErrorBanner';
import { apiPost } from '../api/apiClient';

/**
 * Dynamically injects the official Razorpay checkout script if not already loaded.
 */
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * PaymentStep — SoloSaathi Circle
 *
 * Gated Razorpay Live-mode checkout integration.
 * Security Contract:
 * 1. Derives order through backend `create-order` endpoint.
 * 2. Opens official Razorpay modal.
 * 3. On Razorpay success, dispatches `verify-payment` HMAC signature check.
 * 4. NEVER renders a confirmed state based solely on client callback; waits for
 *    cryptographic backend verification response before triggering `onPaymentSuccess`.
 */
export function PaymentStep({
  registrationId,
  registrationData = {},
  onPaymentSuccess,
  onCancel,
}) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [orderData, setOrderData] = useState(null);

  // Initialize or fetch Razorpay order
  const initOrder = async () => {
    setLoading(true);
    setError(null);

    try {
      const order = await apiPost('/create-order', { registrationId });
      setOrderData(order);
      return order;
    } catch (err) {
      setError(err.message || 'Failed to initialize payment order. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Launch Razorpay Checkout Modal
  const launchCheckout = async () => {
    setError(null);
    let order = orderData;
    if (!order) {
      order = await initOrder();
    }
    if (!order) return;

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setError('Failed to load secure Razorpay gateway. Please check your internet connection.');
      return;
    }

    const options = {
      key: order.keyId,
      amount: order.amount,
      currency: order.currency || 'INR',
      name: 'SoloSaathi Circle',
      description: `Solo Garba Circle Pass (${registrationData.eventDate || 'Tonight'})`,
      order_id: order.orderId,
      prefill: {
        name: registrationData.name || '',
        contact: registrationData.whatsapp ? `+91${registrationData.whatsapp}` : '',
      },
      theme: {
        color: theme.colors.pink,
      },
      handler: async function (response) {
        // Razorpay client success callback — now verify signature with backend!
        await verifyPaymentSignature(response);
      },
      modal: {
        ondismiss: function () {
          // User closed the Razorpay modal
          console.log('[Razorpay Checkout closed by user]');
        },
      },
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setError(`Payment Failed: ${resp.error?.description || 'Transaction declined.'}`);
      });
      rzp.open();
    } catch (rzpErr) {
      setError('Unable to open checkout modal. Please ensure popups are permitted.');
    }
  };

  // Verify HMAC-SHA256 signature on backend
  const verifyPaymentSignature = async (rzpResponse) => {
    setVerifying(true);
    setError(null);

    try {
      const verificationResult = await apiPost('/verify-payment', {
        razorpay_order_id: rzpResponse.razorpay_order_id,
        razorpay_payment_id: rzpResponse.razorpay_payment_id,
        razorpay_signature: rzpResponse.razorpay_signature,
        registrationId,
      });

      if (verificationResult.paymentStatus === 'confirmed') {
        onPaymentSuccess(verificationResult);
      } else {
        setError('Payment received but verification pending. Please contact support.');
      }
    } catch (verifyErr) {
      setError(
        verifyErr.message ||
          'Payment verification could not be completed. If money was debited, your spot will be secured automatically via server webhook.'
      );
    } finally {
      setVerifying(false);
    }
  };

  // Auto-initialize order on mount
  useEffect(() => {
    if (registrationId) {
      initOrder();
    }
  }, [registrationId]);

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* Verifying Overlay */}
      {verifying && (
        <div
          style={{
            padding: '30px 20px',
            textAlign: 'center',
            background: theme.colors.surfaceElevated,
            borderRadius: '16px',
            border: theme.borders.gold,
          }}
        >
          <LoadingSpinner size={36} color={theme.colors.gold} label="Confirming payment with festival server..." />
          <p
            style={{
              fontSize: '12px',
              color: theme.colors.textMuted,
              marginTop: '14px',
              lineHeight: 1.5,
            }}
          >
            Validating cryptographic signature & securing your Circle spot...
          </p>
        </div>
      )}

      {!verifying && (
        <>
          {error && (
            <div style={{ marginBottom: '16px' }}>
              <ErrorBanner message={error} onDismiss={() => setError(null)} />
            </div>
          )}

          {/* Pricing Breakdown Card */}
          <div
            style={{
              background: theme.colors.surfaceElevated,
              borderRadius: '14px',
              border: theme.borders.default,
              padding: '18px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
              }}
            >
              <span style={{ fontSize: '13px', color: theme.colors.textMuted }}>Solo Circle Pass</span>
              <span
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: '16px',
                  fontWeight: 700,
                  color: theme.colors.textPrimary,
                }}
              >
                ₹{orderData ? orderData.priceInRupees || orderData.amount / 100 : '...'}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11.5px',
                color: theme.colors.textSecondary,
                borderTop: theme.borders.subtle,
                paddingTop: '8px',
              }}
            >
              <span>Platform fee & matching</span>
              <span style={{ color: theme.colors.liveGreen }}>FREE</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px dashed #4A3B6E',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: '14px', color: theme.colors.textPrimary }}>Total Amount</span>
              <span
                style={{
                  fontFamily: theme.fonts.mono,
                  fontWeight: 700,
                  fontSize: '20px',
                  color: theme.colors.amber,
                }}
              >
                ₹{orderData ? orderData.priceInRupees || orderData.amount / 100 : '...'}
              </span>
            </div>
          </div>

          {/* Razorpay Trust Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '11px',
              color: theme.colors.textPlaceholder,
              marginBottom: '18px',
            }}
          >
            <span>🔒 Secured by Razorpay Live</span>
            <span>•</span>
            <span>UPI / Cards / NetBanking</span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <PrimaryButton
              onClick={launchCheckout}
              disabled={loading || !orderData}
              style={{ width: '100%', padding: '14px' }}
            >
              {loading ? <LoadingSpinner size={18} /> : 'Pay & Enter Circle'}
            </PrimaryButton>

            {onCancel && (
              <GhostButton onClick={onCancel} style={{ width: '100%', padding: '10px' }}>
                Cancel
              </GhostButton>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default PaymentStep;
