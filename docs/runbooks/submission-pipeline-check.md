# Submission Pipeline Check

## Goal

Verify that code execution and solve completion still work end to end.

## Procedure

1. Open a known sample problem in `/solve`.
2. Click `Start` to open `/workspace/[problemId]`.
3. Run a sample solution in at least one working language.
4. Confirm sandbox output returns verdict, timing, stdout, and stderr.
5. Submit an accepted solution.
6. Confirm the problem becomes solved in `/problems` and `/solve`.
7. Confirm operations dashboard reflects the new submission.

## If it fails

- no execution: inspect executor availability;
- accepted but not solved: inspect solve completion API path;
- queue not updating: inspect API operations memory and submission trace logic.
