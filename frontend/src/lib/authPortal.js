const REMEMBER_EMAIL_KEY = "cs_remember_email";
const AUTH_NEXT_KEY = "cs_auth_next";

/** Only allow in-app relative paths (prevents open redirects). */
export function sanitizeNextUrl(next) {
  if (!next || typeof next !== "string") return null;
  const path = next.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  // Marketing home is not a post-auth destination — send users to the app instead.
  if (path === "/" || path === "") return null;
  if (path.startsWith("/login") || path.startsWith("/register") || path.startsWith("/admin")) return null;
  return path;
}

/** True for internal team accounts (admin console), not customers. */
export function isInternalTeamMember(user) {
  return !!(user && user !== false && (user.role === "admin" || user.role === "staff"));
}

/** Customer portal entry — used on the public marketing header. */
export const CUSTOMER_DASHBOARD_PATH = "/dashboard";

/** Default app home after sign-in (role-aware). */
export function getAppHomePath(user) {
  if (!user || user === false) return "/login";
  if (isInternalTeamMember(user)) return "/admin";
  return CUSTOMER_DASHBOARD_PATH;
}

/** Marketing site header CTA — customers always see Dashboard, never Admin console. */
export function getMarketingHeaderCta(user) {
  if (!user || user === false) {
    return { label: "Start free", shortLabel: "Free", to: "/register", testId: "nav-getstarted-button" };
  }
  return {
    label: "Dashboard",
    shortLabel: "Dashboard",
    to: CUSTOMER_DASHBOARD_PATH,
    testId: "nav-dashboard-button",
  };
}

/** Where to land after sign-in / verification — never the public landing page. */
export function getPostAuthDestination(next, user = null, fallback = null) {
  const safeNext = sanitizeNextUrl(next);
  if (safeNext) return safeNext;
  if (user && user !== false) return getAppHomePath(user);
  return fallback || "/dashboard";
}

export function getAuthNext(searchParams) {
  const fromQuery = sanitizeNextUrl(searchParams?.get?.("next"));
  if (fromQuery) return fromQuery;
  return sanitizeNextUrl(sessionStorage.getItem(AUTH_NEXT_KEY));
}

export function persistAuthNext(next) {
  const safe = sanitizeNextUrl(next);
  if (safe) sessionStorage.setItem(AUTH_NEXT_KEY, safe);
  else sessionStorage.removeItem(AUTH_NEXT_KEY);
}

export function clearAuthNext() {
  sessionStorage.removeItem(AUTH_NEXT_KEY);
}

export function nextQueryString(next) {
  const safe = sanitizeNextUrl(next);
  return safe ? `?next=${encodeURIComponent(safe)}` : "";
}

/** Build ?next=…&email=… for auth sub-routes. */
export function authQueryString({ next, email } = {}) {
  const params = new URLSearchParams();
  const safeNext = sanitizeNextUrl(next);
  if (safeNext) params.set("next", safeNext);
  if (email?.trim()) params.set("email", email.trim().toLowerCase());
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function getRememberedEmail() {
  try {
    return localStorage.getItem(REMEMBER_EMAIL_KEY) || "";
  } catch {
    return "";
  }
}

export function setRememberedEmail(email, remember) {
  try {
    if (remember && email) localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim().toLowerCase());
    else localStorage.removeItem(REMEMBER_EMAIL_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}