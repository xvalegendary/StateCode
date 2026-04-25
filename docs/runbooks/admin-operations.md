# Admin Operations

## Supported tasks

- ban and unban users;
- assign moderator or admin roles;
- hide users from leaderboard;
- create or update problems.

## Guardrails

- admin accounts must not be bannable through the admin interface;
- banned users should land on `/banned`;
- moderation changes must be verified against the next profile sync.

## Verification after each action

1. Refresh the affected user profile.
2. Confirm leaderboard visibility if changed.
3. Confirm the navbar session state matches the new role.
4. Confirm banned users cannot continue normal navigation.
