# Scripts

Keep developer automation and release helpers here. Prefer small focused scripts over one large bootstrap file.

## Layout

- `bootstrap/`: first-run setup, environment preparation, local dependency checks.
- `dev/`: local developer helpers for starting, stopping, seeding, and smoke-checking the stack.
- `release/`: build, package, and release preparation helpers.
- root-level scripts: only repository-wide scripts that are clearly discoverable and frequently used.

## Rules

- every script should do one job;
- every script should print useful failure output;
- avoid hidden machine-specific assumptions;
- if a script touches ports, files, or processes, document that in the file header or README.

## Current priorities

1. Make local setup reproducible on Windows.
2. Keep smoke and admin verification scripts versioned with the repo.
3. Add release automation only after build inputs are stable.
