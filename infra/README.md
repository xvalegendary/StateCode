# Infrastructure

Local orchestration, deployment manifests, and cloud provisioning should stay here, separated from application code.

## Layout

- `docker/`: local dependencies and container-based development helpers.
- `k8s/`: Kubernetes manifests and overlays once runtime boundaries are stable.
- `terraform/`: cloud resources, environments, and reusable modules.

## Rule

Do not drop random deployment files in the repo root. Every runtime dependency or deployment asset should live under one of these folders with its own README and ownership notes.

## Current state

- local Docker dependencies exist for Postgres and Redis;
- production deployment manifests are intentionally not finalized yet;
- the repository still needs environment-specific infra docs before real cloud rollout.
