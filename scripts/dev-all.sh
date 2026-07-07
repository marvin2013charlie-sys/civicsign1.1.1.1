#!/usr/bin/env bash
# Start backend, frontend, and Stripe webhook forwarding (if CLI installed).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/.dev-logs"
mkdir -p "$LOG_DIR"

echo "==> CivicSign dev stack"
echo "    Project: $ROOT"

# Stop anything already on these ports
"$ROOT/scripts/dev-stop.sh" 2>/dev/null || true

PYTHON="$ROOT/backend/.venv/bin/python"
if [[ ! -x "$PYTHON" ]]; then
  echo "ERROR: backend/.venv not found. Use the 'civicsigngrok full dev' copy with .venv."
  exit 1
fi

echo "==> Starting backend :8001"
cd "$ROOT/backend"
nohup "$PYTHON" -m uvicorn server:app --reload --host 127.0.0.1 --port 8001 \
  >"$LOG_DIR/backend.log" 2>&1 &
echo $! >"$LOG_DIR/backend.pid"

echo "==> Starting frontend :3000"
cd "$ROOT/frontend"
BROWSER=none nohup npm start >"$LOG_DIR/frontend.log" 2>&1 &
echo $! >"$LOG_DIR/frontend.pid"

if command -v stripe >/dev/null 2>&1; then
  echo "==> Starting Stripe webhook forwarder"
  nohup stripe listen --forward-to localhost:8001/api/webhook/stripe \
    >"$LOG_DIR/stripe.log" 2>&1 &
  echo $! >"$LOG_DIR/stripe.pid"
else
  echo "==> Stripe CLI not installed (brew install stripe/stripe-cli/stripe)"
  echo "    Checkout works but webhooks need manual whsec_ in .env"
  : >"$LOG_DIR/stripe.log"
fi

echo "==> Waiting for backend health..."
for _ in $(seq 1 45); do
  if curl -sf "http://127.0.0.1:8001/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "==> Waiting for frontend..."
for _ in $(seq 1 90); do
  if curl -sf "http://127.0.0.1:3000" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo ""
echo "Ready:"
echo "  App:      http://localhost:3000"
echo "  API:      http://127.0.0.1:8001/api/health"
echo "  Logs:     tail -f \"$LOG_DIR/backend.log\""
echo "            tail -f \"$LOG_DIR/frontend.log\""
if [[ -f "$LOG_DIR/stripe.pid" ]] && command -v stripe >/dev/null 2>&1; then
  echo "            tail -f \"$LOG_DIR/stripe.log\""
fi
echo "  Stop all: \"$ROOT/scripts/dev-stop.sh\""
echo ""
curl -s "http://127.0.0.1:8001/api/health" 2>/dev/null || echo "Backend still starting — check: tail -f $LOG_DIR/backend.log"