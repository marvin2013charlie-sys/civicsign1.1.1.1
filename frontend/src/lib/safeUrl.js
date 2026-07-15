import { getAppOrigin } from "@/lib/appOrigin";

const STRIPE_HOSTS = new Set([
  "checkout.stripe.com",
  "billing.stripe.com",
  "pay.stripe.com",
  "invoice.stripe.com",
]);

/** Allow http(s) and same-site relative paths; block javascript/data URLs. */
export function isSafeExternalHref(href) {
  if (!href || typeof href !== "string") return false;
  const t = href.trim();
  if (/^(javascript|data|vbscript):/i.test(t)) return false;
  if (t.startsWith("/") && !t.startsWith("//")) return true;
  try {
    const u = new URL(t);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function isSafeSignRedirect(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const base = getAppOrigin();
    const u = new URL(url, base);
    const origin = new URL(base).origin;
    return u.origin === origin && /^\/sign\/[a-f0-9]{16,}$/i.test(u.pathname);
  } catch {
    return false;
  }
}

export function isSafeStripeRedirect(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && STRIPE_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

export function assignSignRedirect(url) {
  if (!isSafeSignRedirect(url)) {
    throw new Error("Invalid signing redirect URL");
  }
  window.location.href = url;
}

export function assignStripeCheckout(url) {
  if (!isSafeStripeRedirect(url)) {
    throw new Error("Invalid checkout redirect URL");
  }
  window.location.assign(url);
}

/** Redirect to Stripe Checkout or hosted invoice payment pages. */
export function assignStripePayment(url) {
  assignStripeCheckout(url);
}