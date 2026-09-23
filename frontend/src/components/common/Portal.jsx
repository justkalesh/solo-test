import { createPortal } from 'react-dom';

/**
 * Portal — renders children directly into document.body.
 *
 * Use for full-screen overlays (modals, the Beacon). Page content lives inside
 * AppShell's <main>, which has its own stacking context, so a fixed overlay rendered
 * in place can never rise above the sticky NavBar or the mobile BottomNav.
 */
export function Portal({ children }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

export default Portal;
