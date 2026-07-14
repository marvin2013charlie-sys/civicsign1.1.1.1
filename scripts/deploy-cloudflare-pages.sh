#!/usr/bin/env bash
# Deploy CivicSign frontend to Cloudflare Pages (direct upload).
# Requires: CLOUDFLARE_API_TOKEN with "Cloudflare Pages Edit" permission.
# Usage:
#   CLOUDFLARE_API_TOKEN=xxx ./scripts/deploy-cloudflare-pages.sh
#   CLOUDFLARE_API_TOKEN=xxx ./scripts/deploy-cloudflare-pages.sh --project civicsign
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$ROOT/frontend"
PROJECT="${PAGES_PROJECT_NAME:-civicsign-web}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project) PROJECT="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Set CLOUDFLARE_API_TOKEN (Pages Edit permission)."
  echo "Create one: https://dash.cloudflare.com/profile/api-tokens"
  exit 1
fi

cd "$FRONTEND"
if [[ ! -f build/index.html ]] || ! grep -q 'api\.civicsign\.co\.uk' build/static/js/main.*.js 2>/dev/null; then
  echo "Building production bundle..."
  REACT_APP_BACKEND_URL=https://api.civicsign.co.uk \
  REACT_APP_SITE_URL=https://civicsign.co.uk \
  REACT_APP_PRIVATE_BETA=true \
  npm run build
fi

echo "Deploying to Cloudflare Pages project: $PROJECT"
npx wrangler pages deploy build --project-name="$PROJECT" --branch=production --commit-dirty=true

echo "Done. Attach custom domain in Cloudflare → Pages → $PROJECT → Custom domains."