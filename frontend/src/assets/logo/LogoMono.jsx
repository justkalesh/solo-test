import React from "react";

/**
 * LogoMono - SoloSaathi Circle
 * 
 * Single-color flat version designed for very busy backgrounds, high-contrast
 * light/dark surfaces, embroidery, print, or stamped passes.
 * 
 * Per product specification:
 * - Use color="#F3EDE0" (off-white) for dark backgrounds (default)
 * - Use color="#241D42" (deep purple) for light/white backgrounds
 * 
 * Supports both standalone mark (variant="mark") and full logo (variant="full").
 */
export function LogoMono({
  size = 220,
  color = "#F3EDE0",
  variant = "full",
  className = "",
  style = {},
  ...props
}) {
  const isFull = variant === "full";

  // Dimensions
  const width = typeof size === "number" ? size : parseFloat(size) || (isFull ? 220 : 48);
  const height = isFull ? Math.round(width * (56 / 220)) : width;
  const viewBox = isFull ? "0 0 220 56" : "0 0 100 100";

  // Mark SVG elements scaled according to variant
  const markContent = (
    <g>
      {/* 1. Rhythmic Orbit Track */}
      <circle
        cx="50"
        cy="50"
        r="32"
        stroke={color}
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeDasharray="16 8"
        opacity="0.9"
      />

      {/* 2. Central Sacred Diya Flame */}
      <path
        d="M50 42 C50 47 47 50 42 50 C47 50 50 53 50 58 C50 53 53 50 58 50 C53 50 50 47 50 42 Z"
        fill={color}
      />
      <circle cx="50" cy="50" r="2.2" fill={color === "#F3EDE0" ? "#14101F" : "#FFFFFF"} />

      {/* 3. Welcoming Hand Arc */}
      <path
        d="M51 18 C62 19 70 24 76 33"
        stroke={color}
        strokeWidth="3.8"
        strokeLinecap="round"
      />

      {/* 4. 7 Companion Dancers in the Circle */}
      <circle cx="82" cy="50" r="5.2" fill={color} />
      <circle cx="73" cy="73" r="5.2" fill={color} />
      <circle cx="50" cy="82" r="5.2" fill={color} />
      <circle cx="27" cy="73" r="5.2" fill={color} />
      <circle cx="18" cy="50" r="5.2" fill={color} />
      <circle cx="27" cy="27" r="5.2" fill={color} />
      <circle cx="50" cy="18" r="5.2" fill={color} />

      {/* 5. The Solo Saathi Newcomer (Distinct halo + solid node) */}
      <circle
        cx="74"
        cy="26"
        r="8.8"
        stroke={color}
        strokeWidth="1.8"
        strokeDasharray="2.5 2"
      />
      <circle cx="74" cy="26" r="6.2" fill={color} />
      {/* Knockout center to ensure the solo dancer stands out in flat ink */}
      <circle cx="72.2" cy="24.2" r="2" fill={color === "#F3EDE0" ? "#14101F" : "#FFFFFF"} />
    </g>
  );

  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
      aria-label="SoloSaathi Circle Monochrome Logo"
      role="img"
      {...props}
    >
      <defs>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&display=swap');
            .ss-mono-title {
              font-family: 'Baloo 2', cursive, -apple-system, sans-serif;
              font-weight: 700;
              font-size: 19.5px;
              letter-spacing: 0.2px;
            }
            .ss-mono-sub {
              font-family: 'Baloo 2', cursive, -apple-system, sans-serif;
              font-weight: 700;
              font-size: 11px;
              letter-spacing: 3.2px;
            }
          `}
        </style>
      </defs>

      {isFull ? (
        <>
          {/* Scaled mark for the 220x56 lockup */}
          <g transform="translate(5, 5) scale(0.46)">
            {markContent}
          </g>

          {/* Wordmark in uniform monochrome color */}
          <text x="60" y="27" fill={color} className="ss-mono-title">
            Solo Saathi
          </text>
          <text x="61" y="44" fill={color} className="ss-mono-sub" opacity="0.85">
            CIRCLE
          </text>
        </>
      ) : (
        markContent
      )}
    </svg>
  );
}

export default LogoMono;
