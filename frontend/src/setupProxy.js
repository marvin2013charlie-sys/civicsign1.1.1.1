// Dev-only proxy: forward ONLY /api requests to the local backend.
// (The blanket package.json "proxy" option also swallowed favicon/static
// requests that browsers send without a text/html Accept header.)
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      // Use 127.0.0.1 (not "localhost") so the proxy always hits the IPv4
      // address uvicorn binds — "localhost" can resolve to IPv6 ::1 and fail.
      target: "http://127.0.0.1:8001",
      changeOrigin: true,
      proxyTimeout: 30_000,
      timeout: 30_000,
    })
  );
};
