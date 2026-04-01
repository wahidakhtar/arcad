#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-/opt/arcad-bluegreen}"
TARGET_SLOT="${2:?slot required: blue or green}"

if [[ "$TARGET_SLOT" != "blue" && "$TARGET_SLOT" != "green" ]]; then
  echo "slot must be blue or green" >&2
  exit 1
fi

cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo ".env is missing in $ROOT_DIR" >&2
  exit 1
fi

if grep -q '^ACTIVE_SLOT=' .env; then
  sed -i.bak "s/^ACTIVE_SLOT=.*/ACTIVE_SLOT=${TARGET_SLOT}/" .env
else
  printf '\nACTIVE_SLOT=%s\n' "$TARGET_SLOT" >> .env
fi

docker compose -f docker-compose.yml up -d proxy

echo "active_slot=${TARGET_SLOT}"
