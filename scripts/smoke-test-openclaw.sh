#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$SKILL_DIR"

if [ ! -f ".env" ]; then
  echo "ERROR: .env is missing in $SKILL_DIR" >&2
  echo "Create it from .env.example and set GROCY_URL and GROCY_API_KEY." >&2
  exit 1
fi

set -a
. ./.env
set +a

node bin/grocy-openclaw.js shopping-list --format text
