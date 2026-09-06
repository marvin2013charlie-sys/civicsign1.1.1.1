import { useCallback, useEffect, useRef } from "react";
import {
  buildAdminTourSteps,
  buildAppTourSteps,
  consumeTourPending,
  hasAutoTourBeenOffered,
  hasCompletedTour,
  markAutoTourOffered,
  markTourCompleted,
  peekTourPending,
} from "@/lib/productTour";

function isMobileNav() {
  return window.matchMedia("(max-width: 1023px)").matches;
}

function sessionAutoStartKey(userId, surface) {
  return `cs_tour_autostart_${userId}_${surface}`;
}

async function waitForTourAnchors(timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (document.querySelector('[data-testid="nav-dashboard"]')) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

export function useProductTour({ surface, user, impersonation, onOpenMobileNav }) {
  const driverRef = useRef(null);
  const autoStartRef = useRef(false);

  const startTour = useCallback(
    async (force = false) => {
      const userId = user?.user_id;
      if (!userId || impersonation) return false;
      if (!force && hasCompletedTour(user, surface)) return false;
      if (driverRef.current?.isActive()) return false;

      if (isMobileNav() && onOpenMobileNav) {
        onOpenMobileNav();
        await new Promise((resolve) => setTimeout(resolve, 350));
      }

      if (!force) {
        const ready = await waitForTourAnchors();
        if (!ready) return false;
      }

      const steps =
        surface === "admin" ? buildAdminTourSteps(user) : buildAppTourSteps(user);

      if (steps.length === 0) return false;

      const [{ driver }, _css] = await Promise.all([
        import("driver.js"),
        import("driver.js/dist/driver.css"),
      ]);

      const driverObj = driver({
        showProgress: true,
        animate: true,
        smoothScroll: true,
        allowClose: true,
        overlayOpacity: 0.65,
        stagePadding: 10,
        stageRadius: 12,
        popoverClass: "cs-product-tour-popover",
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Done",
        progressText: "{{current}} of {{total}}",
        steps,
        onDestroyed: () => {
          markTourCompleted(user, surface);
          markAutoTourOffered(userId, surface);
          driverRef.current = null;
        },
      });

      driverRef.current = driverObj;
      driverObj.drive();
      return true;
    },
    [surface, user, impersonation, onOpenMobileNav],
  );

  // Auto-start only once after register / email verification — never on routine logins.
  useEffect(() => {
    const userId = user?.user_id;
    if (!userId || impersonation) return undefined;
    if (hasAutoTourBeenOffered(user, surface)) return undefined;

    const autoKey = sessionAutoStartKey(userId, surface);
    if (sessionStorage.getItem(autoKey)) return undefined;
    if (!peekTourPending(surface, userId)) return undefined;

    let cancelled = false;

    const run = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (cancelled || autoStartRef.current) return;
      autoStartRef.current = true;
      sessionStorage.setItem(autoKey, "1");

      let started = await startTour(false);
      if (!started && !cancelled) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        if (!cancelled) started = await startTour(false);
      }

      if (started) {
        consumeTourPending(surface, userId);
        markAutoTourOffered(userId, surface);
      } else {
        sessionStorage.removeItem(autoKey);
        autoStartRef.current = false;
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [user, surface, impersonation, startTour]);

  useEffect(() => {
    return () => {
      if (driverRef.current?.isActive()) {
        driverRef.current.destroy();
      }
    };
  }, []);

  return { startTour };
}