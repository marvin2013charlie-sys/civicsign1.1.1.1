import React, { useEffect, useRef, useState } from "react";
import { BRAND_ACCENT_CYCLES, BRAND_ACCENT_INTERVAL_MS } from "@/lib/brandAccent";
import { cn } from "@/lib/utils";

const BRAND_ORANGE = "var(--c-accent)";
const BRAND_GREEN = "var(--c-primary)";

/**
 * Cycles text colour between CivicSign orange and green on a fixed interval.
 * @param {number} cycles - Full orange→green→orange rounds; Infinity keeps going.
 * @param {number} intervalMs - Milliseconds on each colour (default 5000).
 */
export function AlternatingBrandColor({
  children,
  as: Component = "span",
  className,
  intervalMs = BRAND_ACCENT_INTERVAL_MS,
  cycles = BRAND_ACCENT_CYCLES,
  startOrange = true,
  ...props
}) {
  const [isOrange, setIsOrange] = useState(startOrange);
  const roundsRef = useRef(0);
  const reducedMotion = useRef(
    typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (reducedMotion.current || cycles === 0) return undefined;

    const id = window.setInterval(() => {
      setIsOrange((prev) => {
        const next = !prev;
        if (!next) {
          roundsRef.current += 1;
          if (Number.isFinite(cycles) && roundsRef.current >= cycles) {
            window.clearInterval(id);
          }
        }
        return next;
      });
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [intervalMs, cycles]);

  const color = reducedMotion.current
    ? BRAND_GREEN
    : isOrange
      ? BRAND_ORANGE
      : BRAND_GREEN;

  return (
    <Component
      className={cn("transition-colors duration-700 ease-in-out", className)}
      style={{ color }}
      {...props}
    >
      {children}
    </Component>
  );
}