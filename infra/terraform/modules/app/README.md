# Terraform App Module

This module should encapsulate shared deployment inputs for StateCode services.

## Likely inputs

- service name;
- container image;
- CPU and memory;
- environment variables;
- secret references;
- ports;
- autoscaling settings;
- health check path or command.

## Likely outputs

- service URL or internal DNS;
- service account identity;
- log group or monitoring identifiers.

Keep the module generic enough for `api`, `auth-rs`, `executor`, and `worker`, but not so generic that every deployment becomes unreadable.
