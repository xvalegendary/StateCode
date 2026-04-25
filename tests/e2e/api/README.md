# API E2E

This folder should contain end-to-end API scenarios against a running local stack.

## Recommended scenarios

- `auth-flow.*`: register, login, profile sync, region update.
- `admin-flow.*`: admin login, user ban, admin-ban rejection, problem creation.
- `submission-flow.*`: sandbox run, accepted solve, operations snapshot update.

## Expectations

- tests should start from known fixture state;
- tests should not depend on random usernames without cleanup;
- failures should print the endpoint and payload context that broke.
