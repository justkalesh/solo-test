import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import logoImg from '../assets/logo/Logo.png';
import logoSquareImg from '../assets/logo/Logo_Square.png';
import logoNameImg from '../assets/logo/Logo_Name.png';
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
import {
  Search,
  Ticket,
  Users,
  Radio,
  Zap,
  Crown,
  Lightbulb,
  ShieldCheck,
  CalendarDays,
  Scale,
  Disc3,
  ArrowRight,
} from 'lucide-react';

/**
 * HomePage — SoloSaathi Circle Landing Page
 *
 * "The soul of the website."
 * Encapsulates the core emotional proposition: "You came to dance. Not to stand alone."
 * Built strictly mobile-first with desktop enhancements, GPU-accelerated styling,
 * exact design system tokens, and zero layout thrashing.
 */
export function HomePage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isMobile, isDesktop } = useDeviceType();
  const [activeLevelPreview, setActiveLevelPreview] = useState('intermediate');


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


      {/* ========================================================================= */}
      {/* 1. HERO SECTION                                                          */}
      {/* ========================================================================= */}
      <section
        style={{
          width: '100%',
          maxWidth: isDesktop ? theme.maxWidths.desktop : theme.maxWidths.phone,
          textAlign: 'center',
          padding: isMobile ? '32px 5vw 44px' : '56px 4vw 70px',
          margin: '0 auto',
          position: 'relative',
        }}
        aria-label="Hero Section"
      >
        {/* Subtle Decorative Marigold Garland at Hero Top */}
        <div
          style={{
            position: 'absolute',
            top: isMobile ? '-10px' : '0px',
            right: isMobile ? '2%' : '8%',
            opacity: 0.7,
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
            opacity: 0.7,
            pointerEvents: 'none',
          }}
        >
          <DandiyaSticksSticker size={isMobile ? 48 : 64} />
        </div>

        {/* Solo Dancers Category Badge */}
        <div style={{ marginBottom: '16px' }}>
          <Badge
            color={theme.colors.amber}
            icon={<Disc3 size={14} color={theme.colors.amber} />}
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
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0px',
          }}
        >
          {/* Rotating Firework Mark */}
          <img
            src={logoImg}
            alt="SoloSaathi Circle Logo"
            style={{
              height: isMobile ? '80px' : '100px',
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
              filter: 'drop-shadow(0 4px 16px rgba(245, 179, 1, 0.15))',
              animation: 'spin 8s linear infinite',
              mixBlendMode: theme.mode === 'dark' ? 'screen' : 'normal',
            }}
          />
          {/* Brand Name + Tagline (static) */}
          <img
            src={logoNameImg}
            alt="Solo Saathi Circle - Real-Time Group Match Making"
            style={{
              height: isMobile ? '90px' : '110px',
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
              mixBlendMode: theme.mode === 'dark' ? 'screen' : 'normal',
            }}
          />
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
            margin: '0 auto 28px',
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
            margin: '0 auto',
          }}
        >
          {/* Dominant Action: Live Match */}
          <PrimaryButton
            onClick={() => navigate('/register')}
            style={{
              fontSize: isMobile ? '16px' : '17px',
              padding: isMobile ? '15px 24px' : '17px 32px',
            }}
            icon={<Search size={18} color={theme.colors.textDark} strokeWidth={2.5} />}
          >
            Find Solo Garba Circle
          </PrimaryButton>

          {/* Secondary Action: Advance Booking */}
          <GhostButton
            onClick={() => navigate('/advance')}
            style={{
              width: '100%',
              padding: isMobile ? '11px 20px' : '12px 24px',
              fontSize: '13.5px',
              borderColor: `${theme.colors.amber}66`,
            }}
            icon={<CalendarDays size={15} color={theme.colors.amber} />}
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
            <Users size={13} color={theme.colors.liveGreen} /> 16 Dancers / Circle
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Scale size={13} color={theme.colors.amber} /> Equal Gender Balance
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Crown size={13} color={theme.colors.cyan} /> Volunteer Captain Led
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
              <button
                key={level.id}
                type="button"
                onClick={() => setActiveLevelPreview(level.id)}
                aria-pressed={isSelected}
                style={{
                  display: 'block',
                  width: '100%',
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
                  font: 'inherit',
                  color: 'inherit',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '26px' }} aria-hidden="true">{level.icon}</span>
                  <Badge color={level.textColor} size="sm">
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
                      color: level.textColor,
                      fontWeight: 600,
                    }}
                  >
                    <span>✓</span> Previewing {level.label} Circle Match
                  </div>
                )}
              </button>
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
          <Badge color={theme.colors.cyan} icon={<Zap size={13} color={theme.colors.cyan} />} style={{ marginBottom: '10px' }}>
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
                }}
              >
                <Ticket size={20} color={theme.colors.gold} />
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
                }}
              >
                <Users size={20} color={theme.colors.pink} />
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
                }}
              >
                <Radio size={20} color={theme.colors.cyan} />
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
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(245, 179, 1, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Crown size={22} color={theme.colors.gold} />
            </div>
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
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(0, 194, 209, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Lightbulb size={22} color={theme.colors.cyan} />
            </div>
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
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(219, 39, 119, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={22} color={theme.colors.pink} />
            </div>
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
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(124, 58, 237, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CalendarDays size={22} color={theme.colors.violet} />
            </div>
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
            background: theme.gradients.ctaCard,
            borderColor: `${theme.colors.gold}44`,
            padding: isMobile ? '28px 20px' : '36px 32px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative Dholak and Diya */}
          <div style={{ position: 'absolute', bottom: '-4px', left: '-4px', opacity: 0.5, pointerEvents: 'none' }}>
            <DholakSticker size={isMobile ? 52 : 64} />
          </div>
          <div style={{ position: 'absolute', top: '10px', right: '12px', opacity: 0.6, pointerEvents: 'none' }}>
            <DiyaSticker size={isMobile ? 32 : 40} />
          </div>

          <h2
            style={{
              fontFamily: theme.fonts.heading,
              fontSize: isMobile ? '24px' : '32px',
              fontWeight: 700,
              color: theme.colors.textOnDark,
              marginBottom: '10px',
            }}
          >
            Ready to Join the Mandli Tonight?
          </h2>
          <p
            style={{
              fontFamily: theme.fonts.body,
              fontSize: '13.5px',
              color: theme.colors.textOnDarkMuted,
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
              onClick={() => navigate('/register')}
              style={{ padding: '14px 28px' }}
              icon={<ArrowRight size={16} color={theme.colors.textDark} />}
            >
              Find Solo Garba Circle
            </PrimaryButton>
            <GhostButton
              onClick={() => navigate('/advance')}
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
