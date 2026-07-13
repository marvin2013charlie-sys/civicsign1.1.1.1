import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

/** Only full-bleed section bands flip the header — not bottom CTA cards or inline ink cards. */
const DARK_BAND_SELECTOR = '[data-site-header-dark="band"]';

function isDarkBandBehindHeader(header) {
  const rect = header.getBoundingClientRect();
  // Sample the page band directly under the fixed header (not through the bar itself).
  const sampleY = Math.min(window.innerHeight - 1, rect.bottom + 2);
  const sampleXs = [
    rect.left + 72,
    rect.left + rect.width * 0.3,
    rect.left + rect.width * 0.5,
    rect.left + rect.width * 0.7,
    rect.right - 120,
  ];

  for (const x of sampleXs) {
    const el = document.elementFromPoint(x, sampleY);
    if (el?.closest(DARK_BAND_SELECTOR)) return true;
  }
  return false;
}

/**
 * Detects when the fixed marketing header sits over a full-bleed dark band
 * so logo and nav can invert to white for contrast.
 */
export function useSiteHeaderTheme(headerRef) {
  const [overDark, setOverDark] = useState(false);
  const { pathname } = useLocation();
  const rafRef = useRef(0);
  const mutationTimerRef = useRef(0);

  const measure = useCallback(() => {
    const header = headerRef.current;
    if (!header) return;
    setOverDark(isDarkBandBehindHeader(header));
  }, [headerRef]);

  useEffect(() => {
    const scheduleMeasure = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };

    scheduleMeasure();

    const mutationObserver = new MutationObserver(() => {
      clearTimeout(mutationTimerRef.current);
      mutationTimerRef.current = window.setTimeout(scheduleMeasure, 80);
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure, { passive: true });

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(mutationTimerRef.current);
      mutationObserver.disconnect();
      window.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [headerRef, pathname, measure]);

  return overDark;
}