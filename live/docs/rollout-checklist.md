# Implementation & Rollout Checklist Mapping

## 1) Infrastructure setup (AWS EKS)

- Terraform scaffold in `live/infra/terraform` provisions:
  - EKS cluster and node group autoscaling
  - S3 bucket for HLS segments (`hls-stream-bucket` style)
  - CloudFront distribution with S3 origin plus bucket policy scoped to CloudFront distribution ARN
  - ALB Ingress-ready annotations and ACM cert ARNs as variables

## 2) TURN/STUN

- coturn deployment is included in Helm (`coturn` values + deployment).
- Exposes `3478` UDP/TCP and supports long-term credentials (`turnuser:<secret>` pattern).
- Supports public DNS hostname such as `turn.example.com`.

## 3) Deploy services

- Helm chart deploys:
  - signaling
  - eventbus (NATS)
  - sfu-gateway (LiveKit integration stub)
  - transcoder
  - coturn
- Secrets are expected from Kubernetes `Secret` named `live-secrets`.

## 4) Testing & validation

- `live/tests/smoke.sh` validates:
  - signaling health
  - eventbus connection endpoint
  - TURN reachability
  - HLS URL accessibility
- Additional manual validation:
  - OBS ingest (WHIP/RTMP)
  - Browser playback + WebRTC internals (<500ms target)
  - LL-HLS fallback URL retrieval

## 5) CDN and edge

- CloudFront behavior includes cache policy placeholders for LL-HLS playlist/segment paths.
- Verify with CloudFront standard logs / real-time logs.

## 6) Monitoring

- Chart has ServiceMonitor-ready labels and metrics endpoint placeholders.
- Integrate CloudWatch Container Insights + Prometheus/Grafana.
- Alerts suggested:
  - packet loss >10%
  - end-to-end latency >300ms
  - SFU CPU saturation

## 7) Go live

- Cut traffic by DNS switch after soak and smoke test pass.
- Continue overlay integration from `overlay/README.md`.
