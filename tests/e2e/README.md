# End-To-End Tests

This folder is for scenarios that validate StateCode as a working platform, not as isolated services.

## Minimum scenarios

- auth registration and login;
- banned-user redirect to `/banned`;
- problem listing and solved marker propagation;
- workspace run and accepted submission;
- admin moderation and problem management.

## Structure

- `api/`: black-box API scenarios.
- `web/`: browser or route-level scenarios.

Keep tests scenario-driven. Name files after the behavior being protected, not the implementation detail.
