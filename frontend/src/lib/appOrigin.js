/**
 * Canonical frontend origin for sign links and redirect base_url payloads.
 * Prefers REACT_APP_SITE_URL in production builds; falls back to the browser origin.
 */
export function getAppOrigin() {
  const configured = (
    process.env.REACT_APP_SITE_URL
    || process.env.REACT_APP_FRONTEND_URL
    || ""
  ).trim().replace(/\/+$/, "");
  if (configured && /^https?:\/\//i.test(configured)) {
    try {
      return new URL(configured).origin;
    } catch {
      /* use window origin */
    }
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "http://localhost:3000";
}