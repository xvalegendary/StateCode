# Data Flow

## Registration and login

1. Web form posts to API.
2. API forwards to Rust auth service.
3. Rust auth persists user state in SQLite.
4. API returns normalized session payload.
5. Frontend stores session and hydrates navbar, profile, and solve state.

## Submission run

1. Workspace sends code, language, stdin, and expected output.
2. API dispatches sandbox execution.
3. Executor compiles or runs the code.
4. API records the trace in operations memory.
5. Web renders verdict, stdout, stderr, timing, and queue impact.

## Accepted solve

1. Accepted sandbox result triggers solve completion.
2. API resolves the problem by ID or slug.
3. Auth and profile stats are updated.
4. Solved state becomes visible in `Problems`, `Solve`, `Leaderboard`, and profile surfaces.

## Banned account

1. Session sync fetches current profile state.
2. If `is_banned` is true, frontend redirects to `/banned`.
3. Banned page blocks normal platform navigation.
