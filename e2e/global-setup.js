// @ts-check
const fs = require("fs");
const path = require("path");
const { frontendUrl, backendUrl, authEnvSlug, authFilePath } = require("./auth-env");

const USERS = {
  pro: { email: "pro@civicbot.co.uk", password: "CivicSign2026!Pro" },
  business: { email: "business@civicbot.co.uk", password: "CivicSign2026!Biz" },
  orgOwner: { email: "org@civicbot.co.uk", password: "CivicSign2026!Org" },
};

function writeStorageState(key, token) {
  const outPath = authFilePath(key);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const state = {
    cookies: [],
    origins: [
      {
        origin: frontendUrl,
        localStorage: [],
        sessionStorage: [{ name: "cs_access", value: token }],
      },
    ],
  };
  fs.writeFileSync(outPath, JSON.stringify(state, null, 2));
  console.log(`[e2e] saved auth state (${authEnvSlug()}): ${key} → ${outPath}`);
}

async function loginToken(email, password) {
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
  const data = await resp.json();
  if (!data.access_token) {
    throw new Error(`E2E auth setup missing access_token for ${email}`);
  }
  return { token: data.access_token };
}

function authFileValid(key, maxAgeMs = 45 * 60 * 1000) {
  const outPath = authFilePath(key);
  try {
    const stat = fs.statSync(outPath);
    const parsed = JSON.parse(fs.readFileSync(outPath, "utf8"));
    const originEntry = (parsed.origins || []).find((o) => o.origin === frontendUrl);
    const hasToken = Boolean(
      originEntry?.sessionStorage?.some((e) => e.name === "cs_access" && e.value),
    );
    return hasToken && Date.now() - stat.mtimeMs < maxAgeMs;
  } catch {
    return false;
  }
}

function tokenFromEnv(key) {
  const envKey = `E2E_ACCESS_TOKEN_${key.replace(/-/g, "_").toUpperCase()}`;
  return process.env[envKey] || null;
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

    const envToken = tokenFromEnv(key);
    if (envToken) {
      writeStorageState(key, envToken);
      continue;
    }

    const result = await loginToken(user.email, user.password);
    if (result.rateLimited) {
      if (authFileValid(key, Number.MAX_SAFE_INTEGER)) {
        console.warn(`[e2e] login rate limited for ${user.email}; reusing stale auth for ${authEnvSlug()}`);
        continue;
      }
      throw new Error(
        `E2E auth setup rate limited for ${user.email} on ${authEnvSlug()}. `
          + `Wait ~1h or set E2E_ACCESS_TOKEN_${key.replace(/-/g, "_").toUpperCase()} `
          + `(from browser sessionStorage cs_access after manual login on ${frontendUrl}).`,
      );
    }
    writeStorageState(key, result.token);
  }
};