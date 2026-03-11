#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_NAME="${PM2_APP_NAME:-pmc-api}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/server/.env.production}"

trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

normalize_public_domain() {
  local value
  value="$(trim "$1")"
  value="${value#https://}"
  value="${value#http://}"
  value="${value%%/*}"
  value="${value%%\?*}"
  value="${value%%\#*}"

  if [[ -z "$value" ]]; then
    return 1
  fi

  if [[ ! "$value" =~ ^[A-Za-z0-9.-]+(:[0-9]+)?$ ]]; then
    return 1
  fi

  printf '%s' "$value"
}

set_env_value() {
  local key="$1"
  local value="$2"
  local tmp_file
  tmp_file="$(mktemp)"

  awk -v key="$key" -v value="$value" '
    BEGIN { updated = 0 }
    $0 ~ ("^" key "=") {
      print key "=" value
      updated = 1
      next
    }
    { print }
    END {
      if (!updated) {
        print key "=" value
      }
    }
  ' "$ENV_FILE" > "$tmp_file"

  mv "$tmp_file" "$ENV_FILE"
}

prompt_public_domain() {
  local suggested_domain raw_input normalized_domain
  suggested_domain="$(normalize_public_domain "${PUBLIC_DOMAIN:-${APP_URL:-${CORS_ORIGIN:-}}}" 2>/dev/null || true)"

  if [[ -n "${PUBLIC_DOMAIN:-}" ]]; then
    raw_input="$PUBLIC_DOMAIN"
  elif [[ -t 0 ]]; then
    if [[ -n "$suggested_domain" ]]; then
      read -r -p "Public domain for this deployment [$suggested_domain]: " raw_input
      raw_input="${raw_input:-$suggested_domain}"
    else
      read -r -p "Public domain for this deployment (e.g. yourdomain.duckdns.org): " raw_input
    fi
  elif [[ -n "$suggested_domain" ]]; then
    raw_input="$suggested_domain"
    echo "Using existing deployment domain from $ENV_FILE: $suggested_domain"
  else
    echo "PUBLIC_DOMAIN must be set when running without an interactive terminal."
    exit 1
  fi

  normalized_domain="$(normalize_public_domain "$raw_input" 2>/dev/null || true)"
  if [[ -z "$normalized_domain" ]]; then
    echo "Invalid public domain: '$raw_input'"
    exit 1
  fi

  DEPLOY_PUBLIC_DOMAIN="$normalized_domain"
  DEPLOY_PUBLIC_ORIGIN="https://$normalized_domain"
}

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing environment file: $ENV_FILE"
  echo "Create it from server/.env.production.example before deploying."
  exit 1
fi

cd "$ROOT_DIR"

echo "Loading production environment from $ENV_FILE"
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

prompt_public_domain

echo "Writing deployment origin to $ENV_FILE"
set_env_value "CORS_ORIGIN" "$DEPLOY_PUBLIC_ORIGIN"
set_env_value "APP_URL" "$DEPLOY_PUBLIC_ORIGIN"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ "${CORS_ORIGIN:-}" != "$DEPLOY_PUBLIC_ORIGIN" ]]; then
  echo "CORS_ORIGIN validation failed."
  echo "Expected: $DEPLOY_PUBLIC_ORIGIN"
  echo "Actual:   ${CORS_ORIGIN:-<unset>}"
  exit 1
fi

if [[ "${APP_URL:-}" != "$DEPLOY_PUBLIC_ORIGIN" ]]; then
  echo "APP_URL validation failed."
  echo "Expected: $DEPLOY_PUBLIC_ORIGIN"
  echo "Actual:   ${APP_URL:-<unset>}"
  exit 1
fi

export PM2_APP_NAME="$APP_NAME"
export PORT="${PORT:-3003}"

echo "Installing dependencies"
npm ci --include=dev --prefix server
npm ci --include=dev --prefix client

echo "Cleaning previous build artifacts"
rm -rf "$ROOT_DIR/server/dist" "$ROOT_DIR/client/build"

echo "Building server and client"
npm run build --prefix server
npm run build --prefix client

export NODE_ENV=production

echo "Ensuring upload directory exists"
mkdir -p "${UPLOAD_DIR:-$ROOT_DIR/uploads}"

echo "Starting or reloading PM2 app: $APP_NAME"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart ecosystem.config.cjs --env production --only "$APP_NAME" --update-env
else
  pm2 start ecosystem.config.cjs --env production --only "$APP_NAME" --update-env
fi

pm2 save

echo
echo "Deployment complete."
echo "Backend is expected on http://127.0.0.1:${PORT}"
echo "Validated public origin: ${DEPLOY_PUBLIC_ORIGIN}"
echo "Next: install the nginx site config and run certbot."
