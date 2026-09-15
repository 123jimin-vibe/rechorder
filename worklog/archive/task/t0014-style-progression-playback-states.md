+++
id = "t0014"
title = "Style progression playback states"
modifies = ["s0003"]
status = "done"
+++

# Style progression playback states

## Outcome

Make progression items subtly raised by default and visibly pressed only while their chord is sounding.

## Completion

- [x] Default, selected, and playing treatments remain visually distinct.
- [x] Direct timeline auditions and automatic progression playback both drive the pressed state.
- [x] Styling remains accessible and compact in desktop and portrait layouts.
- [x] Static, unit, browser, and build verification pass.

## Verification — 2026-09-15

- `pnpm lint`, `pnpm typecheck`, 69 Vitest tests, and the production web build passed.
- Four targeted Chromium checks passed across desktop and portrait: raised/pressed computed styles for direct and automatic playback, plus the existing transport interaction regression.
- The browser checks used port 4174 because the configured port 4173 remains occupied by an unrelated Node process.
