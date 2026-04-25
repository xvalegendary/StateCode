# K8s Local Overlay

Use this overlay only if the project starts supporting local Kubernetes development.

## This overlay should patch

- image pull policy;
- replica count;
- local hostnames;
- non-production resource requests;
- development-only config values.

If Docker Compose remains the only supported local setup, keep this folder as documentation only.
