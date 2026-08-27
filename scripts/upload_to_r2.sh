#!/usr/bin/env bash

# Wrapper script redirecting to the TypeScript implementation (scripts/upload_to_r2.ts)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

exec bun "$PROJECT_ROOT/scripts/upload_to_r2.ts" "$@"
