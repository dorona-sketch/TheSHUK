#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-live}"
SIGNALING_URL="${SIGNALING_URL:-https://live.example.com/health}"
HLS_URL="${HLS_URL:-https://d111111abcdef8.cloudfront.net/live/test.m3u8}"
TURN_HOST="${TURN_HOST:-turn.example.com}"
TURN_PORT="${TURN_PORT:-3478}"

for required_cmd in curl kubectl timeout bash; do
  if ! command -v "$required_cmd" >/dev/null 2>&1; then
    echo "Missing required command: $required_cmd" >&2
    exit 1
  fi
done

echo "[1/4] Checking signaling endpoint: $SIGNALING_URL"
curl -fsS "$SIGNALING_URL" >/dev/null

echo "[2/4] Checking eventbus service exists"
kubectl -n "$NAMESPACE" get svc eventbus >/dev/null

echo "[3/4] Checking TURN TCP reachability: ${TURN_HOST}:${TURN_PORT}"
timeout 3 bash -c "</dev/tcp/${TURN_HOST}/${TURN_PORT}" >/dev/null 2>&1

echo "[4/4] Checking LL-HLS URL: $HLS_URL"
curl -fsS "$HLS_URL" >/dev/null

echo "Smoke test passed"
