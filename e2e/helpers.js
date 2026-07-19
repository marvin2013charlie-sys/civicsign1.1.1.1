// @ts-check
const { expect } = require("@playwright/test");
const fs = require("fs");
const { backendUrl, authFilePath } = require("./auth-env");

const { authEnvSlug } = require("./auth-env");

function e2ePassword(slot, localFallback) {
  const envKey = `E2E_${slot.toUpperCase()}_PASSWORD`;
  if (process.env[envKey]) return process.env[envKey];
  if (process.env.E2E_PILOT_PASSWORD_DEV) return process.env.E2E_PILOT_PASSWORD_DEV;
  if (authEnvSlug() === "production") {
    throw new Error(`Missing ${envKey} (or E2E_PILOT_PASSWORD_DEV) for production E2E`);
  }
  return localFallback;
}

/** Local dev defaults match scripts/reset_dev_data.py — never used against production. */
const USERS = {
  free: { email: "free@civicbot.co.uk", password: e2ePassword("free", "CivicSign2026!Free") },
  pro: { email: "pro@civicbot.co.uk", password: e2ePassword("pro", "CivicSign2026!Pro") },
  business: { email: "business@civicbot.co.uk", password: e2ePassword("business", "CivicSign2026!Biz") },
  orgOwner: { email: "org@civicbot.co.uk", password: e2ePassword("org", "CivicSign2026!Org") },
  orgStaff: { email: "staff@civicbot.co.uk", password: e2ePassword("staff", "CivicSign2026!Staff") },
  admin: { email: "admin@civicbot.co.uk", password: e2ePassword("admin", "CivicSign2026!Admin") },
};

/** Dismiss cookie banner if present (can intercept clicks on bottom CTAs). */
async function dismissCookieBanner(page) {
  await page.evaluate(() => {
    try {
      if (!localStorage.getItem("cs_cookie_consent")) {
        localStorage.setItem("cs_cookie_consent", "essential");
      }
    } catch {
      /* ignore */
    }
  });
  const banner = page.getByTestId("cookie-banner");
  if (await banner.isVisible().catch(() => false)) {
    await page.getByTestId("cookie-essential-button").click({ timeout: 3_000 }).catch(() => {});
  }
}

/** Remove product tour overlays and toasts that intercept Playwright clicks. */
async function clearUiBlockers(page) {
  await dismissCookieBanner(page);
  try {
    // Prefer same-origin proxy so cookies match the browser session
    let me = await page.request.get("/api/auth/me").catch(() => null);
    if (!me || !me.ok()) {
      me = await page.request.get(`${backendUrl}/api/auth/me`).catch(() => null);
    }
    if (me && me.ok()) {
      const user = await me.json();
      if (user?.user_id) {
        await page.evaluate((userId) => {
          localStorage.setItem(`cs_product_tour_v1_${userId}_app`, "1");
          localStorage.setItem(`cs_product_tour_autooffered_v1_${userId}_app`, "1");
          localStorage.removeItem(`cs_tour_pending_user_v1_${userId}_app`);
          sessionStorage.removeItem("cs_tour_pending_app");
          sessionStorage.removeItem(`cs_tour_autostart_${userId}_app`);
        }, user.user_id);
      }
    }
  } catch {
    /* not logged in yet */
  }
  await page.evaluate(() => {
    document.querySelectorAll(".driver-overlay, .driver-popover").forEach((el) => el.remove());
    document.body.classList.remove("driver-active");
  });
  const toastDismiss = page.locator("[data-sonner-toast] button");
  const n = await toastDismiss.count();
  for (let i = 0; i < n; i += 1) {
    await toastDismiss.nth(i).click({ timeout: 500 }).catch(() => {});
  }
}

async function loginUser(page, { email, password }) {
  await page.goto("/login");
  await dismissCookieBanner(page);
  await page.getByTestId("login-email-input").fill(email);
  await page.getByTestId("login-password-input").fill(password);
  await page.getByTestId("login-submit-button").click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await clearUiBlockers(page);
}

async function loginAdmin(page, { email, password }) {
  await page.goto("/admin/login");
  await page.getByTestId("admin-login-email").fill(email);
  await page.getByTestId("admin-login-password").fill(password);
  await page.getByTestId("admin-login-submit").click();
  await page.waitForURL(
    (url) => url.pathname.startsWith("/admin") && !url.pathname.includes("/login"),
    { timeout: 30_000 },
  );
  await clearUiBlockers(page);
}

