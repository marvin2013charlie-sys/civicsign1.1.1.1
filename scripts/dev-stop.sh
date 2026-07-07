#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/.dev-logs"

stop_pid_file() {
  local name="$1"
  local pidfile="$LOG_DIR/${name}.pid"
  if [[ -f "$pidfile" ]]; then
    local pid
    pid="$(cat "$pidfile")"
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      sleep 1
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$pidfile"
  fi
}

echo "==> Stopping CivicSign dev stack"

stop_pid_file backend
stop_pid_file frontend
stop_pid_file stripe

for port in 8001 3000; do
  lsof -ti :"$port" 2>/dev/null | xargs kill -9 2>/dev/null || true
done

echo "==> Stopped (ports 8001 and 3000 free)"