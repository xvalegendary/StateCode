# ADR 0001: Monorepo Layout

## Status

Accepted

## Decision

Use a monorepo split into deployable applications, reusable packages, and infrastructure assets.

## Consequences

- Cross-service contracts stay versioned together.
- The Rust executor can evolve independently from the Node.js control plane.
- CI can validate shared types and end-to-end fixtures from one repository.
