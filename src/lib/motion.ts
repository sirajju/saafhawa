/**
 * Scroll behaviour that honours the user's reduced-motion preference.
 * CSS `prefers-reduced-motion` rules do not cover JavaScript-driven scrolling.
 */
export function preferredScrollBehavior(): ScrollBehavior {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'smooth';
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}
