import { useCallback } from "react";
import confetti from "canvas-confetti";

/**
 * useConfetti - fires a subtle confetti burst for celebrations.
 *
 * Think Stripe dashboard's subtle confetti, not full-screen fireworks.
 * Call fire() on project completion, milestone achievement, etc.
 *
 * Usage:
 *   const { fire } = useConfetti();
 *   fire(); // defaults to center-screen subtle burst
 */
export function useConfetti() {
  const fire = useCallback((options = {}) => {
    const styles = getComputedStyle(document.documentElement);
    const themeColors = ["--accent", "--primary", "--success"]
      .map((token) => styles.getPropertyValue(token).trim())
      .filter(Boolean);

    const defaults = {
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
      colors: themeColors,
      ...options,
    };

    // Subtle burst from center
    confetti({
      ...defaults,
      angle: 60,
      origin: { ...defaults.origin, x: 0 },
    });
    confetti({
      ...defaults,
      angle: 120,
      origin: { ...defaults.origin, x: 1 },
    });
  }, []);

  return { fire };
}
