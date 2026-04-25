# K8s Base

Add one manifest set per deployable unit once image build and runtime contract are stable.

## Expected files later

- `namespace.yaml`
- `web-deployment.yaml`
- `api-deployment.yaml`
- `auth-rs-deployment.yaml`
- `executor-deployment.yaml`
- `worker-deployment.yaml`
- `configmap.yaml`
- `secrets.example.yaml`
- `kustomization.yaml`

Do not add placeholder YAML that nobody can apply yet. Add real manifests only when ports, probes, and storage are known.
