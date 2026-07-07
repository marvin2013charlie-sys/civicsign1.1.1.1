/**
 * JWT storage: memory + sessionStorage so refresh keeps the session in the same tab.
 * HttpOnly cookies remain the primary mechanism; Bearer is restored after reload.
 */
let accessToken = null;
let adminToken = null;

const ACCESS_KEY = "cs_access";

function readStoredAccess() {
  try {
    return sessionStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

function writeStoredAccess(token) {
  try {
    if (token) sessionStorage.setItem(ACCESS_KEY, token);
    else sessionStorage.removeItem(ACCESS_KEY);
  } catch {
    /* ignore */
  }
}

export function getAccessToken() {
  if (accessToken) return accessToken;
  const stored = readStoredAccess();
  if (stored) accessToken = stored;
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || null;
  writeStoredAccess(accessToken);
}

export function clearTokens() {
  accessToken = null;
  adminToken = null;
  writeStoredAccess(null);
}

/** Remove legacy localStorage keys from older builds. */
export function purgeLegacyTokenStorage() {
  try {
    localStorage.removeItem("cs_token");
    localStorage.removeItem("cs_admin_token");
    localStorage.removeItem("cs_impersonation");
  } catch {
    /* ignore */
  }
}