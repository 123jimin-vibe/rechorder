+++
id = "t0003"
title = "Improve audition switching and insertion UI"
modifies = ["s0003", "s0004"]
status = "done"
+++

# Improve audition switching and insertion UI

## Outcome

Start a newly requested chord immediately during playback. Replace the arrow cursor and explanatory sentence with a movable, actionable candidate preview in the chord strip.

## Completion

- [x] Running audio schedules the next audition synchronously; prior release never delays its start.
- [x] Insertion is visible at its actual position, supports keyboard input, and preserves anchor semantics.
- [x] Regression tests, browser checks, and build pass; s0003 and s0004 reflect the corrections.

## Verification — 2026-09-12

- `pnpm check` and `pnpm build` passed; 36 unit tests include synchronous replacement while an earlier chord is still playing.
- All 32 Chrome/Edge desktop and portrait browser checks passed. New regressions verify native audio starts before the original one-second audition ends without another resume call, and the dashed insertion preview follows candidate changes and inserts between the intended neighbors with Enter.
- Reviewed the portrait insertion screenshot. Firefox/WebKit and physical-device listening remain outside available local automated coverage, as recorded in t0002.
- In the refreshed embedded browser, verified C-to-D-minor switching shows the new sounding notes immediately with no console errors, and the inline preview follows candidate changes.
- Updated s0003, s0004, the extension documentation, and n0001.
