# Live Streaming Scaffold (AWS EKS + WebRTC + LL-HLS)

This directory provides a production-oriented scaffold for rolling out a low-latency streaming stack with:

- **Signaling service** (WebSocket + JWT issuance)
- **Event bus** (NATS)
- **SFU gateway stub** (LiveKit-compatible integration point)
- **Transcoder stub** (LL-HLS packager/upload workflow)
- **TURN/STUN** via coturn
- **AWS EKS + S3 + CloudFront** infrastructure patterns

> Overlay remains a black box and should be integrated later from `overlay/README.md`.

## Directory Layout

- `infra/terraform/` — Terraform scaffold for EKS, S3, CloudFront, DNS/TLS hooks
- `helm/live-stack/` — Helm chart for signaling/eventbus/sfu/transcoder/coturn
- `k8s/` — useful Kubernetes YAML snippets (secret templates, namespace)
- `scripts/` — deployment and validation helpers
- `tests/` — smoke test script for end-to-end service availability
- `docs/` — rollout notes and checklist mapping

## Quick Start

1. Copy and fill runtime values:
   ```bash
   cp live/helm/live-stack/values.example.yaml live/helm/live-stack/values.yaml
   cp live/secrets/.env.live.example live/secrets/.env.live
   ```
2. Provision AWS infra:
   ```bash
   cd live/infra/terraform
   terraform init
   terraform apply -var-file=prod.tfvars
   ```
3. Create namespace/secrets:
   ```bash
   kubectl apply -f live/k8s/namespace.yaml
   ./live/scripts/create-secrets.sh
   ```
4. Deploy stack:
   ```bash
   helm upgrade --install live-stack live/helm/live-stack -n live --create-namespace -f live/helm/live-stack/values.yaml
   ```
5. Run smoke test:
   ```bash
   ./live/tests/smoke.sh
   ```

## Production Notes

- Use IAM Roles for Service Accounts (IRSA), not long-lived static AWS keys.
- Restrict coturn inbound CIDRs where possible.
- Issue TLS via AWS ACM and terminate at ALB Ingress.
- Keep JWT signing secret in AWS Secrets Manager and sync via External Secrets.
- Enable HPA and cluster autoscaler for burst traffic.
