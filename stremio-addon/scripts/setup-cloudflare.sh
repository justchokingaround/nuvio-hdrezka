#!/usr/bin/env bash
# One-time setup for a persistent Cloudflare Tunnel.
# Your domain must already be on your Cloudflare account.
#
# Usage:
#   export CLOUDFLARE_TUNNEL_HOSTNAME=hdrezka.example.com
#   ./scripts/setup-cloudflare.sh

set -e

cd "$(dirname "$0")/.."

# Load .env if present
if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | xargs)
fi

TUNNEL_NAME="${TUNNEL_NAME:-nuvio-hdrezka}"
HOSTNAME="${CLOUDFLARE_TUNNEL_HOSTNAME:-}"

if [ -z "$HOSTNAME" ]; then
  echo "Set CLOUDFLARE_TUNNEL_HOSTNAME to a subdomain you control, e.g. hdrezka.example.com"
  exit 1
fi

install_cloudflared() {
  if command -v cloudflared >/dev/null 2>&1; then
    return 0
  fi

  echo "cloudflared not found. Installing..."
  case "$OSTYPE" in
    darwin*)
      if command -v brew >/dev/null 2>&1; then
        brew install cloudflared
      else
        curl -L --output /tmp/cloudflared.tgz "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz"
        sudo tar -C /usr/local/bin -xzf /tmp/cloudflared.tgz cloudflared
      fi
      ;;
    linux*)
      ARCH=$(uname -m)
      case "$ARCH" in
        x86_64)  CF_FILE=cloudflared-linux-amd64.deb ;;
        aarch64) CF_FILE=cloudflared-linux-arm64.deb ;;
        armv7l)  CF_FILE=cloudflared-linux-arm.deb ;;
        *)       echo "Unsupported architecture: $ARCH"; exit 1 ;;
      esac
      curl -L --output "/tmp/${CF_FILE}" "https://github.com/cloudflare/cloudflared/releases/latest/download/${CF_FILE}"
      sudo dpkg -i "/tmp/${CF_FILE}" 2>/dev/null || sudo apt-get install -f -y
      ;;
    *)
      echo "Please install cloudflared manually: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
      exit 1
      ;;
  esac
}

install_cloudflared

# Authenticate if necessary
if [ ! -f "$HOME/.cloudflared/cert.pem" ]; then
  echo ""
  echo "Cloudflare login required. A URL will appear below."
  echo "Open it in a browser, pick your account, and authorize."
  echo ""
  cloudflared tunnel login
fi

# Create tunnel if it doesn't exist
if ! cloudflared tunnel list | grep -qE "^\s+[a-f0-9-]+\s+${TUNNEL_NAME}\s"; then
  echo "Creating tunnel '${TUNNEL_NAME}'..."
  cloudflared tunnel create "$TUNNEL_NAME"
fi

TUNNEL_ID=$(cloudflared tunnel list --output json | python3 -c "import sys,json; print(next(t['id'] for t in json.load(sys.stdin) if t.get('name')=='$TUNNEL_NAME'))")
CRED_FILE="$HOME/.cloudflared/${TUNNEL_ID}.json"

if [ ! -f "$CRED_FILE" ]; then
  echo "Credential file not found: $CRED_FILE"
  echo "Copy your tunnel credentials here or re-run setup on the original machine."
  exit 1
fi

# Add public hostname (DNS route). This is idempotent.
echo "Routing ${HOSTNAME} -> tunnel ${TUNNEL_ID} ..."
if ! cloudflared tunnel route dns "$TUNNEL_NAME" "$HOSTNAME" 2>/tmp/cf_route_err; then
  echo "Could not create DNS route. Is '${HOSTNAME}' in your Cloudflare account?"
  echo "Error:"
  cat /tmp/cf_route_err
  exit 1
fi

# Write config file for the start script
cat > cloudflared.yml <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CRED_FILE}
ingress:
  - hostname: ${HOSTNAME}
    service: http://localhost:${PORT:-7001}
  - service: http_status:404
EOF

echo ""
echo "=== Cloudflare Tunnel configured ==="
echo "Tunnel name: ${TUNNEL_NAME}"
echo "Tunnel ID:   ${TUNNEL_ID}"
echo "Public URL:  https://${HOSTNAME}/manifest.json"
echo ""
echo "Start it with: TUNNEL_PROVIDER=cloudflare ./start-tunnel.sh"
