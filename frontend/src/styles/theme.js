/**
 * SoloSaathi Circle — Design System Theme (Dark + Light)
 *
 * Single source of truth for all brand colors, gradients, typography, borders,
 * shadows, and layout constants. Exports both lightTheme and darkTheme.
 * Components consume the active theme via useTheme() hook from ThemeContext.
 */

const deepFreeze = (obj) => {
  Object.keys(obj).forEach((prop) => {
    if (typeof obj[prop] === 'object' && obj[prop] !== null && !Object.isFrozen(obj[prop])) {
      deepFreeze(obj[prop]);
    }
  });
  return Object.freeze(obj);
};

// ─── Shared tokens (identical in both themes) ──────────────────────────────
const shared = {
  brand: {
    name: 'SoloSaathi Circle',
    tagline: 'You came to dance. Not to stand alone.',
    producer: 'Kritz Vyonera AI Studio',
  },

  // Primary Brand Accents (same in both themes)
  accent: {
    gold: '#F5B301',
    amber: '#E3A542',
    pink: '#DB2777',
    magenta: '#DB2777',
    cyan: '#00C2D1',
    violet: '#7C3AED',
    beginner: '#22C55E',
    intermediate: '#FFB020',
    advanced: '#F43F5E',
  },

  fonts: {
    heading: "'Baloo 2', cursive, sans-serif",
    body: "'Manrope', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },

  fontWeights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  fontSizes: {
    xs: '11px',
    sm: '12.5px',
    base: '14px',
    md: '16px',
    lg: '18px',
    xl: '22px',
    h2: 'clamp(22px, 5vw, 26px)',
    h1: 'clamp(26px, 7vw, 36px)',
  },

  radii: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '18px',
    pill: '999px',
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '14px',
    lg: '20px',
    xl: '32px',
    xxl: '48px',
  },

  maxWidths: {
    phone: '460px',
    tablet: '720px',
    desktop: '1080px',
    wide: '1280px',
  },

  transitions: {
    fast: 'all 0.15s ease',
    normal: 'all 0.25s ease',
    smooth: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
  },

  gradients: {
    // Action gradients (same in both)
    primary: 'linear-gradient(90deg, #F5B301, #E3A542 35%, #DB2777)',
    chat: 'linear-gradient(90deg, #00C2D1, #7C3AED)',
    goldPink: 'linear-gradient(90deg, #F5B301, #DB2777)',
    cyanViolet: 'linear-gradient(90deg, #00C2D1, #7C3AED)',
  },
};

// ─── Light Theme ────────────────────────────────────────────────────────────
export const lightTheme = deepFreeze({
  ...shared,
  mode: 'light',

  colors: {
    ...shared.accent,
    liveGreen: '#22A855',

    // Skill Level Backgrounds
    beginnerBg: '#EDFBF2',
    intermediateBg: '#FFF6E8',
    advancedBg: '#FFF0F2',

    // Surfaces & Backgrounds
    pageBgStart: '#FFF5EB',
    pageBgEnd: '#FEF3E2',
    cardBgStart: '#FFFFFF',
    cardBgEnd: '#FFF9F0',
    surfaceDark: '#FFF5EB',
    surfaceCard: '#FFFFFF',
    surfaceElevated: '#FFF8F0',
    surfaceNav: 'rgba(255, 248, 240, 0.92)',
    buttonDisabled: '#D4C8B8',

    // Text & Content
    textPrimary: '#2D1810',
    textMuted: '#6B5C4F',
    textSecondary: '#8B7B6E',
    textPlaceholder: '#B8A89A',
    textDark: '#FFFFFF',
    textDisabled: '#B8A89A',
    textLabel: '#8B5E3C',
    // For surfaces that stay dark in both themes (e.g. gradients.ctaCard)
    textOnDark: '#FFF5EB',
    textOnDarkMuted: '#D9CBBE',

    // Borders & Dividers
    borderDefault: '#E8D8C8',
    borderSubtle: '#F0E4D6',
    borderLight: '#F0E4D6',
    borderFocus: '#D4900A',
    borderDanger: '#F43F5E',
  },

  gradients: {
    ...shared.gradients,
    page: 'radial-gradient(ellipse at top, #FFF5EB, #FEF3E2 70%)',
    cardNeutral: 'linear-gradient(160deg, #FFFFFF, #FFF9F0)',
    cardBeginner: 'linear-gradient(160deg, #EDFBF2, #FFF9F0)',
    cardIntermediate: 'linear-gradient(160deg, #FFF6E8, #FFF9F0)',
    cardAdvanced: 'linear-gradient(160deg, #FFF0F2, #FFF9F0)',
    ctaCard: 'linear-gradient(160deg, #3D2415, #2D1810)',
  },

  borders: {
    default: '0.5px solid #E8D8C8',
    subtle: '0.5px solid #F0E4D6',
    gold: '0.5px solid #F5B30144',
    amber: '0.5px solid #E3A54233',
    pink: '0.5px solid #DB277744',
    cyan: '0.5px solid #00C2D144',
    beginner: '0.5px solid #22C55E33',
    intermediate: '0.5px solid #FFB02033',
    advanced: '0.5px solid #F43F5E33',
  },

  shadows: {
    primaryButton: '0 6px 24px -6px #DB277766',
    card: '0 4px 20px -8px rgba(0,0,0,0.08)',
    cardHover: '0 8px 28px -6px rgba(0,0,0,0.12)',
    glowGold: '0 0 12px -2px #F5B30144',
    glowLive: '0 0 8px #22A85566',
  },

  // Backdrop glow multiplier (reduced for light backgrounds)
  backdropOpacity: 0.3,
  sparkOpacity: 0.2,

  levels: [
    {
      id: 'beginner',
      label: 'Beginner',
      icon: '🌱',
      tag: 'Learning the Steps',
      color: '#22C55E',
      bg: '#EDFBF2',
      gradient: 'linear-gradient(160deg, #EDFBF2, #FFF9F0)',
      borderColor: '#22C55E33',
      desc: 'First time at Garba or still finding your rhythm. Patient, easy-going circle circles.',
    },
    {
      id: 'intermediate',
      label: 'Intermediate',
      icon: '⚡',
      tag: 'Steady & Energetic',
      color: '#FFB020',
      bg: '#FFF6E8',
      gradient: 'linear-gradient(160deg, #FFF6E8, #FFF9F0)',
      borderColor: '#FFB02033',
      desc: 'Comfortable with Dodhiya, two-claps, and fast spins. Ready for sustained rounds.',
    },
    {
      id: 'advanced',
      label: 'Pro Raas',
      icon: '🔥',
      tag: 'High Tempo / Choreography',
      color: '#F43F5E',
      bg: '#FFF0F2',
      gradient: 'linear-gradient(160deg, #FFF0F2, #FFF9F0)',
      borderColor: '#F43F5E33',
      desc: 'Non-stop high BPM, intricate footwork, complex spins, and competitive energy.',
    },
  ],
});

