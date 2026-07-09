// @ts-check
const { expect } = require("@playwright/test");

const backendUrl = process.env.E2E_BACKEND_URL || "http://localhost:8001";

const USERS = {
  pro: { email: "protest@civicbot.co.uk", password: "ProTest123!" },
  business: { email: "businesstest@civicbot.co.uk", password: "BusinessPass123!" },
  orgOwner: { email: "orgowner-test@civicbot.co.uk", password: "OrgOwner123!" },
  admin: { email: "admin@example.com", password: "AdminPass123!" },
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
}

function uniqueEmail() {
  return `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@civicbot.co.uk`;
}

module.exports = {
  backendUrl,
  USERS,
  clearUiBlockers,
  loginUser,
  loginAdmin,
  uniqueEmail,
};