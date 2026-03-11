#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_NAME="${PM2_APP_NAME:-pmc-api}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/server/.env.production}"

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
echo "Next: install the nginx site config and run certbot."
