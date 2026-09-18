/**
 * SoloSaathi Circle — Design System Theme
 *
 * Single source of truth for all brand colors, gradients, typography, borders,
 * shadows, and layout constants. No component should hardcode raw hex values;
 * all components consume values from this frozen `theme` object.
 *
 * Visual Source of Truth: `solosaathi-preview.jsx`
 */

const deepFreeze = (obj) => {
  Object.keys(obj).forEach((prop) => {
    if (typeof obj[prop] === 'object' && obj[prop] !== null && !Object.isFrozen(obj[prop])) {
      deepFreeze(obj[prop]);
    }
  });
  return Object.freeze(obj);
};

export const theme = deepFreeze({
  brand: {
    name: 'SoloSaathi Circle',
    tagline: 'You came to dance. Not to stand alone.',
    producer: 'Kritz Vyonera AI Studio',
  },

  colors: {
    // Primary Brand Accents
    gold: '#F5B301',
    amber: '#E3A542',
    pink: '#DB2777',
    magenta: '#DB2777',
    cyan: '#00C2D1',
    violet: '#7C3AED',
    liveGreen: '#3EE07A',

    // Skill Levels
    beginner: '#22C55E',
    beginnerBg: '#122A1B',
    intermediate: '#FFB020',
    intermediateBg: '#2E2410',
    advanced: '#F43F5E',
    advancedBg: '#2E1420',

    // Surfaces & Backgrounds
    pageBgStart: '#241D42',
    pageBgEnd: '#14101F',
    cardBgStart: '#2A2049',
    cardBgEnd: '#1F1938',
    surfaceDark: '#14101F',
    surfaceCard: '#1F1938',
    surfaceElevated: '#241D3D',
    surfaceNav: '#1A163099',
    buttonDisabled: '#443B66',

    // Text & Content
    textPrimary: '#F3EDE0',
    textMuted: '#B9AFD1',
    textSecondary: '#8A81A8',
    textPlaceholder: '#6E6590',
    textDark: '#1B1730',
    textDisabled: '#8A81A8',
    textLabel: '#B29CE0',

    // Borders & Dividers
    borderDefault: '#4A3B6E',
    borderSubtle: '#3A3257',
    borderFocus: '#E3A542',
    borderDanger: '#F43F5E',
  },

  gradients: {
    // Page canvas
    page: 'radial-gradient(ellipse at top, #241D42, #14101F 70%)',

    // Primary action gradient (buttons, highlights, progress bars)
    primary: 'linear-gradient(90deg, #F5B301, #E3A542 35%, #DB2777)',

    // Secondary Chat gradient
    chat: 'linear-gradient(90deg, #00C2D1, #7C3AED)',

    // Cards
    cardNeutral: 'linear-gradient(160deg, #2A2049, #1F1938)',
    cardBeginner: 'linear-gradient(160deg, #122A1B, #1F1938)',
    cardIntermediate: 'linear-gradient(160deg, #2E2410, #1F1938)',
    cardAdvanced: 'linear-gradient(160deg, #2E1420, #1F1938)',

    // Text gradient helper
    goldPink: 'linear-gradient(90deg, #F5B301, #DB2777)',
    cyanViolet: 'linear-gradient(90deg, #00C2D1, #7C3AED)',
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

export default theme;
