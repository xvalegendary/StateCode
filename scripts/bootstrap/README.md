# Bootstrap Scripts

This folder is for first-run setup and environment preparation.

## What belongs here

- dependency checks for Node, Rust, Cargo, and platform tools;
- local `.env` bootstrap from `.env.example`;
- folder creation for local SQLite or artifact storage;
- optional seed initialization that does not mutate production data.

## Expected scripts

- `setup.ps1`: workstation bootstrap for Windows development.
- future `verify-tools.ps1`: explicit dependency verification.

## Rule

Bootstrap scripts should be safe to rerun. If they modify files, they should do so predictably and report what changed.
