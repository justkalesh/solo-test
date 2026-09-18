import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import theme from '../styles/theme';
import { LogoFull, LogoMark } from '../assets/logo';
import { PrimaryButton } from '../components/common/PrimaryButton';
import { GhostButton } from '../components/common/GhostButton';
import { Badge } from '../components/common/Badge';
import { SectionCard } from '../components/common/SectionCard';
import {
  DiyaSticker,
  DandiyaSticksSticker,
  MarigoldGarlandSticker,
  DholakSticker,
  MandalaSparkSticker,
} from '../components/effects/FestiveStickers';
import { useDeviceType } from '../hooks/useDeviceType';

/**
 * HomePage — SoloSaathi Circle Landing Page
 *
 * "The soul of the website."
 * Encapsulates the core emotional proposition: "You came to dance. Not to stand alone."
 * Built strictly mobile-first with desktop enhancements, GPU-accelerated styling,
 * exact design system tokens, and zero layout thrashing.
 */
export function HomePage() {
  const navigate = useNavigate();
  const { isMobile, isDesktop } = useDeviceType();
  const [activeLevelPreview, setActiveLevelPreview] = useState('intermediate');
  const [toastMessage, setToastMessage] = useState(null);

  const showPhase2Notice = (featureName, route) => {
    setToastMessage(`${featureName} is launching in Phase 2! Navigating to ${route}...`);
    setTimeout(() => {
      navigate(route);
    }, 900);
  };

  return (
    <div
      style={{
        width: '100%',
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflowX: 'hidden',
      }}
    >
      {/* Interactive Phase 2 Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            background: 'linear-gradient(90deg, #F5B301, #DB2777)',
            color: '#1B1730',
            fontFamily: theme.fonts.heading,
            fontWeight: 700,
            fontSize: '14px',
            padding: '10px 20px',
            borderRadius: '999px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'floatGentle 2s ease-in-out infinite',
          }}
        >
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. HERO SECTION                                                          */}
      {/* ========================================================================= */}
      <section
        style={{
          width: '100%',
          maxWidth: isDesktop ? theme.maxWidths.desktop : theme.maxWidths.phone,
          padding: isMobile ? '24px 5vw 40px' : '44px 4vw 60px',
          margin: '0 auto',
          textAlign: 'center',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
        aria-label="Hero Section"
      >
        {/* Subtle Decorative Marigold Garland at Hero Top */}
        <div
          style={{
            position: 'absolute',
            top: isMobile ? '-10px' : '0px',
            right: isMobile ? '2%' : '8%',
            opacity: 0.85,
            pointerEvents: 'none',
          }}
        >
          <MarigoldGarlandSticker size={isMobile ? 64 : 84} />
        </div>

        <div
          style={{
            position: 'absolute',
            top: isMobile ? '10px' : '15px',
            left: isMobile ? '2%' : '8%',
            opacity: 0.85,
            pointerEvents: 'none',
          }}
        >
          <DandiyaSticksSticker size={isMobile ? 48 : 64} />
        </div>

        {/* Solo Dancers Category Badge */}
        <div style={{ marginBottom: '16px' }}>
          <Badge
            color={theme.colors.amber}
            icon={<span>💃</span>}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              boxShadow: theme.shadows.glowGold,
            }}
          >
            For Solo Garba & Navratri Dancers
          </Badge>
        </div>

        {/* Full Brand Logo Presentation */}
        <div
          style={{
            margin: '8px 0 16px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <LogoFull size={isMobile ? 210 : 280} />
        </div>

        {/* Hero Tagline: "You came to dance. Not to stand alone." */}
        <h1
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: isMobile ? 'clamp(28px, 8.5vw, 36px)' : '48px',
            fontWeight: 700,
            lineHeight: 1.18,
            color: theme.colors.textPrimary,
            margin: '12px 0 14px',
            letterSpacing: '0.2px',
          }}
        >
          You came to dance.
          <br />
          <span
            style={{
              background: theme.gradients.primary,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block',
              textShadow: '0 0 30px rgba(219, 39, 119, 0.25)',
            }}
          >
            Not to stand alone.
          </span>
        </h1>

        {/* Supporting Copy */}
        <p
          style={{
            fontFamily: theme.fonts.body,
            fontSize: isMobile ? '14px' : '16.5px',
            color: theme.colors.textMuted,
            maxWidth: '520px',
            lineHeight: 1.65,
            margin: '0 0 28px',
          }}
        >
          Register, select your dance pace, and get matched into an evenly-sized,
          gender-balanced circle of 16 solo attendees — with a volunteer Captain leading
          your first round.
        </p>

        {/* Primary & Secondary Call to Actions */}
        <div
          style={{
            width: '100%',
            maxWidth: isMobile ? '320px' : '420px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          {/* Dominant Action: Live Match */}
          <PrimaryButton
            onClick={() => showPhase2Notice('Live Registration', '/register')}
            style={{
              fontSize: isMobile ? '16px' : '17px',
              padding: isMobile ? '15px 24px' : '17px 32px',
            }}
            icon={<span style={{ fontSize: '18px' }}>🔍</span>}
          >
            Find Solo Garba Circle
          </PrimaryButton>

          {/* Secondary Action: Advance Booking */}
          <GhostButton
            onClick={() => showPhase2Notice('Advance Pre-Booking', '/advance')}
            style={{
              width: '100%',
              padding: isMobile ? '11px 20px' : '12px 24px',
              fontSize: '13.5px',
              borderColor: `${theme.colors.amber}66`,
            }}
            icon={<span>💃</span>}
          >
            Pre-Book My Circle (Advance)
          </GhostButton>
        </div>

        {/* Event Trust Signals */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: isMobile ? '10px' : '20px',
            marginTop: '28px',
            fontSize: '12px',
            color: theme.colors.textSecondary,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: theme.colors.liveGreen }}>●</span> 16 Dancers / Circle
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: theme.colors.amber }}>●</span> Equal Gender Balance
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: theme.colors.cyan }}>●</span> Volunteer Captain Led
          </span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. SKILL LEVEL PREVIEW STRIP                                              */}
      {/* ========================================================================= */}
      <section
        style={{
          width: '100%',
          maxWidth: isDesktop ? theme.maxWidths.desktop : theme.maxWidths.phone,
          padding: isMobile ? '0 5vw 44px' : '0 4vw 60px',
          margin: '0 auto',
        }}
        aria-label="Skill Levels"
      >
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2
            style={{
              fontFamily: theme.fonts.heading,
              fontSize: theme.fontSizes.h2,
              fontWeight: 700,
              color: theme.colors.textPrimary,
              marginBottom: '6px',
            }}
          >
            Dance At Your Own Rhythm
          </h2>
          <p style={{ fontSize: '13px', color: theme.colors.textMuted, maxWidth: '440px', margin: '0 auto' }}>
            Circles are formed by experience level so you can groove comfortably without feeling rushed or held back.
          </p>
        </div>

        {/* 3 Skill Level Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr',
            gap: '12px',
          }}
        >
          {theme.levels.map((level) => {
            const isSelected = activeLevelPreview === level.id;
            return (
              <div
                key={level.id}
                onClick={() => setActiveLevelPreview(level.id)}
                style={{
                  position: 'relative',
                  background: level.gradient,
                  border: `0.5px solid ${isSelected ? level.color : `${level.color}55`}`,
                  borderRadius: '16px',
                  padding: isMobile ? '16px' : '20px',
                  boxShadow: isSelected
                    ? `0 8px 30px -4px ${level.color}66`
                    : `0 4px 18px -6px ${level.color}33`,
                  transform: isSelected ? 'scale(1.02)' : 'none',
                  transition: 'all 0.22s ease',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '26px' }}>{level.icon}</span>
                  <Badge color={level.color} size="sm">
                    {level.tag}
                  </Badge>
                </div>
                <div
                  style={{
                    fontFamily: theme.fonts.heading,
                    fontWeight: 700,
                    fontSize: '18px',
                    color: theme.colors.textPrimary,
                    marginBottom: '4px',
                  }}
                >
                  {level.label}
                </div>
                <p
                  style={{
                    fontFamily: theme.fonts.body,
                    fontSize: '12.5px',
                    color: theme.colors.textMuted,
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {level.desc}
                </p>
                {isSelected && (
                  <div
                    style={{
                      marginTop: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      color: level.color,
                      fontWeight: 600,
                    }}
                  >
                    <span>✓</span> Previewing {level.label} Circle Match
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. HOW IT WORKS (3 SIMPLE STEPS)                                         */}
      {/* ========================================================================= */}
      <section
        style={{
          width: '100%',
          maxWidth: isDesktop ? theme.maxWidths.desktop : theme.maxWidths.phone,
          padding: isMobile ? '20px 5vw 48px' : '20px 4vw 70px',
          margin: '0 auto',
        }}
        aria-label="How It Works"
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <Badge color={theme.colors.cyan} icon={<span>⚡</span>} style={{ marginBottom: '10px' }}>
            Zero Friction
          </Badge>
          <h2
            style={{
              fontFamily: theme.fonts.heading,
              fontSize: theme.fontSizes.h2,
              fontWeight: 700,
              color: theme.colors.textPrimary,
              marginBottom: '6px',
            }}
          >
            How SoloSaathi Circle Works
          </h2>
          <p style={{ fontSize: '13px', color: theme.colors.textMuted }}>
            From walk-in to dancing in under 5 minutes.
          </p>
        </div>

        {/* 3 Steps Side-by-Side on Desktop, Stacked on Mobile */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr',
            gap: '14px',
          }}
        >
          {/* Step 1 */}
          <SectionCard hoverable style={{ padding: '22px 18px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(245, 179, 1, 0.15)',
                  border: `0.5px solid ${theme.colors.gold}55`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                🎟️
              </div>
              <span
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: '12px',
                  fontWeight: 700,
                  color: theme.colors.gold,
                  letterSpacing: '1px',
                }}
              >
                STEP 01
              </span>
            </div>
            <h3
              style={{
                fontFamily: theme.fonts.heading,
                fontSize: '18px',
                fontWeight: 700,
                color: theme.colors.textPrimary,
                marginBottom: '6px',
              }}
            >
              Scan & Register
            </h3>
            <p style={{ fontSize: '13px', color: theme.colors.textMuted, lineHeight: 1.55 }}>
              Upload your event ticket or enter pass details. SoloSaathi's AI verifies your date
              and festival venue in seconds.
            </p>
          </SectionCard>

          {/* Step 2 */}
          <SectionCard hoverable style={{ padding: '22px 18px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(219, 39, 119, 0.15)',
                  border: `0.5px solid ${theme.colors.pink}55`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                ⚖️
              </div>
              <span
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: '12px',
                  fontWeight: 700,
                  color: theme.colors.pink,
                  letterSpacing: '1px',
                }}
              >
                STEP 02
              </span>
            </div>
            <h3
              style={{
                fontFamily: theme.fonts.heading,
                fontSize: '18px',
                fontWeight: 700,
                color: theme.colors.textPrimary,
                marginBottom: '6px',
              }}
            >
              Get Circle Matched
            </h3>
            <p style={{ fontSize: '13px', color: theme.colors.textMuted, lineHeight: 1.55 }}>
              Our engine places you in a balanced group of 16 dancers with equal gender ratios and
              matched dance comfort.
            </p>
          </SectionCard>

          {/* Step 3 */}
          <SectionCard hoverable style={{ padding: '22px 18px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(0, 194, 209, 0.15)',
                  border: `0.5px solid ${theme.colors.cyan}55`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                🪩
              </div>
              <span
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: '12px',
                  fontWeight: 700,
                  color: theme.colors.cyan,
                  letterSpacing: '1px',
                }}
              >
                STEP 03
              </span>
            </div>
            <h3
              style={{
                fontFamily: theme.fonts.heading,
                fontSize: '18px',
                fontWeight: 700,
                color: theme.colors.textPrimary,
                marginBottom: '6px',
              }}
            >
              Spot Beacon & Dance
            </h3>
            <p style={{ fontSize: '13px', color: theme.colors.textMuted, lineHeight: 1.55 }}>
              Hold up your pulsing Beacon light at the designated anchor landmark. Meet your
              Captain and step right into the Mandli!
            </p>
          </SectionCard>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. PRODUCT PILLARS & SAFETY                                              */}
      {/* ========================================================================= */}
      <section
        style={{
          width: '100%',
          maxWidth: isDesktop ? theme.maxWidths.desktop : theme.maxWidths.phone,
          padding: isMobile ? '0 5vw 50px' : '0 4vw 70px',
          margin: '0 auto',
        }}
        aria-label="Features and Safety"
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isDesktop ? 'repeat(2, 1fr)' : '1fr',
            gap: '14px',
          }}
        >
          {/* Pillar 1: Captain Led */}
          <SectionCard style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '28px', flexShrink: 0 }}>👑</div>
            <div>
              <div style={{ fontFamily: theme.fonts.heading, fontSize: '16px', fontWeight: 700, color: theme.colors.textPrimary, marginBottom: '3px' }}>
                Volunteer Circle Captains
              </div>
              <p style={{ fontSize: '12.5px', color: theme.colors.textMuted, lineHeight: 1.5, margin: 0 }}>
                Every circle is anchored by a friendly volunteer who starts the first round, breaks the ice, and ensures everyone is dancing together.
              </p>
            </div>
          </SectionCard>

          {/* Pillar 2: In-App Beacon Spotting */}
          <SectionCard style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '28px', flexShrink: 0 }}>💡</div>
            <div>
              <div style={{ fontFamily: theme.fonts.heading, fontSize: '16px', fontWeight: 700, color: theme.colors.textPrimary, marginBottom: '3px' }}>
                In-App Beacon Spotting
              </div>
              <p style={{ fontSize: '12.5px', color: theme.colors.textMuted, lineHeight: 1.5, margin: 0 }}>
                Grounds are loud and crowded. Turn your phone screen into a pulsing colored beacon so your group spots you effortlessly at the anchor point.
              </p>
            </div>
          </SectionCard>

          {/* Pillar 3: Verified Dancers Only */}
          <SectionCard style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '28px', flexShrink: 0 }}>🛡️</div>
            <div>
              <div style={{ fontFamily: theme.fonts.heading, fontSize: '16px', fontWeight: 700, color: theme.colors.textPrimary, marginBottom: '3px' }}>
                100% Verified Community
              </div>
              <p style={{ fontSize: '12.5px', color: theme.colors.textMuted, lineHeight: 1.5, margin: 0 }}>
                Mobile OTP verification, valid ticket checks, zero tolerance for harassment, and direct 1-tap SOS support at every partner venue.
              </p>
            </div>
          </SectionCard>

          {/* Pillar 4: Live & Advance Options */}
          <SectionCard style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '28px', flexShrink: 0 }}>📅</div>
            <div>
              <div style={{ fontFamily: theme.fonts.heading, fontSize: '16px', fontWeight: 700, color: theme.colors.textPrimary, marginBottom: '3px' }}>
                Two Ways to Circle Up
              </div>
              <p style={{ fontSize: '12.5px', color: theme.colors.textMuted, lineHeight: 1.5, margin: 0 }}>
                Match instantly tonight via walk-up Live registration (opens 6:30 PM), or pre-book in advance to lock your Mandli spot before peak festival nights.
              </p>
            </div>
          </SectionCard>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. BOTTOM CALL TO ACTION                                                 */}
      {/* ========================================================================= */}
      <section
        style={{
          width: '100%',
          maxWidth: isDesktop ? theme.maxWidths.desktop : theme.maxWidths.phone,
          padding: isMobile ? '10px 5vw 40px' : '20px 4vw 50px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <SectionCard
          style={{
            background: 'linear-gradient(160deg, #2A1D44, #18122B)',
            borderColor: `${theme.colors.gold}44`,
            padding: isMobile ? '28px 20px' : '36px 32px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative Dholak and Diya */}
          <div style={{ position: 'absolute', bottom: '-8px', left: '-8px', opacity: 0.6, pointerEvents: 'none' }}>
            <DholakSticker size={64} />
          </div>
          <div style={{ position: 'absolute', top: '10px', right: '12px', opacity: 0.8, pointerEvents: 'none' }}>
            <DiyaSticker size={40} />
          </div>

          <h2
            style={{
              fontFamily: theme.fonts.heading,
              fontSize: isMobile ? '24px' : '32px',
              fontWeight: 700,
              color: theme.colors.textPrimary,
              marginBottom: '10px',
            }}
          >
            Ready to Join the Mandli Tonight?
          </h2>
          <p
            style={{
              fontFamily: theme.fonts.body,
              fontSize: '13.5px',
              color: theme.colors.textMuted,
              maxWidth: '460px',
              margin: '0 auto 24px',
              lineHeight: 1.6,
            }}
          >
            Thousands of solo dancers are meeting on grounds across Ahmedabad, Surat, Vadodara,
            and beyond. Find your circle now.
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'center',
              gap: '12px',
              maxWidth: '420px',
              margin: '0 auto',
            }}
          >
            <PrimaryButton
              onClick={() => showPhase2Notice('Live Registration', '/register')}
              style={{ padding: '14px 28px' }}
            >
              Find Solo Garba Circle
            </PrimaryButton>
            <GhostButton
              onClick={() => showPhase2Notice('Advance Registration', '/advance')}
              style={{ padding: '12px 24px' }}
            >
              Pre-Book My Circle
            </GhostButton>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}

export default HomePage;
