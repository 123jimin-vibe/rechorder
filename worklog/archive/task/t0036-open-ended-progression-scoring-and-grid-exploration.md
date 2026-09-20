+++
id = "t0036"
title = "Open-ended progression scoring and grid exploration"
modifies = ["s0003", "s0005", "s0007"]
status = "done"
+++

# Open-ended progression scoring and grid exploration

## Outcome

- Replace the single style-weighted recommendation score with explicit exploration lenses based on sounding notes and neighboring transitions, while retaining conventional tonal ranking as a selectable lens.
- Make the harmonic grid useful for unnamed selected collections by exposing acoustic/transition descriptors and open-ended note additions from its pitch lattice.
- Keep note identity, audition bounds, existing controls, and deliberate commits intact. Update governing specs and documentation to describe delivered behavior.
- Verify scoring invariants, grid alternatives beyond the name templates, and interaction with focused unit/browser tests plus repository checks.

## Outcome and verification

- Added `measureSonority` and `voiceMotion` in `@rechorder/music` as name-free descriptors of exact sounding frequencies and ordered voice movement; both are exercised by the recommendation scorer and the harmonic grid.
- `recommendChords` now selects `explore` (Varied) by default and offers `blend`, `contrast`, and `tonal` lenses. Acoustic lenses score modeled roughness and cross-chord voice movement on the concrete voicing; Tonal retains the previous function/motion ranking with its component bars. The candidate pool combines the catalogue with bounded degree edits from independent major/minor seeds and neighboring chords, still emitted as persistable recipe operations.
- Progression suggestions panel exposes lens selection, hides relative-score bars in Varied, and shows roughness/span/movement descriptors for acoustic choices while keeping tonal reasons available.
- The harmonic grid keeps unnamed collections playable, reports their roughness, span, and previous-collection movement, and offers blend/edge/wider note additions from a bounded fifth-chain/octave neighborhood that preserve every selected pitch and the 16-note audition limit. Named completions remain available alongside.
- Governing specs updated: s0005 §"Sonority descriptors and selectable assessment — t0036"; s0003 §"Open-ended assessment — t0036"; s0007 §"Open-ended exploration — t0036". `docs/chord-recommendations.md` describes the new lenses, descriptors, and seed pool.
- Verified: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` (11 files, 128 unit tests), and `pnpm test:browser --project=chromium-desktop --project=chromium-portrait` (95 passed, 1 skipped; matches CI matrix). Pre-existing WebKit/Firefox environment gaps (missing Web Audio, CDP-only helpers) surface in unrelated `piano`, `chord-progression`, `chord-manipulation`, and `foundation` tests and are out of scope for this task.
