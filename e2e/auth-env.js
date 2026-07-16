// @ts-check
const path = require("path");

const frontendUrl = (process.env.E2E_FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");
const backendUrl = (process.env.E2E_BACKEND_URL || "http://127.0.0.1:8001").replace(/\/+$/, "");

function authEnvSlug() {
  if (frontendUrl.includes("civicsign.co.uk")) return "production";
  return "local";
}

function authFilePath(key) {
  return path.join(__dirname, ".auth", authEnvSlug(), `${key}.json`);
}

module.exports = {
  frontendUrl,
  backendUrl,
  authEnvSlug,
  authFilePath,
};