import { useState, useEffect } from 'react';

/**
 * useDeviceType — Viewport Classification Hook
 *
 * Provides responsive breakpoint flags for adaptive layout rendering:
 * - isMobile: < 768px (festival phone screens)
 * - isTablet: 768px - 1023px
 * - isDesktop: >= 1024px
 */
export function useDeviceType() {
  const getDevice = () => {
    if (typeof window === 'undefined') {
      return { isMobile: true, isTablet: false, isDesktop: false, width: 360, height: 740 };
    }
    const width = window.innerWidth;
    const height = window.innerHeight;
    return {
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      width,
      height,
    };
  };

  const [device, setDevice] = useState(getDevice);

  useEffect(() => {
    let timeoutId = null;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setDevice(getDevice());
      }, 100);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return device;
}

export default useDeviceType;
