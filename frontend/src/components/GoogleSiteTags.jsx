import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  getGaMeasurementId,
  syncGoogleAnalyticsConsent,
  trackPageView,
} from "@/lib/googleAnalytics";

const GSC_VERIFICATION = (process.env.REACT_APP_GOOGLE_SITE_VERIFICATION || "").trim();

function upsertGoogleSiteVerification() {
  if (!GSC_VERIFICATION) return;
  let el = document.head.querySelector('meta[name="google-site-verification"]');
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", "google-site-verification");
    document.head.appendChild(el);
  }
  el.setAttribute("content", GSC_VERIFICATION);
}

/**
 * Loads Google Analytics (consent-gated) and injects Search Console verification meta.
 */
export function GoogleSiteTags() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    upsertGoogleSiteVerification();
    syncGoogleAnalyticsConsent();

    const onConsent = () => syncGoogleAnalyticsConsent();
    window.addEventListener("cs-cookie-consent", onConsent);
    return () => window.removeEventListener("cs-cookie-consent", onConsent);
  }, []);

  useEffect(() => {
    if (!getGaMeasurementId()) return undefined;
    const t = setTimeout(() => {
      trackPageView(pathname + search);
    }, 0);
    return () => clearTimeout(t);
  }, [pathname, search]);

  return null;
}