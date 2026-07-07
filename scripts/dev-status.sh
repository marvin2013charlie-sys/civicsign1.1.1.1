#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/.dev-logs"

echo "==> CivicSign dev status"
for port in 8001 3000; do
  if lsof -ti :"$port" >/dev/null 2>&1; then
    echo "  :$port  RUNNING"
  else
    echo "  :$port  stopped"
  fi
done

if curl -sf "http://127.0.0.1:8001/api/health" >/dev/null 2>&1; then
  echo "  API health:"
  curl -s "http://127.0.0.1:8001/api/health"
  echo ""
else
  echo "  API health: unreachable"
fi

if [[ -d "$LOG_DIR" ]]; then
  echo "  Logs: $LOG_DIR"
fi