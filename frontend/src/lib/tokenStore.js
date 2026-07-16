/**
 * Legacy Bearer slot — sessions use HttpOnly cookies; no persistent JWT storage.
 * Impersonation also uses cookies after the security hardening pass.
 */
let accessToken = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || null;
}

export function clearTokens() {
  accessToken = null;
}

/** Remove legacy local/session storage keys from older builds. */
export function purgeLegacyTokenStorage() {
  try {
    localStorage.removeItem("cs_token");
    localStorage.removeItem("cs_admin_token");
    localStorage.removeItem("cs_impersonation");
    sessionStorage.removeItem("cs_access");
  } catch {
    /* ignore */
  }
}