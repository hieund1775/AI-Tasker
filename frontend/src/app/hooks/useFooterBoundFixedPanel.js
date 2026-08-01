import { useCallback, useEffect, useRef, useState } from "react";

const MIN_TOP_GAP = 92;
const MAX_PANEL_HEIGHT = 896;

export function useFooterBoundFixedPanel(isActive, topAnchorRef = null) {
  const anchorRef = useRef(null);
  const [style, setStyle] = useState(null);

  const updateStyle = useCallback(() => {
    if (!isActive || !anchorRef.current || window.innerWidth < 1024) {
      setStyle(null);
      return;
    }

    const anchorRect = anchorRef.current.getBoundingClientRect();
    const boundaryRect = topAnchorRef?.current?.getBoundingClientRect() || anchorRect;
    const maxViewportHeight = Math.max(0, window.innerHeight - MIN_TOP_GAP);
    const boundaryHeight = Math.max(0, boundaryRect.height);
    const height = Math.min(MAX_PANEL_HEIGHT, maxViewportHeight, boundaryHeight);
    const minTop = Math.max(MIN_TOP_GAP, boundaryRect.top);
    const maxTop = Math.max(boundaryRect.top, boundaryRect.bottom - height);
    const top = Math.round(Math.min(minTop, maxTop));

    setStyle({
      position: "fixed",
      left: `${anchorRect.left}px`,
      top: `${top}px`,
      width: `${anchorRect.width}px`,
      height: `${height}px`,
      minHeight: 0,
      transition: "top 120ms ease",
      zIndex: 30,
    });
  }, [isActive, topAnchorRef]);

  useEffect(() => {
    updateStyle();
    if (!isActive) return undefined;

    window.addEventListener("resize", updateStyle);
    window.addEventListener("scroll", updateStyle, { passive: true });

    let resizeObserver = null;
    if (anchorRef.current && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateStyle);
      resizeObserver.observe(anchorRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateStyle);
      window.removeEventListener("scroll", updateStyle);
      resizeObserver?.disconnect();
    };
  }, [isActive, updateStyle]);

  return { anchorRef, fixedPanelStyle: style };
}
