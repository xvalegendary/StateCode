# State And Storage

## Current sources of truth

- `apps/auth-rs/data/auth.db`: users, auth-related profile state, moderation flags.
- API process memory: operations snapshot, recent submission traces, queue counters.
- browser local storage: client-side session cache.

## Risks

- API restart clears queue and operations history.
- local storage cannot be treated as authoritative for bans or roles.
- mixed persistence models make incident debugging harder.

## Recommended next steps

1. Introduce durable submission storage.
2. Add migration tracking for SQLite schema changes.
3. Define which state remains cache-only and which becomes persistent.
