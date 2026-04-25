# Architecture

This folder explains how the system is split, how requests travel, and where state lives.

## Recommended document set

- `system-context.md`: high-level runtime layers.
- `runtime-topology.md`: service map and network boundaries.
- `data-flow.md`: auth, submission, and solve completion paths.
- `state-and-storage.md`: SQLite, in-memory state, browser session state, future persistence.

Architecture docs should describe the system as it exists now first, then note the intended target shape separately.
