#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OPENCLAW_WORKSPACE="${OPENCLAW_WORKSPACE:-"$HOME/.openclaw/workspace"}"
TARGET_DIR="$OPENCLAW_WORKSPACE/skills/grocy"

echo "Deploying Grocy skill to: $TARGET_DIR"

mkdir -p "$TARGET_DIR"
mkdir -p "$TARGET_DIR/bin" "$TARGET_DIR/src" "$TARGET_DIR/scripts"

copy_path() {
  local source="$1"
  local target="$2"

  if [ -d "$source" ]; then
    mkdir -p "$target"
    cp -R "$source/." "$target/"
  else
    cp "$source" "$target"
  fi
}

copy_path "$SOURCE_DIR/SKILL.md" "$TARGET_DIR/SKILL.md"
copy_path "$SOURCE_DIR/README.md" "$TARGET_DIR/README.md"
copy_path "$SOURCE_DIR/package.json" "$TARGET_DIR/package.json"
copy_path "$SOURCE_DIR/.env.example" "$TARGET_DIR/.env.example"
copy_path "$SOURCE_DIR/bin" "$TARGET_DIR/bin"
copy_path "$SOURCE_DIR/src" "$TARGET_DIR/src"
copy_path "$SOURCE_DIR/scripts" "$TARGET_DIR/scripts"

chmod +x "$TARGET_DIR/bin/grocy-openclaw.js"
chmod +x "$TARGET_DIR/scripts/deploy-local.sh"
chmod +x "$TARGET_DIR/scripts/smoke-test-openclaw.sh"

if [ ! -f "$TARGET_DIR/.env" ]; then
  cp "$TARGET_DIR/.env.example" "$TARGET_DIR/.env"
  echo "Created $TARGET_DIR/.env from .env.example"
else
  echo "Kept existing $TARGET_DIR/.env"
fi

if [ -n "${OPENCLAW_COMPOSE_DIR:-}" ]; then
  echo "OPENCLAW_COMPOSE_DIR is set: $OPENCLAW_COMPOSE_DIR"
  echo "Restart the OpenClaw gateway from that directory if your setup requires it."
fi

cat <<EOF

Next steps:
1. Edit $TARGET_DIR/.env with your Grocy URL and API key.
2. Run a smoke test from the deployed skill folder:
   cd "$TARGET_DIR"
   ./scripts/smoke-test-openclaw.sh

EOF
