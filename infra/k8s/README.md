# Kubernetes

This folder should hold deployable manifests only after the service boundaries are stable enough to justify them.

## Layout

- `base/`: namespace-agnostic manifests for web, API, auth, executor, and shared config.
- `overlays/local/`: local kustomize patch set for development clusters.
- future overlays: `dev`, `staging`, `prod`.

## Before adding manifests

Document:

- container images and tags;
- required environment variables;
- persistent volumes;
- service-to-service ports;
- readiness and liveness expectations.
