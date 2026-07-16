import axios from "axios";
import { getAccessToken, setAccessToken, clearTokens, purgeLegacyTokenStorage } from "@/lib/tokenStore";
import { formatApiError } from "./apiErrors";

purgeLegacyTokenStorage();

// Backend base URL. In production set REACT_APP_BACKEND_URL to the API origin
// (e.g. https://api.civicsign.co.uk) — requests go there with a Bearer token.
// When unset (local dev), we use a relative "/api" so setupProxy.js forwards
// to the local backend. Trailing slashes are trimmed so `${BACKEND_URL}/api`
// is always well-formed.
const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "");
export const API_BASE = `${BACKEND_URL}/api`;
// Bare backend origin (no `/api` suffix), used for absolute media URLs like avatars.
export const API_ORIGIN = BACKEND_URL;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  // Avoid infinite spinners when the backend or dev proxy is down/unreachable.
  timeout: 30_000,
});

/** Public client for token-based signer routes, no session cookies or Bearer. */
export const publicApi = axios.create({ baseURL: API_BASE, withCredentials: false, timeout: 30_000 });

api.interceptors.request.use((config) => {
  // HttpOnly cookies are the primary auth mechanism. Bearer is not sent by default.
  return config;
});

let refreshPromise = null;

function redirectToSignIn() {
  if (typeof window === "undefined") return;
  const pathname = window.location.pathname;
  const isUserAuthPage = pathname.startsWith("/login")
    || pathname.startsWith("/register")
    || pathname.startsWith("/forgot-password")
    || pathname.startsWith("/verify-email")
    || pathname.startsWith("/reset-password");
  const isAdminAuthPage = pathname.startsWith("/admin/login");
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  if (isUserAuthPage || isAdminAuthPage) return;
  if (isAdminArea) {
    window.location.replace("/admin/login");
    return;
  }
  const next = encodeURIComponent(pathname + window.location.search);
  window.location.replace(`/login?reason=session_expired&next=${next}`);
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = api
      .post("/auth/refresh", {}, { _skipAuthRefresh: true })
      .then((res) => {
        if (res.data?.access_token) setAccessToken(res.data.access_token);
        return res.data?.access_token || true;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err.response?.status;
    const config = err.config || {};
    const path = config.url || "";

    if (status !== 401) return Promise.reject(err);

    const isAuthAttempt = path.includes("/auth/login") || path.includes("/auth/register");
    const isPublicSigner = path.includes("/sign/");
    const isRefreshCall = path.includes("/auth/refresh");

    if (isAuthAttempt || isPublicSigner || config._skipAuthRefresh) {
      return Promise.reject(err);
    }

    if (!config._retry && !isRefreshCall) {
      config._retry = true;
      try {
        await refreshAccessToken();
        return api(config);
      } catch {
        clearTokens();
        if (!path.includes("/auth/me")) redirectToSignIn();
        return Promise.reject(err);
      }
    }

    clearTokens();
    if (!path.includes("/auth/me") && !path.includes("/auth/refresh")) {
      redirectToSignIn();
    }
    return Promise.reject(err);
  },
);

export async function restoreSession() {
  getAccessToken();
  try {
    const { data } = await api.get("/auth/me", { timeout: 10_000 });
    return data;
  } catch (err) {
    if (err.response?.status !== 401) throw err;
    try {
      await refreshAccessToken();
      const { data } = await api.get("/auth/me", { timeout: 10_000 });
      return data;
    } catch {
      clearTokens();
      return null;
    }
  }
}

export { extractApiDetail, formatApiError } from "./apiErrors";

async function blobLooksLikeApiError(blob) {
  if (!blob || blob.size > 4096) return null;
  const type = (blob.type || "").toLowerCase();
  if (!type.includes("json") && !type.includes("text")) return null;
  try {
    const text = await blob.text();
    const data = JSON.parse(text);
    return formatApiError(data);
  } catch {
    return null;
  }
}

/** Parse axios errors when responseType is blob (errors arrive as Blob, not JSON). */
export async function parseBlobApiError(err) {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    const parsed = await blobLooksLikeApiError(data);
    if (parsed) return parsed;
    const type = (data.type || "").toLowerCase();
    if (type.includes("text") || type.includes("json")) {
      const text = (await data.text()).trim();
      if (text) return text;
    }
  }
  return formatApiError(err);
}

async function blobToObjectUrl(res) {
  const ct = (res.headers["content-type"] || "").toLowerCase();
  if (ct.includes("application/json") || ct.includes("text/plain")) {
    const errText = await res.data.text();
    try {
      throw new Error(formatApiError(JSON.parse(errText)));
    } catch (parseErr) {
      if (parseErr instanceof SyntaxError) throw new Error(errText || "Could not load document");
      throw parseErr;
    }
  }
  const apiErr = await blobLooksLikeApiError(res.data);
  if (apiErr) throw new Error(apiErr);
  return URL.createObjectURL(res.data);
}

export async function fetchPdfBlobUrl(path) {
  const res = await api.get(path, {
    responseType: "blob",
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
  });
  return blobToObjectUrl(res);
}

export async function fetchPublicPdfBlobUrl(path) {
  const res = await publicApi.get(path, { responseType: "blob" });
  return blobToObjectUrl(res);
}

// Save a file (returned by an authenticated API path) to the user's computer.
// Sanitizes the filename and cleans up the object URL afterwards.
export async function downloadFile(path, filename) {
  const res = await api.get(path, {
    responseType: "blob",
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
  });
  const safe = String(filename || "document")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim() || "document";
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = safe;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadCsv(path, filename) {
  const res = await api.get(path, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default api;
