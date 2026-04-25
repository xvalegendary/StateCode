# Auth Service Incident

## Symptoms

- login and registration fail;
- web shows auth service unavailable;
- profile updates stop working;
- banned redirect or region updates become stale.

## Checks

1. Confirm `apps/auth-rs` is running on `127.0.0.1:50051`.
2. Check if `apps/api` can still reach the gRPC endpoint.
3. Verify `apps/auth-rs/data/auth.db` exists and is writable.
4. Look for `AddrInUse` or SQLite access errors in auth logs.

## Recovery

1. Stop duplicate auth processes.
2. Restart auth and API together.
3. Re-test login and current-user sync.

## Follow-up

- record whether the issue was port collision, DB lock, or bad schema state;
- add migration or startup checks if the same class of failure repeats.
