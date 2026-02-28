#!/usr/bin/env bash
set -euo pipefail

VALUES_FILE="${1:-live/helm/live-stack/values.yaml}"

if [[ ! -f "$VALUES_FILE" ]]; then
  echo "Values file not found: $VALUES_FILE" >&2
  exit 1
fi

helm upgrade --install live-stack live/helm/live-stack \
  --namespace live --create-namespace \
  -f "$VALUES_FILE"

kubectl -n live rollout status deploy/signaling --timeout=180s
kubectl -n live rollout status deploy/sfu-gateway --timeout=180s
kubectl -n live rollout status deploy/transcoder --timeout=180s
kubectl -n live rollout status deploy/coturn --timeout=180s

echo "Live stack deployed successfully"
