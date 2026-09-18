import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import theme from '../styles/theme';
import SectionCard from '../components/common/SectionCard';
import PrimaryButton from '../components/common/PrimaryButton';
import GhostButton from '../components/common/GhostButton';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorBanner from '../components/common/ErrorBanner';
import SwitchCircleControl from '../components/circle/SwitchCircleControl';
import { postRequest, getRequest } from '../api/apiClient';

/**
 * Calculates current time in Indian Standard Time (IST, UTC+5:30)
 */
function getIstTime() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5.5 * 3600000);
}

/**
 * Quick tap suggestion chips to eliminate typing in noisy Garba grounds
 */
const QUICK_CHIPS = [
  '📍 I am at the meeting anchor!',
  '🪩 Holding up my beacon light!',
  '💃 Stepping into the Garba ring!',
  '🥤 Getting water at the stalls',
  '📸 Circle group photo time!',
  '👋 Looking for our Captain!',
];

const SOS_WHATSAPP = '911234567890';

export default function CircleChatPage() {
  const { circleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve state or stored info
  const stateData = location.state || {};
  const [circle, setCircle] = useState(stateData.circle || null);
  const [registrationId, setRegistrationId] = useState(
    stateData.registrationId || sessionStorage.getItem('user_registration_id') || ''
  );
  const [userName, setUserName] = useState(
    stateData.userName || sessionStorage.getItem('user_name') || 'Solo Dancer'
  );

  // Chat messages
  const [messages, setMessages] = useState([
    {
      id: 'm-sys-1',
      sender: 'SoloSaathi Anchor',
      text: '🪩 Welcome to your official Navratri Circle Chat! Spot each other using the Color Beacon at the meeting point.',
      timestamp: '6:35 PM',
      isSystem: true,
    },
    {
      id: 'm-sys-2',
      sender: 'Circle Captain',
      text: 'Hey everyone! Excited to dance tonight. Head over to our anchor spot when you arrive!',
      timestamp: '6:36 PM',
      isCaptain: true,
    },
  ]);

  const [inputMsg, setInputMsg] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Modals for actions
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showGrowModal, setShowGrowModal] = useState(false);
  const [growSpots, setGrowSpots] = useState(5);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [newCaptainId, setNewCaptainId] = useState('');
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  // Time & Chat Closing countdown state
  const [chatClosingWarning, setChatClosingWarning] = useState(null);
  const [chatIsClosed, setChatIsClosed] = useState(false);

  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check 1:00 AM IST Auto-close schedule
  useEffect(() => {
    const checkChatSchedule = () => {
      const ist = getIstTime();
      const minutes = ist.getHours() * 60 + ist.getMinutes();

      // Chat closes between 1:00 AM (60 min) and 6:30 PM (1110 min)
      if (minutes >= 60 && minutes < 1110) {
        setChatIsClosed(true);
        setChatClosingWarning(
          '🌙 Tonight’s Garba has concluded! Circle chat auto-closed at 1:00 AM IST. See you tomorrow!'
        );
      } else if (minutes >= 15 && minutes < 60) {
        // Warning between 12:15 AM and 1:00 AM (minutes 15 to 59 past midnight)
        setChatIsClosed(false);
        const remaining = 60 - minutes;
        setChatClosingWarning(
          `⚠️ Notice: Group chat auto-closes at 1:00 AM IST (${remaining} min left) per festival safety guidelines.`
        );
      } else {
        setChatIsClosed(false);
        setChatClosingWarning(null);
      }
    };

    checkChatSchedule();
    const interval = setInterval(checkChatSchedule, 30000);
    return () => clearInterval(interval);
  }, []);

  // Determine if current user is Captain
  const isCaptain = Boolean(
    circle?.captainId && circle.captainId === registrationId
  );

  const handleSend = (textToSend) => {
    const text = (textToSend || inputMsg).trim();
    if (!text || chatIsClosed) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg = {
      id: `m-${Date.now()}`,
      sender: userName,
      text,
      timestamp: timeStr,
      isSelf: true,
      isCaptain,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMsg('');
  };

  // Circle Action Handler: 'grow' | 'lock' | 'leave' | 'transferCaptain'
  const handleCircleAction = async (action, payload = {}) => {
    if (!circleId) return;
    setLoadingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await postRequest('circle-actions', {
        action,
        circleId,
        registrationId,
        ...payload,
      });

      if (action === 'grow') {
        setActionSuccess(res.message || `Circle expanded by ${payload.spots} spots!`);
        setShowGrowModal(false);
        if (circle) {
          setCircle({ ...circle, isLocked: false, maxSpots: res.maxSpots });
        }
      } else if (action === 'lock') {
        setActionSuccess(res.message || 'Circle is now locked to walk-ins.');
        if (circle) {
          setCircle({ ...circle, isLocked: true });
        }
      } else if (action === 'leave') {
        sessionStorage.removeItem('user_circle_id');
        navigate('/find-circle', {
          state: { message: 'You have left the circle. You can find or rejoin another group.' },
        });
        return;
      } else if (action === 'transferCaptain') {
        setActionSuccess(res.message || 'Captain role transferred successfully.');
        setShowTransferModal(false);
        if (circle) {
          setCircle({
            ...circle,
            captainId: res.newCaptainId,
            captainName: res.newCaptainName,
          });
        }
      }

      setShowActionsModal(false);
    } catch (err) {
      setActionError(err.message || 'Action failed. Please try again.');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '560px',
        margin: '0 auto',
        padding: '16px 16px 80px',
        minHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '12px',
          borderBottom: `1px solid ${theme.colors.borderLight}`,
          marginBottom: '12px',
        }}
      >
        <Link
          to={`/circle/${circleId || ''}`}
          state={{ circle, registrationId, userName }}
          style={{ textDecoration: 'none', color: theme.colors.textMuted, fontSize: '13px' }}
        >
          ← Beacon & Roster
        </Link>
        <div style={{ textAlign: 'center' }}>
          <h2
            style={{
              fontFamily: theme.fonts.heading,
              fontSize: '17px',
              color: theme.colors.textPrimary,
              margin: 0,
            }}
          >
            {circle?.name || `Circle #${circleId ? circleId.slice(-4) : 'Live'}`}
          </h2>
          <div style={{ fontSize: '11px', color: theme.colors.textMuted }}>
            {circle?.meetingPoint || 'Ground Meeting Point'}
          </div>
        </div>
        <button
          id="btn-circle-actions-toggle"
          onClick={() => setShowActionsModal(true)}
          style={{
            background: 'transparent',
            border: `1px solid ${theme.colors.borderLight}`,
            borderRadius: '8px',
            color: theme.colors.gold,
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          ⚙️ Tools
        </button>
      </div>

      {/* 1:00 AM IST Chat Closing Banner */}
      {chatClosingWarning && (
        <div
          style={{
            background: chatIsClosed ? '#7F1D1D33' : '#F59E0B22',
            border: `1px solid ${chatIsClosed ? '#EF4444' : theme.colors.gold}`,
            borderRadius: '8px',
            padding: '8px 12px',
            marginBottom: '10px',
            fontSize: '12px',
            color: chatIsClosed ? '#FCA5A5' : theme.colors.gold,
            textAlign: 'center',
          }}
        >
          {chatClosingWarning}
        </div>
      )}

      {/* Status Banners */}
      {actionError && <ErrorBanner message={actionError} style={{ marginBottom: '10px' }} />}
      {actionSuccess && (
        <div
          style={{
            background: '#10B98122',
            border: '1px solid #10B981',
            borderRadius: '8px',
            padding: '8px 12px',
            marginBottom: '10px',
            fontSize: '12px',
            color: '#10B981',
            textAlign: 'center',
          }}
        >
          ✓ {actionSuccess}
        </div>
      )}

      {/* SOS Alert Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <a
          href={`https://wa.me/${SOS_WHATSAPP}?text=SOS%20Emergency%20at%20Venue%20Ground%20-%20Circle%20${circleId || 'Active'}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            textDecoration: 'none',
            fontSize: '11px',
            color: '#F87171',
            background: '#450A0A',
            border: '1px solid #B91C1C',
            borderRadius: '6px',
            padding: '4px 8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 600,
          }}
        >
          🚨 Venue SOS Assistance
        </a>
      </div>

      {/* Chat Messages Feed */}
      <SectionCard
        style={{
          flex: 1,
          minHeight: '380px',
          maxHeight: '480px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          padding: '14px',
          marginBottom: '10px',
        }}
      >
        {messages.map((m) => {
          if (m.isSystem) {
            return (
              <div
                key={m.id}
                style={{
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px dashed ${theme.colors.borderLight}`,
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '11px',
                  color: theme.colors.textMuted,
                  lineHeight: 1.4,
                  margin: '4px 0',
                }}
              >
                {m.text}
              </div>
            );
          }

          const isMe = m.isSelf;
          return (
            <div
              key={m.id}
              style={{
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                maxWidth: '82%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  color: m.isCaptain ? theme.colors.gold : theme.colors.textMuted,
                  marginBottom: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {m.sender}
                {m.isCaptain && <span style={{ fontSize: '9px' }}>👑 Captain</span>}
              </div>
              <div
                style={{
                  background: isMe
                    ? `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`
                    : theme.colors.cardBackground,
                  color: theme.colors.textPrimary,
                  border: isMe ? 'none' : `1px solid ${theme.colors.borderLight}`,
                  borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  padding: '9px 13px',
                  fontSize: '13px',
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                }}
              >
                {m.text}
              </div>
              <div style={{ fontSize: '9px', color: theme.colors.textMuted, marginTop: '2px' }}>
                {m.timestamp}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </SectionCard>

      {/* Quick Suggestion Chips */}
      {!chatIsClosed && (
        <div
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '8px',
            marginBottom: '8px',
          }}
        >
          {QUICK_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              style={{
                flexShrink: 0,
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${theme.colors.borderLight}`,
                borderRadius: '16px',
                color: theme.colors.textSecondary,
                padding: '5px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Message Input Box */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          id="input-circle-chat-text"
          type="text"
          placeholder={chatIsClosed ? 'Chat is closed for tonight' : 'Type a message to your circle...'}
          value={inputMsg}
          disabled={chatIsClosed}
          onChange={(e) => setInputMsg(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${theme.colors.borderLight}`,
            borderRadius: '10px',
            padding: '10px 14px',
            color: theme.colors.textPrimary,
            fontSize: '13px',
            outline: 'none',
          }}
        />
        <PrimaryButton
          id="btn-send-circle-chat"
          disabled={!inputMsg.trim() || chatIsClosed}
          onClick={() => handleSend()}
          style={{ padding: '10px 18px', fontSize: '13px' }}
        >
          Send
        </PrimaryButton>
      </div>

      {/* Circle Tools / Actions Modal */}
      {showActionsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <SectionCard
            style={{
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: theme.colors.textPrimary, fontSize: '17px' }}>
                Circle Management Tools
              </h3>
              <button
                onClick={() => setShowActionsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.colors.textMuted,
                  fontSize: '18px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {isCaptain && (
              <div
                style={{
                  background: 'rgba(227,165,66,0.08)',
                  border: `1px solid ${theme.colors.gold}`,
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '12px',
                  color: theme.colors.gold,
                }}
              >
                👑 <strong>Circle Captain Controls</strong>: You lead this circle!
              </div>
            )}

            {/* Captain Actions: Grow & Lock */}
            {isCaptain && (
              <>
                <GhostButton
                  id="btn-action-grow"
                  onClick={() => setShowGrowModal(true)}
                  style={{ width: '100%', textAlign: 'left', padding: '10px' }}
                >
                  🌱 Expand Circle (+Spots & Unlock)
                </GhostButton>

                <GhostButton
                  id="btn-action-lock"
                  onClick={() => handleCircleAction('lock')}
                  style={{ width: '100%', textAlign: 'left', padding: '10px' }}
                >
                  🔒 Lock Circle (Prevent new walk-ins)
                </GhostButton>

                <GhostButton
                  id="btn-action-transfer"
                  onClick={() => setShowTransferModal(true)}
                  style={{ width: '100%', textAlign: 'left', padding: '10px' }}
                >
                  👑 Transfer Captain Role
                </GhostButton>
              </>
            )}

            {/* General Member Actions: Switch Circle & Leave */}
            <GhostButton
              id="btn-action-switch-circle"
              onClick={() => {
                setShowSwitchModal(true);
                setShowActionsModal(false);
              }}
              style={{ width: '100%', textAlign: 'left', padding: '10px', color: theme.colors.cyan }}
            >
              🔄 Switch to Another Circle
            </GhostButton>

            <GhostButton
              id="btn-action-leave-circle"
              onClick={() => {
                if (window.confirm('Are you sure you want to leave this circle?')) {
                  handleCircleAction('leave');
                }
              }}
              style={{ width: '100%', textAlign: 'left', padding: '10px', color: '#F87171' }}
            >
              🚪 Leave Circle
            </GhostButton>

            <div style={{ marginTop: '8px', textAlign: 'right' }}>
              <GhostButton onClick={() => setShowActionsModal(false)}>Close</GhostButton>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Grow Modal */}
      {showGrowModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
        >
          <SectionCard style={{ maxWidth: '400px', width: '100%', padding: '24px' }}>
            <h3 style={{ margin: '0 0 10px', color: theme.colors.textPrimary, fontSize: '16px' }}>
              Grow Circle
            </h3>
            <p style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '14px' }}>
              Add between 1 and 20 spots to your circle. This automatically unlocks your group to
              new solo dancers.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <input
                id="input-grow-spots"
                type="number"
                min="1"
                max="20"
                value={growSpots}
                onChange={(e) => setGrowSpots(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                style={{
                  width: '80px',
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${theme.colors.borderLight}`,
                  borderRadius: '8px',
                  padding: '8px',
                  color: theme.colors.textPrimary,
                  fontSize: '15px',
                  textAlign: 'center',
                }}
              />
              <span style={{ fontSize: '13px', color: theme.colors.textMuted }}>additional spots</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <GhostButton onClick={() => setShowGrowModal(false)}>Cancel</GhostButton>
              <PrimaryButton
                id="btn-confirm-grow"
                loading={loadingAction}
                onClick={() => handleCircleAction('grow', { spots: growSpots })}
              >
                Expand Circle
              </PrimaryButton>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Transfer Captain Modal */}
      {showTransferModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
        >
          <SectionCard style={{ maxWidth: '420px', width: '100%', padding: '24px' }}>
            <h3 style={{ margin: '0 0 10px', color: theme.colors.textPrimary, fontSize: '16px' }}>
              Transfer Captain Role
            </h3>
            <p style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '14px' }}>
              Select a member to transfer your Captain responsibilities:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {(circle?.members || [])
                .filter((m) => m.registrationId !== registrationId)
                .map((m) => (
                  <label
                    key={m.registrationId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="captainChoice"
                      value={m.registrationId}
                      checked={newCaptainId === m.registrationId}
                      onChange={() => setNewCaptainId(m.registrationId)}
                    />
                    <span style={{ fontSize: '13px', color: theme.colors.textPrimary }}>
                      {m.name} ({m.gender}, {m.skillLevel})
                    </span>
                  </label>
                ))}
              {(!circle?.members || circle.members.length <= 1) && (
                <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
                  No other members currently in roster to transfer to.
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <GhostButton onClick={() => setShowTransferModal(false)}>Cancel</GhostButton>
              <PrimaryButton
                id="btn-confirm-transfer"
                disabled={!newCaptainId}
                loading={loadingAction}
                onClick={() =>
                  handleCircleAction('transferCaptain', {
                    currentCaptainId: registrationId,
                    newCaptainId,
                  })
                }
              >
                Transfer Leadership
              </PrimaryButton>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Switch Circle Modal with SwitchCircleControl */}
      {showSwitchModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
        >
          <SectionCard style={{ maxWidth: '460px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, color: theme.colors.textPrimary, fontSize: '17px' }}>
                Switch Circle
              </h3>
              <button
                onClick={() => setShowSwitchModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.colors.textMuted,
                  fontSize: '18px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <SwitchCircleControl
              circleId={circleId}
              registrationId={registrationId}
              onSwitchSuccess={(res) => {
                setShowSwitchModal(false);
                navigate(`/circle/${res.targetCircleId}`, {
                  state: { message: 'Switched to new circle successfully!' },
                });
              }}
            />

            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <GhostButton onClick={() => setShowSwitchModal(false)}>Close</GhostButton>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
