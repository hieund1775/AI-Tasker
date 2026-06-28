import { useEffect, useRef, useState } from "react";

/**
 * useScrollReveal — reveals elements as they enter the viewport.
 *
 * Returns a ref to attach to the target element and an isVisible flag.
 * Uses IntersectionObserver for performance.
 *
 * Usage:
 *   const { ref, isVisible } = useScrollReveal({ threshold: 0.1 });
 *   <div ref={ref} className={isVisible ? "animate-fade-in" : "opacity-0"}>
 */
export function useScrollReveal(options = {}) {
  const {
    threshold = 0.1,
    rootMargin = "0px 0px -40px 0px",
    triggerOnce = true,
  } = options;

  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // If already visible on mount, show immediately
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) observer.unobserve(node);
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
}
