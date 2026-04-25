# Docs

Architecture and operating knowledge live here. Keep implementation detail in code and keep reasoning, decisions, and runbooks here.

## Layout

- `architecture/`: runtime topology, service boundaries, data flow, deployment shape.
- `api/`: HTTP and gRPC surface, auth contract notes, request and response behavior.
- `runbooks/`: operational procedures for local development, incidents, maintenance, and admin workflows.
- `adr/`: architectural decisions with context, tradeoffs, and consequences.

## Minimum standard

Each document in this folder should answer one concrete question:

- what exists;
- why it exists;
- how to operate it;
- what can fail;
- what to check first.

## Current priorities

1. Keep auth, submission, and sandbox behavior documented as contracts.
2. Record infra assumptions before adding production deployment manifests.
3. Add runbooks only for flows that someone can actually execute today.
