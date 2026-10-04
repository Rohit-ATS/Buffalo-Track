/**
 * Trigger side of the branded route wipe. Kept apart from the component that
 * renders it so neither file mixes a component export with a plain function
 * (which costs Fast Refresh, per react-refresh/only-export-components).
 */

type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeToRouteTransition(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Plays the wipe. Safe anywhere: a no-op during SSR, and a no-op for anyone
 * who asked for reduced motion.
 */
export function playRouteTransition() {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  listeners.forEach((listener) => listener());
}
