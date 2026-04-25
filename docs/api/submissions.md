# Submissions API

## Purpose

Describe the code execution path from editor input to sandbox result and solve completion.

## Flow

1. User opens `/workspace/[problemId]`.
2. Client submits code, selected language, stdin, and expected output.
3. API forwards execution request to the executor layer.
4. Sandbox returns compile and runtime information.
5. If the answer is accepted, API persists the solve and updates profile stats.
6. Operations snapshot exposes queue and worker state for the dashboard.

## Document these endpoints

- code run endpoint;
- solve completion endpoint;
- operations snapshot endpoint;
- operator actions endpoint.

## Required semantics

- verdict names and meaning;
- compile errors vs runtime errors vs tool-unavailable;
- timeout handling;
- worker pool attribution;
- queue counters and submission trace retention.
