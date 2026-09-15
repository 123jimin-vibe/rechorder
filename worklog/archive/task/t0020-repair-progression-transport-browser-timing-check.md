+++
id = "t0020"
title = "Repair progression transport browser timing check"
status = "done"
modifies = []
+++

# Repair progression transport browser timing check

## Outcome

Make the progression transport browser check observe one playback run and its bounded lookahead scheduling reliably at 120 BPM.

## Completion

- [x] Isolate scheduled sources created by the playback under test.
- [x] Wait for the second chord to enter the scheduling horizon before checking its start time.
- [x] Confirm the targeted browser test and relevant static checks pass.

## Verification — 2026-09-15

- Desktop and portrait Chromium timing checks passed against the installed Chrome channel.
- `pnpm lint`, `pnpm typecheck`, 18 audio unit tests, targeted Prettier checking, and `git diff --check` passed.
