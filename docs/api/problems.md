# Problems API

## Purpose

Document how problems are listed, filtered, and rendered in `Problems`, `Solve`, and `Workspace`.

## Cover these behaviors

- problem catalog response shape;
- categories and difficulty filtering;
- supported languages per problem;
- solved state for the current user;
- slug and ID matching rules;
- visibility rules for private and admin-managed problems.

## Frontend dependencies

- `/problems` needs `solved_by_current_user`.
- `/solve` needs categories, difficulty, languages, and launch metadata.
- `/workspace/[problemId]` needs stable resolution by ID or slug.

## Keep in sync with

- `apps/api`
- `apps/web/src/features/platform`
- admin problem editor behavior
