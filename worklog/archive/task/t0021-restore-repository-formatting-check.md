+++
id = "t0021"
title = "Restore repository formatting check"
status = "done"
modifies = []
+++

# Restore repository formatting check

## Outcome

Restore the repository-wide formatting gate and record the verification mistake that let it reach CI.

## Completion

- [x] Format the repository without changing implementation behavior.
- [x] Record the missed repository-wide verification in n0001.
- [x] Run the complete `pnpm check` command successfully.

## Verification — 2026-09-15

- `pnpm check` passed: repository formatting, lint, typecheck, and all 71 unit tests.
