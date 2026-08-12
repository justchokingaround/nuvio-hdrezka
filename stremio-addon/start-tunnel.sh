#!/usr/bin/env bash
# Start the Stremio addon and expose it through a persistent tunnel.
# Usage:
#   cp .env.example .env
#   # fill in .env
#   ./start-tunnel.sh

set -e

cd "$(dirname "$0")"

PORT="${PORT:-7001}"
TUNNEL_PROVIDER="${TUNNEL_PROVIDER:-}"

# Load .env if present
if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$TUNNEL_PROVIDER" ]; then
  echo "TUNNEL_PROVIDER is not set."
  echo "Copy .env.example to .env, fill it in, then re-run."
  exit 1
fi

# Make sure deps are installed
if [ ! -d node_modules ]; then
  echo "Installing addon dependencies..."
  npm install
fi

# Make sure the bundled provider exists
if [ ! -f providers/hdrezka.js ]; then
  echo "Bundling HDRezka provider..."
  npm run build
fi

# Wait for the local addon to answer
wait_for_addon() {
  for _ in $(seq 1 30); do
    if curl -sf -o /dev/null "http://127.0.0.1:${PORT}/manifest.json"; then
      return 0
    fi
    sleep 1
  done
  echo "Addon did not start on http://127.0.0.1:${PORT}"
  return 1
}

# Clean up background jobs on exit
cleanup() {
  echo ""
  echo "Shutting down..."
  if [ -n "${ADDON_PID:-}" ]; then
    kill "$ADDON_PID" 2>/dev/null || true
  fi
  if [ -n "${TUNNEL_PID:-}" ]; then
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
}
trap cleanup EXIT

# If an addon is already listening on the port, reuse it.
if curl -sf -o /dev/null "http://127.0.0.1:${PORT}/manifest.json"; then
  echo "An addon is already running on http://127.0.0.1:${PORT}; reusing it."
  echo "If it is an old process, stop it first: pkill -f \"node addon.js\""
  ADDON_PID=""
else
  echo "Starting Stremio addon (http://127.0.0.1:${PORT})..."
  node addon.js &
  ADDON_PID=$!

  sleep 1
  if ! kill -0 "$ADDON_PID" 2>/dev/null; then
    echo ""
    echo "Addon failed to start. Is port ${PORT} already in use?"
    echo "Stop the other process or run with PORT=<other> ./start-tunnel.sh"
    exit 1
  fi
  wait_for_addon
fi

if [ "$TUNNEL_PROVIDER" = "ngrok" ]; then
  if [ -z "${NGROK_DOMAIN:-}" ]; then
    echo "NGROK_DOMAIN is not set. See .env.example."
    exit 1
  fi
  if [ -z "${NGROK_AUTHTOKEN:-}" ]; then
    echo "NGROK_AUTHTOKEN is not set. See .env.example."
    exit 1
  fi

  # Register the token with the local ngrok config (idempotent)
  npx -y ngrok config add-authtoken "$NGROK_AUTHTOKEN" >/dev/null 2>&1 || true

  echo "Starting ngrok tunnel (https://${NGROK_DOMAIN})..."
  npx -y ngrok http "${PORT}" --url="https://${NGROK_DOMAIN}" --log=stdout &
  TUNNEL_PID=$!

elif [ "$TUNNEL_PROVIDER" = "cloudflare" ]; then
  if ! command -v cloudflared >/dev/null 2>&1; then
    echo "cloudflared is not installed. Run ./scripts/setup-cloudflare.sh first."
    exit 1
  fi

  if [ ! -f cloudflared.yml ]; then
    echo "cloudflared.yml not found. Run ./scripts/setup-cloudflare.sh first."
    exit 1
  fi

  echo "Starting Cloudflare tunnel..."
  cloudflared tunnel --config cloudflared.yml run &
  TUNNEL_PID=$!

else
  echo "Unknown TUNNEL_PROVIDER: $TUNNEL_PROVIDER"
  exit 1
fi

echo ""
echo "=== Your addon will be available at ==="
if [ "$TUNNEL_PROVIDER" = "ngrok" ]; then
  echo "https://${NGROK_DOMAIN}/manifest.json"
else
  grep -E '^\s*hostname:' cloudflared.yml | head -1 | sed 's/.*://;s/ //g' | sed 's|^|https://|;s|$|/manifest.json|'
fi
echo "===================================="
echo "Press Ctrl+C to stop."
wait
