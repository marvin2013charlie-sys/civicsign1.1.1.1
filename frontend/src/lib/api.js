import axios from "axios";

// Use a same-origin "/api" base when the configured backend URL points to a
// different origin than the page (e.g. workspace URL baked into a deployed
// build). Kubernetes ingress routes /api/* to the backend on every preview
// and deployment, so a relative URL works in all environments and avoids
// cross-origin CORS issues with credentialed requests.
const ENV_URL = process.env.REACT_APP_BACKEND_URL || "";
let BACKEND_URL = ENV_URL;
try {
  if (typeof window !== "undefined" && ENV_URL) {
    const envOrigin = new URL(ENV_URL).origin;
    if (envOrigin !== window.location.origin) {
      BACKEND_URL = ""; // fall back to same-origin
    }
  }
} catch {
  BACKEND_URL = ""; // malformed URL -> same-origin
}
export const API_BASE = `${BACKEND_URL}/api`;
// Bare backend origin (no `/api` suffix) — used for absolute media URLs like avatars.
export const API_ORIGIN = BACKEND_URL;

const api = axios.create({ baseURL: API_BASE, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cs_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export async function fetchPdfBlobUrl(path) {
  const res = await api.get(path, { responseType: "blob" });
  return URL.createObjectURL(res.data);
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
