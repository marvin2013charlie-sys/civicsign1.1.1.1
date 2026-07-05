import axios from "axios";

// Backend base URL. In production set REACT_APP_BACKEND_URL to the API origin
// (e.g. https://api.civicsign.co.uk) — requests go there with a Bearer token.
// When unset (local dev), we use a relative "/api" so setupProxy.js forwards
// to the local backend. Trailing slashes are trimmed so `${BACKEND_URL}/api`
// is always well-formed.
const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "");
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

// Save a file (returned by an authenticated API path) to the user's computer.
// Sanitizes the filename and cleans up the object URL afterwards.
export async function downloadFile(path, filename) {
  const res = await api.get(path, { responseType: "blob" });
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
