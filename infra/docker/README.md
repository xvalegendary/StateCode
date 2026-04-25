# Docker

This folder is for local or CI containerized dependencies, not for application-specific ad hoc scripts.

## Current use

- `docker-compose.local.yml` starts local Postgres and Redis.

## Recommended additions

- per-service seed or init scripts under `postgres/` only if they are actually used;
- local observability stack only after there is a real consumer;
- one compose file per environment purpose, for example `local` and `ci`.

## Keep out

- production secrets;
- machine-specific overrides committed to git;
- duplicate service definitions that drift from the actual app ports.
