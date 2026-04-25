# Web E2E

This folder should contain browser-level scenarios for pages and critical user flows.

## Recommended scenarios

- `auth-screen.*`: login, sign up, mode switch animation, forgot password entrypoint.
- `navbar.*`: active route state, mobile sidebar, logged-in avatar state.
- `workspace.*`: open from `Solve`, run code, see verdict, mark task solved.
- `banned-user.*`: banned account lands on `/banned`.

## Rule

Test what a user sees and can do. Do not duplicate low-level API assertions here.
