// Dev-only proxy: forward ONLY /api requests to the local backend.
// (The blanket package.json "proxy" option also swallowed favicon/static
// requests that browsers send without a text/html Accept header.)
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://localhost:8001",
      changeOrigin: true,
    })
  );
};
