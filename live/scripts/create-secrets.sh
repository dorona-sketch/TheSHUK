#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f "live/secrets/.env.live" ]]; then
  echo "Missing live/secrets/.env.live (copy from .env.live.example)" >&2
  exit 1
fi

kubectl create namespace live --dry-run=client -o yaml | kubectl apply -f -

kubectl -n live create secret generic live-secrets \
  --from-env-file=live/secrets/.env.live \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Applied secret live/live-secrets"
