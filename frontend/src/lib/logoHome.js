/** Prefixes for authenticated app surfaces — logo returns to in-app home, not marketing. */
const IN_APP_PREFIXES = [
  "/dashboard",
  "/new",
  "/documents",
  "/templates",
  "/contacts",
  "/manage-pdf",
  "/reports",
  "/usage",
  "/organisation",
  "/settings",
  "/prepare/",
  "/send/",
  "/envelope/",
];

/** True when the current URL is inside the signed-in product (or admin console). */
export function isInAppArea(pathname) {
  if (!pathname) return false;
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    return true;
  }
  return IN_APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

/**
 * Logo destination: marketing home on public pages; in-app home when logged in inside the product.
 * @param {object|false|null} user AuthContext user
 * @param {string} pathname Current location pathname
 */
export function resolveLogoHomePath(user, pathname) {
  if (!user || user === false) return "/";
  if (!isInAppArea(pathname)) return "/";
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    return "/admin";
  }
  return "/dashboard";
}