import React, { useMemo } from 'react';
import theme from '../../styles/theme';

/**
 * FestiveBackdrop — SoloSaathi Circle
 *
 * Ambient festival stage-glow and soft-scattered spark field.
 * Viewport-adaptive blur filters, radial light blooms (magenta, amber, cyan),
 * and subtle GPU-accelerated twinkle. Rendered with `pointer-events: none`
 * to strictly prevent any interaction blockage.
 */
export function FestiveBackdrop({ density = 28 }) {
  // Generate deterministic spark coordinates so re-renders don't cause flicker
  const sparks = useMemo(() => {
    const list = [];
    let h = 7;
    const colors = [
      theme.colors.amber,
      theme.colors.pink,
      theme.colors.beginner,
      theme.colors.cyan,
    ];

    for (let i = 0; i < density; i++) {
      h = (h * 1103515245 + 12345) >>> 0;
      const x = h % 100;
      h = (h * 1103515245 + 12345) >>> 0;
      const y = h % 100;
      h = (h * 1103515245 + 12345) >>> 0;
      const c = colors[h % 4];
      const duration = 2.5 + (h % 30) / 10;
      const delay = (h % 20) / 10;
      const size = (h % 3) + 2; // 2px to 4px
      list.push({ x, y, c, id: i, duration, delay, size });
    }
    return list;
  }, [density]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        contain: 'strict',
      }}
    >
      {/* Top-Left Magenta Ambient Glow */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '-15%',
          width: 'clamp(280px, 65vw, 680px)',
          height: 'clamp(240px, 50vh, 520px)',
          background: 'radial-gradient(circle, #DB27772E 0%, #DB277708 50%, transparent 70%)',
          filter: 'blur(clamp(25px, 6vw, 60px))',
          willChange: 'transform',
          transform: 'translate3d(0,0,0)',
        }}
      />

      {/* Top-Right Festive Amber Glow */}
      <div
        style={{
          position: 'absolute',
          top: '5%',
          right: '-20%',
          width: 'clamp(300px, 60vw, 640px)',
          height: 'clamp(260px, 55vh, 560px)',
          background: 'radial-gradient(circle, #E3A54228 0%, #E3A54206 50%, transparent 70%)',
          filter: 'blur(clamp(25px, 6vw, 60px))',
          willChange: 'transform',
          transform: 'translate3d(0,0,0)',
        }}
      />

      {/* Bottom-Center Cyan Stage Accents */}
      <div
        style={{
          position: 'absolute',
          bottom: '-12%',
          left: '15%',
          width: 'clamp(320px, 70vw, 700px)',
          height: 'clamp(220px, 45vh, 480px)',
          background: 'radial-gradient(circle, #00C2D11E 0%, #00C2D104 50%, transparent 70%)',
          filter: 'blur(clamp(30px, 7vw, 70px))',
          willChange: 'transform',
          transform: 'translate3d(0,0,0)',
        }}
      />

      {/* Center Delicate Violet Bloom */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'clamp(350px, 75vw, 800px)',
          height: 'clamp(350px, 75vh, 800px)',
          background: 'radial-gradient(circle, #7C3AED12 0%, transparent 65%)',
          filter: 'blur(clamp(40px, 8vw, 80px))',
          willChange: 'transform',
        }}
      />

      {/* Scattered Ambient Spark Points */}
      {sparks.map((s) => (
        <div
          key={s.id}
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            borderRadius: '50%',
            background: s.c,
            opacity: 0.55,
            boxShadow: `0 0 6px ${s.c}`,
            animation: `sparklePulse ${s.duration}s ease-in-out ${s.delay}s infinite`,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  );
}

export default FestiveBackdrop;
