import { useEffect, useRef, useState } from "react";

/** Fast refresh for live counters (usage, team roster). */
export const POLL_FAST_MS = 2000;

/** Slower refresh for rarely-changing data (e.g. contract metadata). */
export const POLL_SLOW_MS = 15000;

/**
 * Run `callback` on an interval while `enabled`.
 * Skips ticks when the browser tab is hidden (unless pauseWhenHidden is false).
 */
export function usePoll(callback, intervalMs = POLL_FAST_MS, {
  enabled = true,
  pauseWhenHidden = true,
} = {}) {
  const saved = useRef(callback);
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState !== "hidden",
  );

  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!pauseWhenHidden || typeof document === "undefined") return undefined;
    const onVisibility = () => {
      setPageVisible(document.visibilityState !== "hidden");
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [pauseWhenHidden]);

  const active = enabled && (!pauseWhenHidden || pageVisible);

  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => saved.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, active]);
}