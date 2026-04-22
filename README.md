# StateCode

StateCode is a monorepo for an online judge platform built around three layers:

- control plane: auth, API gateway, problem catalog, submission intake
- execution plane: workers and Rust runtime services
- experience plane: Next.js web application for contestants and operators

The repository currently includes a working Rust gRPC authentication service, a Node.js HTTP gateway, and a Next.js frontend wired to real login and registration flows.

## What Is Included

- `apps/web`: Next.js 16 App Router frontend with `shadcn/ui`
- `apps/api`: Node.js HTTP gateway for frontend-facing auth endpoints
- `apps/auth-rs`: Rust gRPC authentication service using `tonic`
- `apps/worker`: worker placeholder for async submission execution
- `apps/executor-rs`: Rust execution runtime placeholder
- `packages/contracts`: shared contracts, including gRPC protobuf definitions
- `packages/problem-format`: shared problem packaging helpers
- `packages/sdk`: shared TypeScript SDK workspace
- `packages/ui`: shared UI workspace
- `docs`: architecture notes and ADRs
- `infra`: local infrastructure scaffolding

## Current Product Surface

The web app currently exposes:

- `/`: control room dashboard
- `/leaderboard`: separate leaderboard page
- `/problems`: separate problem catalog page
- `/solve`: solving workspace with categories and difficulty `1-10`
- `/login`: login, registration, and password reset UI

Authentication is live end-to-end:

- web form -> HTTP gateway -> Rust gRPC auth service

## Architecture

```text
Next.js Web (3000)
        |
        v
Node API Gateway (4000)
        |
        v
Rust gRPC Auth Service (50051)
```

The current auth path works like this:

1. The frontend submits login or registration data with `fetch`.
2. `apps/api` accepts HTTP requests on `/auth/*`.
3. `apps/api` forwards those requests to the Rust gRPC auth service.
4. `apps/auth-rs` validates credentials, persists users, and returns auth payloads.
5. The frontend stores the returned auth payload in `localStorage`.

## Tech Stack

- Frontend: Next.js, React 19, Tailwind CSS v4, `shadcn/ui`
- API gateway: Node.js, TypeScript, `@grpc/grpc-js`, `@grpc/proto-loader`
- Auth service: Rust, `tonic`, `prost`, `argon2`
- Monorepo orchestration: npm workspaces, Turbo

## Requirements

- Node.js 20+
- npm 10+
- Rust stable toolchain

On Windows, `run-statecode.bat` is the easiest way to start the stack.

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Start the full local stack

Windows:

```bat
run-statecode.bat
```

This launches three separate terminals:

- Rust auth gRPC service
- Node API gateway
- Next.js web app

Manual startup:

```bash
npm run dev --workspace @judge/auth-rs
npm run dev --workspace @judge/api
npm run dev --workspace @judge/web
```

### 3. Open the app

- Web: [http://localhost:3000](http://localhost:3000)
- Web also works from [http://127.0.0.1:3000](http://127.0.0.1:3000)

## Ports

| Service | Default port | Notes |
| --- | --- | --- |
| Web | `3000` | Next.js frontend |
| API gateway | `4000` | HTTP auth endpoints |
| Auth gRPC | `50051` | Rust gRPC auth service |

## Environment

Example defaults live in [.env.example](./.env.example).

Auth-related runtime values used today:

- `API_PORT`: HTTP port for `apps/api`
- `AUTH_GRPC_ADDR`: target gRPC address used by the API gateway
- `AUTH_DATA_PATH`: optional JSON file path for local auth persistence
- `ALLOWED_ORIGINS`: comma-separated list of allowed browser origins for the API gateway
- `NEXT_PUBLIC_API_URL`: frontend API base URL, defaults to `http://localhost:4000`

## Auth API

Current HTTP endpoints exposed by `apps/api`:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/password-reset`
- `GET /health`

Current gRPC service defined in [packages/contracts/proto/auth.proto](./packages/contracts/proto/auth.proto):

- `Register`
- `Login`
- `RequestPasswordReset`

## Development Commands

Root:

```bash
npm run dev
npm run build
npm run typecheck
```

Per app:

```bash
npm run dev --workspace @judge/web
npm run dev --workspace @judge/api
npm run dev --workspace @judge/auth-rs
```

Rust auth service:

```bash
cargo fmt --manifest-path apps/auth-rs/Cargo.toml
cargo check --manifest-path apps/auth-rs/Cargo.toml
cargo test --manifest-path apps/auth-rs/Cargo.toml
```

## Repository Layout

```text
apps/
  api/          HTTP gateway
  auth-rs/      Rust gRPC auth service
  web/          Next.js frontend
  worker/       background worker placeholder
  executor-rs/  execution runtime placeholder
packages/
  contracts/    shared contracts and protobufs
  problem-format/
  sdk/
  ui/
docs/
infra/
tests/
```

## Notes

- `apps/auth-rs` currently persists users to a local JSON file for development.
- The worker and executor layers are still placeholders compared to the auth stack.
- The web app is already wired to the live auth service, not a mock.

## Documentation

- [System Context](./docs/architecture/system-context.md)
- [ADR 0001: Monorepo Layout](./docs/adr/0001-monorepo-layout.md)

## Status

StateCode is not a finished online judge yet. It is a working monorepo foundation with:

- live auth flow
- multi-page Next.js frontend
- Rust gRPC service integration
- shared contracts inside the repo

The next major backend slices are submission intake, queue orchestration, execution, and result aggregation.
