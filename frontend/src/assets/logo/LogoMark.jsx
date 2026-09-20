// NOTE: This placeholder SVG logo component has been superseded by mentor-provided
// brand assets in frontend/src/assets/logo/*.png. Retained as fallback/reference.
import React from "react";

/**
 * LogoMark - SoloSaathi Circle (Superseded placeholder)
 *
 * Standalone circular symbol — favicons, app bar icons, small UI spots.
 *
 * Design principle at small sizes (32–64px):
 *   "7 companion dots in a ring + 1 visibly larger, radiant solo dot"
 *   That single contrast IS the story. Every extra element (diya spark,
 *   dashed halo, radial glow) collapses into noise below ~64px and has
 *   been removed from this variant. LogoFull retains the decorative detail.
 *
 * Size contrast rules (in 100×100 viewBox):
 *   - Companion nodes: r = 4.8
 *   - Solo newcomer:   r = 8.5  (~77 % larger, solid fill, solid ring)
 *   - Welcoming arc:   solid 3.8px stroke (no dash)
 *   - Orbit track:     solid 2.2px stroke (thin but continuous — unifies)
 *
 * Palette: #F5B301 / #E3A542 (gold) · #DB2777 / #C0267C (magenta) · #9D2FB5 (violet)
 */
export function LogoMark({ size = 48, className = "", style = {}, ...props }) {
  const dimension = typeof size === "number" ? `${size}px` : size;

  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
      aria-label="SoloSaathi Circle Logo Mark"
      role="img"
      {...props}
    >
      <defs>
        {/* Orbit ring gradient: Gold → Magenta sweep */}
        <linearGradient id="ss_m_ring" x1="18" y1="18" x2="82" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#F5B301" />
          <stop offset="40%"  stopColor="#E3A542" />
          <stop offset="75%"  stopColor="#DB2777" />
          <stop offset="100%" stopColor="#9D2FB5" />
        </linearGradient>

        {/* Solo newcomer fill: bright gold core */}
        <linearGradient id="ss_m_solo" x1="67" y1="19" x2="84" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#FFF9ED" />
          <stop offset="50%"  stopColor="#F5B301" />
          <stop offset="100%" stopColor="#E3A542" />
        </linearGradient>
      </defs>

      {/* ─── 1. Orbit track ─────────────────────────────────────────────────
          Thin, continuous (no dash) — provides visual circle at all sizes.
          At 32px this renders as a ~0.7px line: present but unobtrusive.   */}
      <circle
        cx="50" cy="50" r="32"
        stroke="url(#ss_m_ring)"
        strokeWidth="2.2"
        opacity="0.7"
      />

      {/* ─── 2. Welcoming arc ───────────────────────────────────────────────
          Solid stroke bridging the gap where the solo dancer enters.
          Curves FROM the North node (50,18) TOWARD the solo position (74,26).
          At 32px this is ~1.2px — clearly reads as directional gesture.    */}
      <path
        d="M 50 18 C 60 17 69 21 74 28"
        stroke="#F5B301"
        strokeWidth="3.8"
        strokeLinecap="round"
      />

      {/* ─── 3. Seven companion dancers ─────────────────────────────────────
          Positioned at 0° 45° 90° 135° 180° 225° 270° around r=32.
          At 32px each dot = ~3px — readable, consistent, recedes.          */}
      {/* 0°   East        */ }
      <circle cx="82" cy="50" r="4.8" fill="#DB2777" />
      {/* 45°  South-East  */ }
      <circle cx="73" cy="73" r="4.8" fill="#DB2777" />
      {/* 90°  South       */ }
      <circle cx="50" cy="82" r="4.8" fill="#C0267C" />
      {/* 135° South-West  */ }
      <circle cx="27" cy="73" r="4.8" fill="#9D2FB5" />
      {/* 180° West        */ }
      <circle cx="18" cy="50" r="4.8" fill="#E3A542" />
      {/* 225° North-West  */ }
      <circle cx="27" cy="27" r="4.8" fill="#E3A542" />
      {/* 270° North       */ }
      <circle cx="50" cy="18" r="4.8" fill="#F5B301" />

      {/* ─── 4. The Solo Saathi ──────────────────────────────────────────────
          Placed at ~315° (top-right). Three rules drive distinction:
            a) Larger (r=8.5 vs 4.8): biggest element after the ring itself
            b) Solid outline ring (2px, no dash): visible at 32px
            c) High-contrast inner highlight: white dot punched in center
          At 32px: solo = ~5.4px dot, companion = ~3px dot — unmistakable.  */}
      {/* Solid halo ring (replaces dashed version) */}
      <circle
        cx="74" cy="26" r="11.2"
        stroke="#F5B301"
        strokeWidth="2"
        opacity="0.55"
      />
      {/* Main solo node — large, radiant */}
      <circle cx="74" cy="26" r="8.5" fill="url(#ss_m_solo)" />
      {/* White highlight — stays punchy at 32px */}
      <circle cx="71.8" cy="23.8" r="2.4" fill="#FFFFFF" opacity="0.9" />
    </svg>
  );
}

export default LogoMark;
