#!/bin/bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

PORT="${DEPLOY_RUN_PORT:-5000}"

echo "Installing serve..."
pnpm add -D serve

echo "Serving dist on port $PORT..."
exec pnpm exec serve dist -l "$PORT"
