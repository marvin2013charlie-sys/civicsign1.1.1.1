import { useCallback, useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import {
  buildAdminTourSteps,
  buildAppTourSteps,
  consumeTourPending,
  hasCompletedTour,
  markTourCompleted,
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
      if (!force && hasCompletedTour(userId, surface)) return false;
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
          markTourCompleted(userId, surface);
          driverRef.current = null;
        },
      });

      driverRef.current = driverObj;
      driverObj.drive();
      sessionStorage.setItem(sessionAutoStartKey(userId, surface), "1");
      return true;
    },
    [surface, user, impersonation, onOpenMobileNav],
  );

  useEffect(() => {
    const userId = user?.user_id;
    if (!userId || impersonation) return undefined;
    if (hasCompletedTour(userId, surface)) return undefined;

    const autoKey = sessionAutoStartKey(userId, surface);
    if (sessionStorage.getItem(autoKey)) return undefined;

    const pending = consumeTourPending(surface);
    const delay = pending ? 500 : 1400;
    let cancelled = false;

    const run = async () => {
      await new Promise((resolve) => setTimeout(resolve, delay));
      if (cancelled || autoStartRef.current) return;
      autoStartRef.current = true;

      let started = await startTour(false);
      if (!started && !cancelled && !sessionStorage.getItem(autoKey)) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        if (!cancelled) started = await startTour(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [user?.user_id, surface, impersonation, startTour]);

  useEffect(() => {
    return () => {
      if (driverRef.current?.isActive()) {
        driverRef.current.destroy();
      }
    };
  }, []);

  return { startTour };
}