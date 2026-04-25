# API Docs

This folder documents externally visible platform behavior.

## Scope

- public web-facing HTTP endpoints exposed by `apps/api`;
- gRPC contracts between `apps/api` and `apps/auth-rs`;
- submission and sandbox execution lifecycle;
- admin-only actions and authorization rules.

## Files to keep here

- `auth.md`: registration, login, session refresh, banned-user behavior, profile updates.
- `problems.md`: problem listing, problem details, filters, solved markers.
- `submissions.md`: run, validate, expected output checks, queue visibility, execution trace.
- `admin.md`: user moderation, role changes, leaderboard visibility, problem management.

## Rule

If frontend behavior depends on an API field or status code, document it here before changing the contract again.
