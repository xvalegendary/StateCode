# Local Development

## Start the platform

Use:

```powershell
.\run-statecode.bat
```

## Expected local services

- web on port `3000`;
- API on port `4000`;
- Rust auth gRPC on port `50051`.

## First checks

1. Open the main page and confirm the navbar and dashboard load.
2. Open `/login` and verify auth requests reach the API.
3. Submit a sample solution in `/workspace/[problemId]`.
4. Confirm `/leaderboard` and `/problems` return data.

## Common failures

- `AddrInUse` on Rust auth: another process is already using `127.0.0.1:50051`.
- CORS mismatch: `localhost` and `127.0.0.1` origins are not aligned.
- build lock on Windows: running `.exe` prevents overwrite during rebuild.
