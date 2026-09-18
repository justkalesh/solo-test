import React from 'react';
import theme from '../../styles/theme';

/**
 * FestiveStickers — Navratri & Garba Decorative Vector Motifs
 *
 * NOTE FOR ASSET PIPELINE:
 * These are placeholder vector stickers; if the team supplies real
 * illustrated/photographed .webp assets later, drop them into
 * src/assets/stickers/ and swap the source here — keep the same
 * component prop interface (size, className, style) so no layout code
 * needs to change.
 */

// 1. Traditional Diya (Sacred Oil Lamp with Radiant Flame)
export function DiyaSticker({ size = 44, style = {}, className = '', ...props }) {
  const s = typeof size === 'number' ? size : 44;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      className={className}
      aria-label="Diya Motif"
      role="img"
      {...props}
    >
      <defs>
        <linearGradient id="ss_diya_flame" x1="32" y1="6" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF275" />
          <stop offset="40%" stopColor="#F5B301" />
          <stop offset="85%" stopColor="#DB2777" />
        </linearGradient>
        <linearGradient id="ss_diya_bowl" x1="12" y1="32" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F5B301" />
          <stop offset="60%" stopColor="#E3A542" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <filter id="ss_diya_glow" x="16" y="0" width="32" height="38" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {/* Radiant Flame Glow */}
      <circle cx="32" cy="18" r="10" fill="#F5B30122" />
      {/* Flame */}
      <path
        d="M32 6C32 6 24 18 24 24C24 28.4 27.6 32 32 32C36.4 32 40 28.4 40 24C40 18 32 6 32 6Z"
        fill="url(#ss_diya_flame)"
        filter="url(#ss_diya_glow)"
      />
      {/* Inner White Flame Core */}
      <path
        d="M32 14C32 14 28 20 28 24C28 26.2 29.8 28 32 28C34.2 28 36 26.2 36 24C36 20 32 14 32 14Z"
        fill="#FFFDF0"
        opacity="0.9"
      />
      {/* Clay Diya Bowl */}
      <path
        d="M10 34C14 48 24 54 32 54C40 54 50 48 54 34C48 37 40 38 32 38C24 38 16 37 10 34Z"
        fill="url(#ss_diya_bowl)"
      />
      {/* Bowl Rim Highlight */}
      <path
        d="M10 34C18 38 26 39 32 39C38 39 46 38 54 34"
        stroke="#FFE899"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Base Stand */}
      <ellipse cx="32" cy="54" rx="10" ry="3" fill="#E3A542" opacity="0.8" />
    </svg>
  );
}

// 2. Festive String of Lights / Lanterns
export function StringLightsSticker({ size = 80, style = {}, className = '', ...props }) {
  const s = typeof size === 'number' ? size : 80;
  return (
    <svg
      width={s}
      height={s * (36 / 100)}
      viewBox="0 0 100 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      className={className}
      aria-label="Festive Lights Motif"
      role="img"
      {...props}
    >
      {/* Catenary Wire */}
      <path
        d="M2 10 Q25 24 50 12 T98 14"
        stroke="#4A3B6E"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Light 1 (Gold) */}
      <circle cx="16" cy="18" r="6" fill="#F5B301" opacity="0.9" />
      <circle cx="16" cy="18" r="10" fill="#F5B30122" />
      {/* Light 2 (Pink) */}
      <circle cx="36" cy="20" r="5" fill="#DB2777" opacity="0.9" />
      <circle cx="36" cy="20" r="9" fill="#DB277722" />
      {/* Light 3 (Cyan) */}
      <circle cx="62" cy="16" r="5.5" fill="#00C2D1" opacity="0.9" />
      <circle cx="62" cy="16" r="9.5" fill="#00C2D122" />
      {/* Light 4 (Green) */}
      <circle cx="84" cy="16" r="5" fill="#22C55E" opacity="0.9" />
      <circle cx="84" cy="16" r="9" fill="#22C55E22" />
    </svg>
  );
}

// 3. Marigold Garland Flourish (Toran petal arc)
export function MarigoldGarlandSticker({ size = 72, style = {}, className = '', ...props }) {
  const s = typeof size === 'number' ? size : 72;
  return (
    <svg
      width={s}
      height={s * (40 / 80)}
      viewBox="0 0 80 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      className={className}
      aria-label="Marigold Garland Motif"
      role="img"
      {...props}
    >
      <defs>
        <radialGradient id="ss_marigold_1" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#FFF275" />
          <stop offset="60%" stopColor="#F5B301" />
          <stop offset="100%" stopColor="#E3A542" />
        </radialGradient>
        <radialGradient id="ss_marigold_2" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#FF85A1" />
          <stop offset="70%" stopColor="#DB2777" />
          <stop offset="100%" stopColor="#7C3AED" />
        </radialGradient>
      </defs>
      {/* Swag Thread */}
      <path d="M4 10 Q40 34 76 10" stroke="#22C55E88" strokeWidth="1.5" fill="none" />
      {/* Flowers across the swag */}
      <circle cx="12" cy="14" r="6" fill="url(#ss_marigold_1)" />
      <circle cx="26" cy="21" r="7" fill="url(#ss_marigold_2)" />
      <circle cx="40" cy="24" r="8" fill="url(#ss_marigold_1)" />
      <circle cx="54" cy="21" r="7" fill="url(#ss_marigold_2)" />
      <circle cx="68" cy="14" r="6" fill="url(#ss_marigold_1)" />
    </svg>
  );
}

