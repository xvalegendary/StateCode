# Admin API

## Purpose

Describe platform moderation and problem-management capabilities.

## Current areas

- user lookup and management;
- ban and unban;
- role assignment;
- leaderboard visibility changes;
- manual rank and title adjustments;
- problem creation and visibility updates.

## Mandatory guardrails

- admin accounts cannot be banned through the admin flow;
- all admin actions must be authenticated;
- destructive changes should be auditable once action logging is added.

## Future additions

- problem editing history;
- moderation audit log;
- admin session policy;
- scoped moderator permissions.
