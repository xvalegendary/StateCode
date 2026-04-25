# Terraform

Terraform should own cloud primitives, not application runtime behavior.

## Layout

- `modules/app/`: reusable module for service deployment dependencies.
- `environments/dev/`: environment wiring for the development stack.

## What belongs here

- network;
- managed database and cache resources;
- object storage;
- secrets integration references;
- compute platform resources.

## What does not belong here

- app business logic;
- SQL seed data;
- frontend copy or config unrelated to cloud infrastructure.
