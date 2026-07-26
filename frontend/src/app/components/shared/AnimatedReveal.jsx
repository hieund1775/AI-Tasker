// =============================================================================
// AnimatedReveal — lightweight scroll-reveal wrapper with spring animations.
// Uses Motion library for smooth entry animations with spring physics.
// Falls back gracefully under prefers-reduced-motion.
//
// Props:
//   children   — content to reveal
//   className  — additional classes on the wrapper
//   delay      — stagger delay index (multiplied by 80ms)
//   direction  — "up" (default) | "left" | "right" | "scale" | "fade"
//   threshold  — visibility threshold (default 0.1)
//   once       — animate only once (default true)
//   duration   — animation duration in seconds (default 0.5)
// =============================================================================

"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "../../lib/utils.js";

const DIRECTION_VARIANTS = {
  up: { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } },
  left: { hidden: { opacity: 0, x: -24 }, visible: { opacity: 1, x: 0 } },
  right: { hidden: { opacity: 0, x: 24 }, visible: { opacity: 1, x: 0 } },
  scale: { hidden: { opacity: 0, scale: 0.92 }, visible: { opacity: 1, scale: 1 } },
  fade: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
};

export function AnimatedReveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
  threshold = 0.1,
  once = true,
  duration = 0.55,
}) {
  const ref = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const variant = DIRECTION_VARIANTS[direction] || DIRECTION_VARIANTS.up;

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: threshold }}
      variants={{
        hidden: variant.hidden,
        visible: {
          ...variant.visible,
          transition: {
            duration,
            delay: delay * 0.08,
            ease: [0.16, 1, 0.3, 1],
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export default AnimatedReveal;