// 4. Celebratory Hand-drum / Dholak Silhouette
export function DholakSticker({ size = 52, style = {}, className = '', ...props }) {
  const s = typeof size === 'number' ? size : 52;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      className={className}
      aria-label="Dholak Drum Motif"
      role="img"
      {...props}
    >
      <defs>
        <linearGradient id="ss_dholak_body" x1="10" y1="16" x2="54" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E3A542" />
          <stop offset="50%" stopColor="#DB2777" />
          <stop offset="100%" stopColor="#241D42" />
        </linearGradient>
      </defs>
      {/* Drum Barrel */}
      <path
        d="M16 20 C24 14 40 14 48 20 L52 44 C44 50 20 50 12 44 Z"
        fill="url(#ss_dholak_body)"
        stroke="#F5B301"
        strokeWidth="1.2"
      />
      {/* Left Drum Head */}
      <ellipse cx="14" cy="32" rx="4" ry="12" fill="#241D3D" stroke="#E3A542" strokeWidth="1.2" />
      {/* Right Drum Head */}
      <ellipse cx="50" cy="32" rx="4" ry="12" fill="#241D3D" stroke="#E3A542" strokeWidth="1.2" />
      {/* Tuning Ropes (V-Pattern) */}
      <path
        d="M16 22 L32 46 L48 22 M16 42 L32 18 L48 42"
        stroke="#FFF27588"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

// 5. Dandiya Sticks Pair (Crossed with festive grips)
export function DandiyaSticksSticker({ size = 56, style = {}, className = '', ...props }) {
  const s = typeof size === 'number' ? size : 56;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      className={className}
      aria-label="Dandiya Sticks Motif"
      role="img"
      {...props}
    >
      <defs>
        <linearGradient id="ss_stick_1" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F5B301" />
          <stop offset="50%" stopColor="#DB2777" />
          <stop offset="100%" stopColor="#00C2D1" />
        </linearGradient>
        <linearGradient id="ss_stick_2" x1="54" y1="10" x2="10" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00C2D1" />
          <stop offset="50%" stopColor="#F5B301" />
          <stop offset="100%" stopColor="#DB2777" />
        </linearGradient>
      </defs>
      {/* Stick 1 (Diagonal top-left to bottom-right) */}
      <rect
        x="8"
        y="30"
        width="54"
        height="5"
        rx="2.5"
        transform="rotate(45 8 30)"
        fill="url(#ss_stick_1)"
      />
      {/* Stick 1 Grip Wraps */}
      <line x1="16" y1="36" x2="18" y2="40" stroke="#FFFDF0" strokeWidth="1.5" />
      <line x1="20" y1="40" x2="22" y2="44" stroke="#FFFDF0" strokeWidth="1.5" />
      <line x1="24" y1="44" x2="26" y2="48" stroke="#FFFDF0" strokeWidth="1.5" />

      {/* Stick 2 (Diagonal top-right to bottom-left) */}
      <rect
        x="48"
        y="8"
        width="54"
        height="5"
        rx="2.5"
        transform="rotate(135 48 8)"
        fill="url(#ss_stick_2)"
      />
      {/* Stick 2 Grip Wraps */}
      <line x1="44" y1="44" x2="42" y2="48" stroke="#FFFDF0" strokeWidth="1.5" />
      <line x1="40" y1="40" x2="38" y2="44" stroke="#FFFDF0" strokeWidth="1.5" />
      <line x1="36" y1="36" x2="34" y2="40" stroke="#FFFDF0" strokeWidth="1.5" />

      {/* Tassels at endpoints */}
      <circle cx="12" cy="14" r="3" fill="#DB2777" />
      <circle cx="52" cy="14" r="3" fill="#F5B301" />
    </svg>
  );
}

// 6. Mandala Spark Flourish
export function MandalaSparkSticker({ size = 48, style = {}, className = '', ...props }) {
  const s = typeof size === 'number' ? size : 48;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      className={className}
      aria-label="Mandala Spark Motif"
      role="img"
      {...props}
    >
      <circle cx="24" cy="24" r="4" fill="#F5B301" />
      <circle cx="24" cy="24" r="10" stroke="#DB277766" strokeWidth="1" strokeDasharray="3 3" />
      {/* 8 radiating sparks */}
      <path
        d="M24 6V14 M24 34V42 M6 24H14 M34 24H42 M11 11L17 17 M31 31L37 37 M37 11L31 17 M17 31L11 37"
        stroke="#E3A542"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default {
  DiyaSticker,
  StringLightsSticker,
  MarigoldGarlandSticker,
  DholakSticker,
  DandiyaSticksSticker,
  MandalaSparkSticker,
};
