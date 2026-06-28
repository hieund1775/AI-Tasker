// =============================================================================
// AnimatedReveal — lightweight scroll-reveal wrapper for list items & cards.
//
// Uses native CSS `.reveal-hidden` / `.reveal-visible` classes with
// IntersectionObserver for zero-dependency scroll-triggered animations.
//
// Props:
//   children   — content to reveal
//   className  — additional classes on the wrapper
//   delay      — stagger delay index (multiplied by 80ms, e.g. 0→0ms, 2→160ms)
//   direction  — "up" (default) | "left" | "right"
//   threshold  — visibility threshold (default 0.1)
//   once       — animate only once (default true)
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils.js";

const DIRECTION_STYLES = {
  up: "translate-y-4",
  left: "-translate-x-4",
  right: "translate-x-4",
};

export function AnimatedReveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
  threshold = 0.1,
  once = true,
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.unobserve(el);
  }, [threshold, once]);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-500 ease-out",
        DIRECTION_STYLES[direction] || DIRECTION_STYLES.up,
        visible ? "opacity-100 translate-y-0 translate-x-0" : "opacity-0",
        className,
      )}
      style={{
        transitionDelay: `${delay * 80}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default AnimatedReveal;
