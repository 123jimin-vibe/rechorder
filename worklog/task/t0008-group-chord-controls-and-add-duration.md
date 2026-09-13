+++
id = "t0008"
title = "Group chord controls and add duration"
status = "blocked"
modifies = ["s0003", "s0005"]
+++

## Scope

- Group Root with Bass; place Jazz & extensions under Chord type.
- Use octave 4 for default chord roots and initially show C4 on the piano; preserve coverage of voiced extensions.
- Add a duration selector defaulting to 2/4 without affecting audio yet. Duration scope and available values await clarification.

## Completion

- Verify layout hierarchy, default pitches, full piano coverage, and selector state without changing audition behavior.
- Run project checks, build and available browser checks; update governing specs.

## Progress and next action

- Root/Bass and Chord type/Jazz are grouped structurally for desktop and mobile. Default chord roots use octave 4; the piano initially shows C4 and extends through B6 for the full catalogue.
- Updated s0003, s0005 and architecture documentation for delivered behavior. `pnpm check` (55 unit tests), `pnpm build`, and 26 Chrome desktop/portrait browser checks passed. Reviewed the portrait screenshot.
- Duration remains unimplemented pending the user's answers: global playback setting versus per-chord value, and selectable duration values. The requested 2/4 default and no audio effect are settled. Resume with the answers, add selector coverage, reconcile specs, rebuild and verify.
