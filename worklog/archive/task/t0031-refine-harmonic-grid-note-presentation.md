+++
id = "t0031"
title = "Refine harmonic grid note presentation"
modifies = ["s0007", "s0005"]
status = "done"
+++

# Refine harmonic grid note presentation

## Scope and completion

- Replace repeated accidental signs with proper double signs and distinguish octave typography; enlarge note labels.
- Color hexagons by spelled octave, preserving color while held and fading out-of-range notes.
- Inspect portrait and desktop rendering and run relevant existing checks.

## Outcome and verification

- Reconciled s0005 and s0007. Pythagorean pitches expose separate label parts; the grid uses proper double symbols, 17 px letters, subscript octave numbers, and octave-colored fills with distinct held/faded states.
- Inspected portrait and desktop screenshots, including double symbols and out-of-range notes. Recorded the user's label feedback in n0001.
- Passed lint, all type checks, production build, 120 unit tests, and all six existing grid browser cases in Chromium desktop/portrait. Changed files were formatted; `git diff --check` passes.
- Root `pnpm check` remains blocked by the same 17 pre-existing formatting failures outside this change. Firefox/WebKit and physical devices remain unverified.