// ─── Dark Theme ─────────────────────────────────────────────────────────────
export const darkTheme = deepFreeze({
  ...shared,
  mode: 'dark',

  colors: {
    ...shared.accent,
    liveGreen: '#3EE07A',

    // Skill Level Backgrounds
    beginnerBg: '#122A1B',
    intermediateBg: '#2E2410',
    advancedBg: '#2E1420',

    // Surfaces & Backgrounds
    pageBgStart: '#241D42',
    pageBgEnd: '#14101F',
    cardBgStart: '#2A2049',
    cardBgEnd: '#1F1938',
    surfaceDark: '#14101F',
    surfaceCard: '#1F1938',
    surfaceElevated: '#241D3D',
    surfaceNav: 'rgba(26, 22, 48, 0.88)',
    buttonDisabled: '#443B66',

    // Text & Content
    textPrimary: '#F3EDE0',
    textMuted: '#B9AFD1',
    textSecondary: '#8A81A8',
    textPlaceholder: '#6E6590',
    textDark: '#1B1730',
    textDisabled: '#8A81A8',
    textLabel: '#B29CE0',
    textOnDark: '#F3EDE0',
    textOnDarkMuted: '#B9AFD1',

    // Borders & Dividers
    borderDefault: '#4A3B6E',
    borderSubtle: '#3A3257',
    borderLight: '#3A3257',
    borderFocus: '#E3A542',
    borderDanger: '#F43F5E',
  },

  gradients: {
    ...shared.gradients,
    page: 'radial-gradient(ellipse at top, #241D42, #14101F 70%)',
    cardNeutral: 'linear-gradient(160deg, #2A2049, #1F1938)',
    cardBeginner: 'linear-gradient(160deg, #122A1B, #1F1938)',
    cardIntermediate: 'linear-gradient(160deg, #2E2410, #1F1938)',
    cardAdvanced: 'linear-gradient(160deg, #2E1420, #1F1938)',
    ctaCard: 'linear-gradient(160deg, #2A1D44, #18122B)',
  },

  borders: {
    default: '0.5px solid #4A3B6E',
    subtle: '0.5px solid #3A3257',
    gold: '0.5px solid #F5B30166',
    amber: '0.5px solid #E3A54255',
    pink: '0.5px solid #DB277766',
    cyan: '0.5px solid #00C2D166',
    beginner: '0.5px solid #22C55E55',
    intermediate: '0.5px solid #FFB02055',
    advanced: '0.5px solid #F43F5E55',
  },

  shadows: {
    primaryButton: '0 6px 24px -6px #DB277799',
    card: '0 8px 30px -10px #00000066',
    cardHover: '0 12px 36px -8px #00000099',
    glowGold: '0 0 16px -2px #F5B30166',
    glowLive: '0 0 8px #3EE07A',
  },

  // Backdrop glow multiplier (stronger for dark backgrounds)
  backdropOpacity: 1.0,
  sparkOpacity: 0.55,

  levels: [
    {
      id: 'beginner',
      label: 'Beginner',
      icon: '🌱',
      tag: 'Learning the Steps',
      color: '#22C55E',
      bg: '#122A1B',
      gradient: 'linear-gradient(160deg, #122A1B, #1F1938)',
      borderColor: '#22C55E55',
      desc: 'First time at Garba or still finding your rhythm. Patient, easy-going circle circles.',
    },
    {
      id: 'intermediate',
      label: 'Intermediate',
      icon: '⚡',
      tag: 'Steady & Energetic',
      color: '#FFB020',
      bg: '#2E2410',
      gradient: 'linear-gradient(160deg, #2E2410, #1F1938)',
      borderColor: '#FFB02055',
      desc: 'Comfortable with Dodhiya, two-claps, and fast spins. Ready for sustained rounds.',
    },
    {
      id: 'advanced',
      label: 'Pro Raas',
      icon: '🔥',
      tag: 'High Tempo / Choreography',
      color: '#F43F5E',
      bg: '#2E1420',
      gradient: 'linear-gradient(160deg, #2E1420, #1F1938)',
      borderColor: '#F43F5E55',
      desc: 'Non-stop high BPM, intricate footwork, complex spins, and competitive energy.',
    },
  ],
});

// Default export for backward compatibility
export const theme = lightTheme;
export default lightTheme;
