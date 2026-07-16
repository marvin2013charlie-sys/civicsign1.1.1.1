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

/** Remove product tour overlays and toasts that intercept Playwright clicks. */
async function clearUiBlockers(page) {
  try {
    const me = await page.request.get(`${backendUrl}/api/auth/me`);
    if (me.ok()) {
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
  const token = await page.evaluate(() => sessionStorage.getItem("cs_access"));
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function tokenFromAuthFile(authFile) {
  try {
    const state = JSON.parse(fs.readFileSync(authFile, "utf8"));
    for (const origin of state.origins || []) {
      const entry = (origin.sessionStorage || []).find((e) => e.name === "cs_access");
      if (entry?.value) return entry.value;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Restore session from cached auth file or API login — avoids repeated UI logins. */
async function ensureAuth(page, credentials, authFile) {
  let token = authFile ? tokenFromAuthFile(authFile) : null;
  if (!token) {
    const resp = await page.request.post(`${backendUrl}/api/auth/login`, {
      data: { email: credentials.email, password: credentials.password },
    });
    if (resp.status() === 429) {
      throw new Error(
        `login rate limited for ${credentials.email}. `
          + "Wait ~1h or set E2E_ACCESS_TOKEN_* from sessionStorage cs_access.",
      );
    }
    if (!resp.ok()) {
      throw new Error(`login failed: ${resp.status()} ${await resp.text()}`);
    }
    token = (await resp.json()).access_token;
  }

  await page.goto("/login");
  await page.evaluate((t) => sessionStorage.setItem("cs_access", t), token);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await clearUiBlockers(page);
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
  clearUiBlockers,
  authHeaders,
  ensureAuth,
  loginUser,
  loginAdmin,
  uniqueEmail,
  fetchDevMode,
  registerAndVerify,
};