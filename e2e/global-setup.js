// @ts-check
const fs = require("fs");
const path = require("path");
const { frontendUrl, backendUrl, authEnvSlug, authFilePath } = require("./auth-env");

const USERS = {
  pro: { email: "pro@civicbot.co.uk", password: "CivicSign2026!Pro" },
  business: { email: "business@civicbot.co.uk", password: "CivicSign2026!Biz" },
  orgOwner: { email: "org@civicbot.co.uk", password: "CivicSign2026!Org" },
};

/**
 * Parse Set-Cookie header values into Playwright storageState cookies.
 * Auth is HttpOnly cookies only (login JSON no longer includes access_token).
 */
function parseSetCookieHeaders(rawHeaders, domain) {
  const cookies = [];
  for (const raw of rawHeaders) {
    if (!raw || typeof raw !== "string") continue;
    const parts = raw.split(";").map((p) => p.trim());
    const [nv, ...attrs] = parts;
    const eq = nv.indexOf("=");
    if (eq < 1) continue;
    const name = nv.slice(0, eq).trim();
    const value = nv.slice(eq + 1).trim();
    if (!name || !value) continue;

    /** @type {import('@playwright/test').Cookie} */
    const cookie = {
      name,
      value,
      domain,
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
      expires: -1,
    };

    for (const attr of attrs) {
      const lower = attr.toLowerCase();
      if (lower === "httponly") cookie.httpOnly = true;
      else if (lower === "secure") cookie.secure = true;
      else if (lower.startsWith("path=")) cookie.path = attr.slice(5) || "/";
      else if (lower.startsWith("samesite=")) {
        const v = attr.slice(9).toLowerCase();
        cookie.sameSite = v === "strict" ? "Strict" : v === "none" ? "None" : "Lax";
      } else if (lower.startsWith("max-age=")) {
        const secs = parseInt(attr.slice(8), 10);
        if (Number.isFinite(secs) && secs > 0) {
          cookie.expires = Math.floor(Date.now() / 1000) + secs;
        }
      }
    }
    cookies.push(cookie);
  }
  return cookies;
}

function writeStorageState(key, cookies) {
  const outPath = authFilePath(key);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const state = {
    cookies,
    origins: [
      {
        origin: frontendUrl,
        localStorage: [],
        sessionStorage: [],
      },
    ],
  };
  fs.writeFileSync(outPath, JSON.stringify(state, null, 2));
  console.log(`[e2e] saved auth state (${authEnvSlug()}): ${key} → ${outPath}`);
}

async function loginCookies(email, password) {
  const resp = await fetch(`${backendUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (resp.status === 429) {
    return { rateLimited: true };
  }
  if (!resp.ok) {
    throw new Error(`E2E auth setup failed for ${email}: ${resp.status} ${await resp.text()}`);
  }

  const getSetCookie =
    typeof resp.headers.getSetCookie === "function"
      ? resp.headers.getSetCookie()
      : [];
  // Fallback for runtimes that only expose a single set-cookie header
  let rawList = getSetCookie;
  if (!rawList.length) {
    const single = resp.headers.get("set-cookie");
    if (single) rawList = [single];
  }

  const host = new URL(frontendUrl).hostname;
  // Also cover backend host when it differs (localhost vs 127.0.0.1)
  const backendHost = new URL(backendUrl).hostname;
  const domains = host === backendHost ? [host] : [host, backendHost];

  /** @type {import('@playwright/test').Cookie[]} */
  const cookies = [];
  for (const domain of domains) {
    cookies.push(...parseSetCookieHeaders(rawList, domain));
  }

  const hasAccess = cookies.some((c) => c.name === "access_token" && c.value);
  if (!hasAccess) {
    throw new Error(
      `E2E auth setup missing access_token cookie for ${email}. `
        + `Got cookies: ${cookies.map((c) => c.name).join(", ") || "(none)"}`,
    );
  }
  return { cookies };
}

function authFileValid(key, maxAgeMs = 45 * 60 * 1000) {
  const outPath = authFilePath(key);
  try {
    const stat = fs.statSync(outPath);
    const parsed = JSON.parse(fs.readFileSync(outPath, "utf8"));
    const hasCookie = (parsed.cookies || []).some(
      (c) => c.name === "access_token" && c.value,
    );
    return hasCookie && Date.now() - stat.mtimeMs < maxAgeMs;
  } catch {
    return false;
  }
}

module.exports = async function globalSetup() {
  console.log(`[e2e] auth environment: ${authEnvSlug()} (${frontendUrl})`);

  const required = ["pro", "business", "org-owner"];
  if (required.every((key) => authFileValid(key))) {
    console.log("[e2e] reusing cached auth state (< 45m old, matching origin)");
    return;
  }

  for (const [key, user] of [
    ["pro", USERS.pro],
    ["business", USERS.business],
    ["org-owner", USERS.orgOwner],
  ]) {
    if (authFileValid(key)) {
      continue;
    }

    const result = await loginCookies(user.email, user.password);
    if (result.rateLimited) {
      if (authFileValid(key, Number.MAX_SAFE_INTEGER)) {
        console.warn(
          `[e2e] login rate limited for ${user.email}; reusing stale auth for ${authEnvSlug()}`,
        );
        continue;
      }
      throw new Error(
        `E2E auth setup rate limited for ${user.email} on ${authEnvSlug()}. `
          + "Wait ~1h and re-run, or log in via UI once.",
      );
    }
    writeStorageState(key, result.cookies);
  }
};
