#!/bin/bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo "=== StyleFit Build ==="
echo "Project dir: $PROJECT_DIR"

# Install dependencies
echo "Installing dependencies..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Build frontend with Vite
echo "Building frontend..."
pnpm vite build

# Install serve for static file serving (needed at runtime)
echo "Installing serve for runtime..."
pnpm add -D serve

echo "=== Build complete ==="
ls -la dist/ 2>/dev/null || echo "Warning: dist/ not found"
