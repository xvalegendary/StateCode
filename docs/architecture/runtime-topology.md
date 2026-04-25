# Runtime Topology

## Services

- `apps/web`: Next.js frontend for contestants, admins, and public pages.
- `apps/api`: Node.js control-plane API that serves HTTP endpoints and talks to Rust auth.
- `apps/auth-rs`: Rust gRPC auth and profile service backed by SQLite.
- `apps/executor-rs`: Rust execution engine for sandboxed code runs.
- `apps/worker`: worker-side orchestration entrypoint for background execution tasks.

## Boundaries

- Browser talks only to `apps/web` and `apps/api`.
- `apps/api` is the integration hub for auth, problems, submissions, and operations data.
- `apps/auth-rs` owns user persistence and profile-related state.
- executor-related services should remain isolated from public network exposure.

## Current storage

- auth data: SQLite in `apps/auth-rs/data/auth.db`;
- transient operations and queue stats: in-memory in the API process;
- browser auth session: local storage in the web app.

## Near-term target

- move queue and submission history from in-memory API state to durable storage;
- formalize worker-to-executor communication;
- introduce production-ready infra manifests once the runtime contract stabilizes.
