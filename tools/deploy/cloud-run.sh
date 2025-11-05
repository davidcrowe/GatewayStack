#!/usr/bin/env bash
set -euo pipefail

# Usage: ./tools/deploy/cloud-run.sh gateway-server
SERVICE_NAME="${1:-gateway-server}"

# Load env file (adjust path if you keep per-service .env)
ENV_FILE="./${SERVICE_NAME}/.env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC2046
  export $(grep -E '^[A-Z0-9_]+=' "$ENV_FILE" | sed 's/#.*//')
fi

# Required vars with sensible defaults
: "${GOOGLE_PROJECT_ID:?Set GOOGLE_PROJECT_ID in .env}"
: "${REGION:=us-central1}"
: "${PORT:=8080}"

# Image tag
TAG="${GOOGLE_PROJECT_ID}/${SERVICE_NAME}:$(date +%Y%m%d-%H%M%S)"

echo "Building image: gcr.io/${TAG}"
gcloud builds submit \
  --project "${GOOGLE_PROJECT_ID}" \
  --tag "gcr.io/${TAG}" \
  "./${SERVICE_NAME}"

echo "Deploying service: ${SERVICE_NAME} → ${REGION}"
gcloud run deploy "${SERVICE_NAME}" \
  --project "${GOOGLE_PROJECT_ID}" \
  --region "${REGION}" \
  --image "gcr.io/${TAG}" \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "PORT=${PORT}" \
  --set-env-vars "NODE_ENV=production"

URL="$(gcloud run services describe "${SERVICE_NAME}" --project "${GOOGLE_PROJECT_ID}" --region "${REGION}" --format 'value(status.url)')"
echo "Deployed: ${URL}"
