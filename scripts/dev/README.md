# Dev Scripts

This folder is for day-to-day local developer operations.

## Good candidates

- start or stop helper wrappers;
- smoke tests against local API and auth services;
- local DB reset or seed helpers;
- cache cleanup and port cleanup scripts;
- sample problem import or verification helpers.

## Keep here, not in bootstrap

- anything that assumes the stack is already installed;
- scripts used repeatedly during active development;
- temporary operational helpers that may later become runbooks.

## Current useful scripts

- repository root `run-statecode.bat`
- repository root `stop-statecode.bat`
- root `smoke-admin.ps1`
