+++
id = "t0032"
title = "Use compact microtonal grid labels"
modifies = ["s0007"]
status = "done"
+++

# Use compact microtonal grid labels

## Scope and completion

- Replace long fifth-chain labels with compact nearest-note microtonal notation and enlarge the text; preserve Pythagorean playback and pitch identity.
- Bundle a small licensed accidental font for consistent musical glyphs, and inspect labels at desktop/portrait sizes.
- Verify musical boundary cases and existing grid interactions.

## Decision

- User selected exact Pythagorean comma notation. Use simple enharmonic names with exact counted comma arrows, preserving the underlying tuning.

## Outcome and verification

- Reconciled s0007: simple enharmonic labels, exact comma arrows/counts, displayed-octave colors, and 26 px note letters. Playback still resolves the original pitch coordinates.
- Bundled a 4.44 KB sharp/flat font subset with source revision, reproducible generation script, renamed family, and retained/embedded OFL license. No runtime font service or new application dependency.
- Passed lint, all type checks, production build, 122 unit tests, and all six existing grid browser tests in Chromium desktop/portrait. New musical checks cover B/C respelling, negative/multiple commas, and exact frequency reconstruction across 481 fifth-chain positions.
- Visually inspected the larger portrait labels. Root `pnpm check` still stops at the same 17 pre-existing formatting failures; changed files were formatted and `git diff --check` passes. Firefox/WebKit and physical devices remain unverified.
