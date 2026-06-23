#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "ERROR: missing required command: $1"
    exit 1
  fi
}

REPO_URL="${REPO_URL:-https://github.com/yinsw-c2e/drone_v2.git}"
BRANCH="${BRANCH:-main}"
APP_ROOT="${APP_ROOT:-/opt/drone_v2}"
SOURCE_DIR="${SOURCE_DIR:-$APP_ROOT/source}"
FRONTEND_DIR="${FRONTEND_DIR:-$APP_ROOT/frontend}"
BACKEND_DIR="${BACKEND_DIR:-$APP_ROOT/backend}"
STATE_DIR="${STATE_DIR:-$APP_ROOT/.deploy}"
DEPLOYED_COMMIT_FILE="${DEPLOYED_COMMIT_FILE:-$STATE_DIR/deployed-main.commit}"
LOCK_FILE="${LOCK_FILE:-/tmp/drone-v2-main-deploy.lock}"
ENV_FILE="${ENV_FILE:-$BACKEND_DIR/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$BACKEND_DIR/docker-compose.prod.yml}"
API_IMAGE="${API_IMAGE:-drone-v2-api:prod}"
NODE_IMAGE="${NODE_IMAGE:-node:20-bookworm-slim}"
PNPM_VERSION="${PNPM_VERSION:-10.17.1}"
VITE_BACKEND_URL="${VITE_BACKEND_URL:-https://swvictory.com}"
VITE_DISABLE_LOCAL_DB_PERSIST="${VITE_DISABLE_LOCAL_DB_PERSIST:-1}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-https://swvictory.com/api/v1/health}"

require_command git
require_command docker
require_command rsync
require_command curl
require_command flock

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "Another deploy is already running; exiting."
  exit 0
fi

mkdir -p "$APP_ROOT" "$STATE_DIR"

if [[ ! -d "$SOURCE_DIR/.git" ]]; then
  log "Cloning $REPO_URL#$BRANCH into $SOURCE_DIR"
  rm -rf "$SOURCE_DIR"
  git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$SOURCE_DIR"
fi

log "Fetching origin/$BRANCH"
git -C "$SOURCE_DIR" fetch origin "$BRANCH"
git -C "$SOURCE_DIR" checkout "$BRANCH"
git -C "$SOURCE_DIR" reset --hard "origin/$BRANCH"

target_commit="$(git -C "$SOURCE_DIR" rev-parse HEAD)"
deployed_commit=""
if [[ -f "$DEPLOYED_COMMIT_FILE" ]]; then
  deployed_commit="$(cat "$DEPLOYED_COMMIT_FILE")"
fi

if [[ "${FORCE_DEPLOY:-0}" != "1" && "$target_commit" == "$deployed_commit" ]]; then
  log "origin/$BRANCH is already deployed at $target_commit"
  exit 0
fi

if [[ ! -f "$ENV_FILE" ]]; then
  log "ERROR: missing production env file: $ENV_FILE"
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  log "ERROR: missing production compose file: $COMPOSE_FILE"
  exit 1
fi

log "Installing frontend dependencies, type-checking, and building H5"
docker run --rm \
  -v "$SOURCE_DIR:/workspace" \
  -w /workspace \
  -e "PNPM_VERSION=$PNPM_VERSION" \
  -e "VITE_BACKEND_URL=$VITE_BACKEND_URL" \
  -e "VITE_DISABLE_LOCAL_DB_PERSIST=$VITE_DISABLE_LOCAL_DB_PERSIST" \
  "$NODE_IMAGE" \
  sh -lc 'set -e
    export PNPM_HOME=/tmp/pnpm
    export PATH="$PNPM_HOME:$PATH"
    corepack enable
    corepack prepare "pnpm@$PNPM_VERSION" --activate
    pnpm install --frozen-lockfile
    pnpm type-check
    pnpm exec uni build -p h5
  '

H5_DIR="$SOURCE_DIR/dist/build/h5"
if [[ ! -f "$H5_DIR/index.html" ]]; then
  log "ERROR: H5 build output missing: $H5_DIR/index.html"
  exit 1
fi

log "Building backend image $API_IMAGE from $SOURCE_DIR/backend"
docker build -t "$API_IMAGE" "$SOURCE_DIR/backend"

log "Syncing H5 assets into $FRONTEND_DIR"
mkdir -p "$FRONTEND_DIR"
rsync -a --delete "$H5_DIR"/ "$FRONTEND_DIR"/

log "Recreating API container with existing production compose/env"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --no-deps --force-recreate api

log "Checking public health endpoint: $HEALTHCHECK_URL"
curl -fsS "$HEALTHCHECK_URL" >/dev/null

printf '%s' "$target_commit" > "$DEPLOYED_COMMIT_FILE"
log "Deployment complete: $target_commit"
