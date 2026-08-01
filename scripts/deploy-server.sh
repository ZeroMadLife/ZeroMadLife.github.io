#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOY_HOST:?Set DEPLOY_HOST, e.g. root@example.com}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
REMOTE_ROOT="${REMOTE_ROOT:-/var/www/blog.sagecompanion.top}"
RELEASE_ID="${RELEASE_ID:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"

if [[ ! -d dist ]]; then
  echo "dist/ is missing; run pnpm build first" >&2
  exit 1
fi

release="${REMOTE_ROOT}/releases/${RELEASE_ID}"
ssh -p "$DEPLOY_PORT" "$DEPLOY_HOST" "mkdir -p '$release' '$REMOTE_ROOT/releases'"
rsync -az --delete -e "ssh -p ${DEPLOY_PORT}" dist/ "${DEPLOY_HOST}:${release}/"
ssh -p "$DEPLOY_PORT" "$DEPLOY_HOST" "ln -sfn '$release' '$REMOTE_ROOT/current'"
echo "Deployed ${RELEASE_ID} to ${DEPLOY_HOST}:${REMOTE_ROOT}/current"
