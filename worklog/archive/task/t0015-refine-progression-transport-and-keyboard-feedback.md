+++
id = "t0015"
title = "Refine progression transport and keyboard feedback"
modifies = ["s0003", "s0006"]
status = "done"
+++

# Refine progression transport and keyboard feedback

## Outcome

Simplify chord-progression transport controls and make shared piano-key presses feel physical.

## Completion

- [x] Remove octave shortcuts from the chord-progression keyboard only.
- [x] Replace Pause with Play from here, starting at the selected progression item.
- [x] Use clear accessible icons for transport actions and compact danger styling for remove-last.
- [x] Give sounding keys a shared pressed treatment in both utilities.
- [x] Static, unit, browser, and build verification pass.

## Verification — 2026-09-15

- `pnpm lint`, `pnpm typecheck`, 69 Vitest tests, and the production web build passed.
- Six targeted desktop/portrait Chromium checks covered transport start selection and timing, icon-only accessible controls, compact danger removal, absent chord-page octave shortcuts, white/black shared key press motion, and narrow 200% text layout.
- Browser checks used port 4174 because the configured port 4173 remains occupied by an unrelated Node process.
