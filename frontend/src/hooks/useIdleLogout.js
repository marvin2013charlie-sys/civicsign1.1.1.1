import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click", "wheel"];
const ACTIVITY_KEY = "cs_last_activity";

/**
 * Logs the user out after `idleMs` of inactivity (default 10 min). Shows a
 * toast warning `warnMs` before the auto-logout so the user has a chance to
 * stay signed in. Cross-tab safe: activity in one tab keeps every tab alive.
 */
export function useIdleLogout({ idleMs = 10 * 60 * 1000, warnMs = 60 * 1000 } = {}) {
  const { user, logout, impersonation } = useAuth();
  const navigate = useNavigate();
  const timersRef = useRef({ warn: null, logout: null });
  const warnedRef = useRef(false);

  useEffect(() => {
    // Only arm the timer for authenticated users.
    if (!user) return undefined;
    const effectiveIdle = impersonation ? idleMs * 2 : idleMs;

    const clearTimers = () => {
      clearTimeout(timersRef.current.warn);
      clearTimeout(timersRef.current.logout);
      timersRef.current.warn = null;
      timersRef.current.logout = null;
    };

    const doLogout = async () => {
      clearTimers();
      toast.dismiss("idle-warning");
      try {
        await logout();
      } finally {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        navigate(`/login?reason=idle&next=${next}`, { replace: true });
      }
    };

    const showWarning = () => {
      if (warnedRef.current) return;
      warnedRef.current = true;
      const seconds = Math.round(warnMs / 1000);
      toast.warning(`You'll be signed out in ${seconds} seconds due to inactivity.`, {
        id: "idle-warning",
        description: "Move the mouse or press a key to stay signed in.",
        duration: warnMs,
      });
    };

    const arm = () => {
      clearTimers();
      timersRef.current.warn = setTimeout(showWarning, Math.max(0, effectiveIdle - warnMs));
      timersRef.current.logout = setTimeout(doLogout, effectiveIdle);
    };

    const noteActivity = () => {
      warnedRef.current = false;
      toast.dismiss("idle-warning");
      try { localStorage.setItem(ACTIVITY_KEY, String(Date.now())); } catch { /* ignore */ }
      arm();
    };

    // Initial timer + initial activity stamp
    try { localStorage.setItem(ACTIVITY_KEY, String(Date.now())); } catch { /* ignore */ }
    arm();

    ACTIVITY_EVENTS.forEach((ev) =>
      window.addEventListener(ev, noteActivity, { passive: true })
    );

    // Cross-tab activity sync, if another tab logs activity, reset our timer.
    const onStorage = (e) => {
      if (e.key === ACTIVITY_KEY) {
        warnedRef.current = false;
        toast.dismiss("idle-warning");
        arm();
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, noteActivity));
      window.removeEventListener("storage", onStorage);
    };
  }, [user, impersonation, idleMs, warnMs, logout, navigate]);
}

export default useIdleLogout;
