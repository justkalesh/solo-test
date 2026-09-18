import React from "react";

/**
 * SoloSaathi Circle — Brand Logo Concept
 * 
 * Concept Explanation:
 * The mark visually captures the product promise: "You came to dance. Not to stand alone."
 * 
 * 1. The Circle of Dancers (Garba Mandli): 
 *    Arranged in a ring viewed from above, seven nodes represent companion dancers moving 
 *    in orbital unison, reflecting the circular choreography and energy of Garba.
 * 
 * 2. The Solo Newcomer (Top-Right):
 *    One distinctive figure glows in radiant gold with an illuminated aura, stepping into 
 *    the circle. A dynamic welcoming arc sweeps from the group to greet them — symbolising 
 *    a friendly hand pulling a solo attendee into the warmth of the Circle.
 * 
 * 3. The Central Diya:
 *    At the core rests a stylized four-pointed diya spark, honoring the sacred light 
 *    around which all Garba is danced, evoking safety, celebration, and belonging.
 * 
 * 4. Colors & Typography:
 *    The mark transitions through the brand's festive gold (#F5B301, #E3A542) and vibrant 
 *    magenta (#DB2777). The wordmark uses the rounded warmth of Baloo 2 to convey 
 *    inclusivity, friendliness, and high-spirited festival energy without corporate stiffness.
 */

export function LogoFull({ size = 220, className = "", style = {}, ...props }) {
  // size controls width; height scales proportionally according to the 220x56 viewBox ratio (~3.93:1)
  const width = typeof size === "number" ? size : parseFloat(size) || 220;
  const height = Math.round(width * (56 / 220));

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 220 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
      aria-label="SoloSaathi Circle Full Logo"
      role="img"
      {...props}
    >
      <defs>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&display=swap');
            .ss-brand-title {
              font-family: 'Baloo 2', cursive, -apple-system, sans-serif;
              font-weight: 700;
              font-size: 19.5px;
              letter-spacing: 0.2px;
            }
            .ss-brand-sub {
              font-family: 'Baloo 2', cursive, -apple-system, sans-serif;
              font-weight: 700;
              font-size: 11px;
              letter-spacing: 3.2px;
            }
          `}
        </style>

        {/* Ring Gradient */}
        <linearGradient id="ss_full_ring_grad" x1="18" y1="18" x2="82" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F5B301" />
          <stop offset="35%" stopColor="#E3A542" />
          <stop offset="70%" stopColor="#DB2777" />
          <stop offset="100%" stopColor="#9D2FB5" />
        </linearGradient>

        {/* Solo Newcomer Glow */}
        <linearGradient id="ss_full_solo_grad" x1="68" y1="20" x2="84" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF9ED" />
          <stop offset="45%" stopColor="#F5B301" />
          <stop offset="100%" stopColor="#E3A542" />
        </linearGradient>

        {/* Central Diya Glow */}
        <radialGradient id="ss_full_diya_glow" cx="50" cy="50" r="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F5B301" stopOpacity="0.45" />
          <stop offset="50%" stopColor="#DB2777" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#241D42" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ==================== LEFT: LOGO MARK (46x46 at x=5, y=5) ==================== */}
      <g transform="translate(5, 5) scale(0.46)">
        {/* Ambient Diya Glow */}
        <circle cx="50" cy="50" r="22" fill="url(#ss_full_diya_glow)" />

        {/* Rhythmic Orbit Track */}
        <circle
          cx="50"
          cy="50"
          r="32"
          stroke="url(#ss_full_ring_grad)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="16 8"
          opacity="0.85"
        />

        {/* Central Sacred Diya */}
        <path
          d="M50 42 C50 47 47 50 42 50 C47 50 50 53 50 58 C50 53 53 50 58 50 C53 50 50 47 50 42 Z"
          fill="#F5B301"
        />
        <circle cx="50" cy="50" r="2.4" fill="#FFF9ED" />

        {/* Welcoming Hand Arc */}
        <path
          d="M51 18 C62 19 70 24 76 33"
          stroke="#F5B301"
          strokeWidth="4.2"
          strokeLinecap="round"
        />

        {/* 7 Circle Companions */}
        <circle cx="82" cy="50" r="5.6" fill="#DB2777" />
        <circle cx="73" cy="73" r="5.6" fill="#DB2777" />
        <circle cx="50" cy="82" r="5.6" fill="#C0267C" />
        <circle cx="27" cy="73" r="5.6" fill="#9D2FB5" />
        <circle cx="18" cy="50" r="5.6" fill="#E3A542" />
        <circle cx="27" cy="27" r="5.6" fill="#E3A542" />
        <circle cx="50" cy="18" r="5.6" fill="#F5B301" />

        {/* The Solo Saathi (Newcomer) */}
        <circle
          cx="74"
          cy="26"
          r="9.2"
          stroke="#F5B301"
          strokeWidth="2"
          strokeDasharray="2.5 2"
          opacity="0.8"
        />
        <circle cx="74" cy="26" r="7.2" fill="url(#ss_full_solo_grad)" />
        <circle cx="72" cy="24" r="2.2" fill="#FFFFFF" />
      </g>

      {/* ==================== RIGHT: WORDMARK (BALOO 2) ==================== */}
      {/* Primary Brand Line: "Solo" in Off-white, "Saathi" in Warm Gold */}
      <text x="60" y="27" className="ss-brand-title">
        <tspan fill="#F3EDE0">Solo</tspan>
        <tspan dx="4" fill="#F5B301">Saathi</tspan>
      </text>

      {/* Supporting Brand Category: "CIRCLE" with energetic tracking */}
      <text x="61" y="44" fill="#DB2777" className="ss-brand-sub">
        CIRCLE
      </text>

      {/* Subtle festive sparkle accent next to wordmark */}
      <circle cx="137" cy="39" r="1.4" fill="#E3A542" opacity="0.75" />
    </svg>
  );
}

export default LogoFull;
