const GA_ID = (process.env.REACT_APP_GA_MEASUREMENT_ID || "").trim();

let loaded = false;

export function getGaMeasurementId() {
  return GA_ID;
}

export function hasAnalyticsConsent() {
  try {
    return localStorage.getItem("cs_cookie_consent") === "all";
  } catch {
    return false;
  }
}

function ensureDataLayer() {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }
}

/** Default consent: analytics denied until the user accepts optional cookies. */
export function initGoogleConsentDefaults() {
  if (!GA_ID) return;
  ensureDataLayer();
  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500,
  });
}

function loadGtagScript() {
  if (loaded || !GA_ID) return;
  loaded = true;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(script);
  ensureDataLayer();
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, {
    send_page_view: false,
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
}

export function grantAnalyticsConsent() {
  if (!GA_ID) return;
  ensureDataLayer();
  window.gtag("consent", "update", { analytics_storage: "granted" });
  loadGtagScript();
}

export function denyAnalyticsConsent() {
  if (!GA_ID) return;
  ensureDataLayer();
  window.gtag("consent", "update", { analytics_storage: "denied" });
}

export function syncGoogleAnalyticsConsent() {
  if (!GA_ID) return;
  initGoogleConsentDefaults();
  if (hasAnalyticsConsent()) {
    grantAnalyticsConsent();
  } else {
    denyAnalyticsConsent();
  }
}

export function trackPageView(path, title) {
  if (!GA_ID || !hasAnalyticsConsent() || !window.gtag) return;
  const pagePath = path || window.location.pathname + window.location.search;
  window.gtag("event", "page_view", {
    page_path: pagePath,
    page_title: title || document.title,
    page_location: window.location.href,
  });
}