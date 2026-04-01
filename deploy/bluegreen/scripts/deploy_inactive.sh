#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-/opt/arcad-bluegreen}"
IMAGE_TAG="${2:?image tag required}"

cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo ".env is missing in $ROOT_DIR" >&2
  exit 1
fi

source .env

ACTIVE_SLOT="${ACTIVE_SLOT:-blue}"
if [[ "$ACTIVE_SLOT" == "blue" ]]; then
  TARGET_SLOT="green"
else
  TARGET_SLOT="blue"
fi

export IMAGE_TAG

docker compose -f docker-compose.yml pull "api-${TARGET_SLOT}" "frontend-${TARGET_SLOT}"
docker compose -f docker-compose.yml up -d "api-${TARGET_SLOT}" "frontend-${TARGET_SLOT}"

echo "deployed_slot=${TARGET_SLOT}"
echo "image_tag=${IMAGE_TAG}"
