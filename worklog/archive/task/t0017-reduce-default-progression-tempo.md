+++
id = "t0017"
title = "Reduce default progression tempo"
modifies = ["s0003"]
status = "done"
+++

# Reduce default progression tempo

## Outcome

Change the fixed progression playback tempo from 150 BPM to 120 BPM.

## Completion

- [x] Set the default BPM to 120 while retaining two beats per chord.
- [x] Update timing tests, the governing progression spec, and audio documentation.
- [x] Pass focused tests and static checks.

## Verification — 2026-09-15

- `pnpm lint`, `pnpm typecheck`, all 71 Vitest tests, targeted Prettier checks, and the production web build passed.
- Progression timing tests cover the new one-second chord duration, lookahead, pause/resume, play-from-here, and natural completion boundaries.
