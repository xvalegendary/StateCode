# Terraform Dev Environment

This directory should describe the smallest cloud environment that can run StateCode outside local Windows development.

## Minimum target

- one public web entrypoint;
- one API service;
- one auth service;
- one execution path for sandbox jobs;
- managed persistence for auth and submission state.

## Expected files later

- `main.tf`
- `variables.tf`
- `outputs.tf`
- `terraform.tfvars.example`

Keep dev cheap and disposable. Do not design prod-scale topology here first.
