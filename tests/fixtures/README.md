# Fixtures

This folder contains stable input data shared by repository-level tests.

## Keep fixtures deterministic

- no random IDs unless the test explicitly rewrites them;
- small payloads over giant snapshots;
- one fixture per behavior cluster;
- document format close to the fixture if it is non-obvious.

## Current groups

- `problems/`
- `submissions/`
