/** Normalize axios/FastAPI errors, never surface "[object Object]" to users. */
export function extractApiDetail(errOrDetail) {
  if (errOrDetail == null) return null;
  const data = errOrDetail.response?.data ?? errOrDetail;
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data;
  if (typeof data !== "object") return data;

  if (typeof data.detail !== "undefined") {
    const inner = data.detail;
    if (inner && typeof inner === "object" && typeof inner.detail === "object") {
      return inner.detail;
    }
    return inner;
  }
  if (typeof data.message === "string" || data.code === "quota_exceeded") return data;
  return data;
}

export function formatApiError(detail) {
  const d = extractApiDetail(detail) ?? detail;
  if (d == null) return "Something went wrong. Please try again.";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    return d
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  }
  if (typeof d === "object") {
    if (typeof d.message === "string" && d.message.trim()) return d.message;
    if (d.code === "quota_exceeded") {
      return d.message || "You've reached your monthly document limit.";
    }
    if (typeof d.detail === "object" && typeof d.detail.message === "string") {
      return d.detail.message;
    }
    if (typeof d.msg === "string") return d.msg;
    if (typeof d.error === "string") return d.error;
  }
  return "Something went wrong. Please try again.";
}