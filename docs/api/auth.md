# Auth API

## Purpose

Describe how StateCode authenticates users through the Node API and Rust gRPC auth service.

## Current flow

1. Client sends login or registration request to `apps/api`.
2. API validates and forwards auth operations to `apps/auth-rs` over gRPC.
3. Rust service persists user state in SQLite and returns the normalized user record.
4. Web client stores the returned session payload in local storage.

## Endpoints to document

- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/region`
- `POST /auth/visibility`
- current-user/session sync endpoint used by the web app

## Required details

- request body schema;
- success payload;
- validation errors;
- banned-account behavior;
- admin restrictions;
- CORS expectations for `localhost` and `127.0.0.1`.

## Notes to keep updated

- A banned user must be redirected to `/banned`.
- Admin accounts cannot be banned by other admins through the application flow.
- `region_code`, `visibility`, `leaderboard_hidden`, and `is_banned` are session-critical fields.
