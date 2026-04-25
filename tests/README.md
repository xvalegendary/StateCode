# Cross-App Tests

Repository-level integration and end-to-end scenarios belong here when they span more than one application.

## Layout

- `e2e/`: flows that exercise multiple services together.
- `fixtures/`: stable test data for problems, users, submissions, and sandbox inputs.

## What qualifies for this folder

- login through API plus auth-rs;
- submission through API plus executor behavior;
- solved-state propagation into profile or leaderboard;
- admin flows that change user or problem state across services.

## Rule

If a test only touches one app internally, keep it inside that app. Use this folder only for repository-level behavior.
