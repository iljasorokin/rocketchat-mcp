#!/usr/bin/env bash
# Launch local rocketchat-mcp (with announcement tools) using ~/.rocketchat-mcp/env or Keychain.
set -euo pipefail

ENV_FILE="${ROCKETCHAT_ENV_FILE:-$HOME/.rocketchat-mcp/env}"
ROOT="$(cd "$(dirname "$0")" && pwd)"
SERVER_JS="$ROOT/server/dist/index.js"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [[ -z "${ROCKETCHAT_AUTH_TOKEN:-}" || -z "${ROCKETCHAT_USER_ID:-}" ]] && [[ "$(uname -s)" == "Darwin" ]]; then
  ROCKETCHAT_AUTH_TOKEN="${ROCKETCHAT_AUTH_TOKEN:-$(/usr/bin/security find-generic-password -s rocketchat-mcp -a auth-token -w 2>/dev/null || true)}"
  ROCKETCHAT_USER_ID="${ROCKETCHAT_USER_ID:-$(/usr/bin/security find-generic-password -s rocketchat-mcp -a user-id -w 2>/dev/null || true)}"
  export ROCKETCHAT_AUTH_TOKEN ROCKETCHAT_USER_ID
fi

export ROCKETCHAT_URL="${ROCKETCHAT_URL:-https://rc.upzero.net}"

if [[ -z "${ROCKETCHAT_USER_ID:-}" || -z "${ROCKETCHAT_AUTH_TOKEN:-}" ]]; then
  echo "rocketchat-mcp: missing ROCKETCHAT_USER_ID / ROCKETCHAT_AUTH_TOKEN" >&2
  echo "Fill $ENV_FILE or store in Keychain (service rocketchat-mcp, accounts user-id / auth-token)." >&2
  exit 1
fi

ROCKETCHAT_URL="${ROCKETCHAT_URL%/}"
ROCKETCHAT_URL="${ROCKETCHAT_URL%/api/v1}"
export ROCKETCHAT_URL

if [[ ! -f "$SERVER_JS" ]]; then
  echo "rocketchat-mcp: missing $SERVER_JS — run npm install in $ROOT/server" >&2
  exit 1
fi

exec node "$SERVER_JS"
