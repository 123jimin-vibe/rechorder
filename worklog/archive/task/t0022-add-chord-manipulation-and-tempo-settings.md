+++
id = "t0022"
title = "Add chord manipulation and tempo settings"
modifies = ["s0003", "s0005", "s0004"]
status = "done"
+++

## Scope

- Implement chord-tone/bass roles, inversions, voicing, independent harmonic tone edits, transposition and enharmonic respelling with compact mobile controls.
- Clear bass and alterations when choosing a different root or chord type; repeated choices replay without resetting. Transposition preserves the entire harmony.
- Add an extensible top settings form with working BPM adjustment, initially 120.
- Preserve suggestion requirements in n0003 without implementing suggestions.

## Completion

- Reconcile s0003, s0004 and s0005; verify musical meaning, candidate isolation, tempo lifecycle, accessibility and portrait/zoom layout.
- Run formatting, lint, types, unit tests, production build and available browser checks; inspect rendered mobile layouts.

## Progress

- Chord model separates identity, bass selection and voicing: member bass inverts the stack without duplicating a note, an outside bass sounds below the chord, and the bass position reads as root position, an inversion or outside the chord.
- Chord tones (include, omit, add), close/open voicing, chord octave, per-tone sounding, octave placement and doubling, transposition of the candidate or the whole progression, and enharmonic respelling are all available in grouped disclosures.
- Choosing a different root or chord type clears bass and alterations; repeating the current choice replays it. Transposition carries the bass and voicing.
- The top settings form adjusts BPM and retimes playback in place.
- Verified: format, lint, types, 82 unit tests, production build, 57 browser checks (1 desktop-only skip), and portrait rendering at 390 CSS pixels.