function uniqueEmail() {
  return `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@civicbot.co.uk`;
}

async function authHeaders(page) {
  // Sessions are HttpOnly cookies (withCredentials). No Bearer header needed.
  void page;
  return {};
}

function cookiesFromAuthFile(authFile) {
  try {
    const state = JSON.parse(fs.readFileSync(authFile, "utf8"));
    return Array.isArray(state.cookies) ? state.cookies : [];
  } catch {
    return [];
  }
}

/**
 * Restore session for authenticated specs.
 * Prefer storageState / API cookie login via the CRA proxy (same-origin as the UI).
 * Fall back to the real login form so HttpOnly cookies are set correctly.
 */
async function ensureAuth(page, credentials, authFile) {
  await page.goto("/");
  await dismissCookieBanner(page);

  // storageState cookies (from global-setup) should already be on the context
  let me = await page.request.get("/api/auth/me").catch(() => null);
  if (me && me.ok()) {
    await page.goto("/dashboard");
    if (/\/dashboard/.test(page.url()) && !page.url().includes("/login")) {
      await clearUiBlockers(page);
      return;
    }
  }

  if (authFile) {
    const cookies = cookiesFromAuthFile(authFile);
    if (cookies.length) {
      await page.context().addCookies(cookies);
      me = await page.request.get("/api/auth/me").catch(() => null);
      if (me && me.ok()) {
        await page.goto("/dashboard");
        if (/\/dashboard/.test(page.url()) && !page.url().includes("/login")) {
          await clearUiBlockers(page);
          return;
        }
      }
    }
  }

  // Same-origin proxy login — Set-Cookie applies to the frontend host
  const resp = await page.request.post("/api/auth/login", {
    data: { email: credentials.email, password: credentials.password },
  });
  if (resp.ok()) {
    await page.goto("/dashboard");
    if (/\/dashboard/.test(page.url()) && !page.url().includes("/login")) {
      await clearUiBlockers(page);
      return;
    }
  } else if (resp.status() === 429) {
    throw new Error(
      `login rate limited for ${credentials.email}. Wait ~1h and re-run E2E.`,
    );
  }

  // Last resort: real UI login (sets cookies the same way users do)
  await loginUser(page, credentials);
}

async function fetchDevMode(request) {
  try {
    const health = await request.get(`${backendUrl}/api/health`);
    if (!health.ok()) return false;
    const body = await health.json();
    return Boolean(body.dev_mode);
  } catch {
    return false;
  }
}

/** Register + verify when DEV_MODE exposes dev_code; otherwise returns false. */
async function registerAndVerify(request, page, email, password) {
  const reg = await request.post(`${backendUrl}/api/auth/register`, {
    data: { name: "E2E User", email, password },
  });

  if (reg.status() === 429) {
    return false;
  }
  if (!reg.ok()) {
    throw new Error(`register failed: ${reg.status()} ${await reg.text()}`);
  }

  const body = await reg.json();
  if (!body.dev_code) {
    return false;
  }

  await page.goto("/login");
  await page.evaluate(
    ({ em, code }) => {
      sessionStorage.setItem("cs_verify_email", em);
      sessionStorage.setItem("cs_verify_dev_code", code);
      sessionStorage.setItem("cs_verify_dev_mode", "1");
    },
    { em: email, code: body.dev_code },
  );
  await page.goto("/verify-email");

  await expect(page.getByTestId("verify-dev-code")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("verify-code-input").fill(body.dev_code);
  await page.getByTestId("verify-submit-button").click();
  await expect(page).toHaveURL(/\/(dashboard|login)/, { timeout: 30_000 });

  if (page.url().includes("/login")) {
    await loginUser(page, { email, password });
  }
  await clearUiBlockers(page);
  return true;
}

module.exports = {
  backendUrl,
  authFilePath,
  USERS,
  dismissCookieBanner,
  clearUiBlockers,
  authHeaders,
  ensureAuth,
  loginUser,
  loginAdmin,
  uniqueEmail,
  fetchDevMode,
  registerAndVerify,
};