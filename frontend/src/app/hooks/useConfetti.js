import { useCallback } from "react";
import confetti from "canvas-confetti";

/**
 * useConfetti — fires a subtle confetti burst for celebrations.
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
    const defaults = {
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
      colors: ["#3b82f6", "#10b981", "#f59e0b"],
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
