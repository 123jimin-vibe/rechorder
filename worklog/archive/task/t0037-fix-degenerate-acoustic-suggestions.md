+++
id = "t0037"
title = "Fix degenerate acoustic suggestions"
modifies = ["s0003", "s0005", "s0007"]
status = "done"
+++

# Fix degenerate acoustic suggestions

## Scope

- Reported after t0036: chord suggestions still look like a fixed popular set, and progression suggestions offer uninteresting chords with missing notes.
- Reproduced with `recommendChords` (2026-09-21). Default Varied for C G → ? in C major returned A(no3), F♯m(no5), G (the previous chord) and C(add2)/G. Blend ranked the previous chord first in every tried context. Grid "Nearby additions" for a C major triad offered an octave doubling as its blend pick.

## Causes

1. The t0036 seed edits include omission of degrees 3 and 5 from major/minor seeds at every root, so dyads entered every non-tonal pool. Pair-averaged roughness makes a bare fifth the least rough and a bare third the roughest candidate by construction, so dyads won both acoustic extremes. n0005 §2 had warned that minimum roughness alone prefers thinning.
2. Acoustic lenses discarded the tonal complexity term, so nothing penalized repeating a neighbor's harmony, and zero movement made the previous chord the best Blend and the best Varied "voices" pick.
3. Blend used absolute roughness as an objective. Varied's blend and contrast picks used a single descriptor while the weighted lenses used two, so their results disagreed and a seven-note 13th chord could "blend" with a triad.
4. Grid exploration treated octave copies of selected pitch classes as blending additions, and its ±2-fifth neighborhood reached only octaves, fifths and whole tones of a lone note.

## Outcome and verification

- Every lens applies one declared candidate policy at the pool level: at least three distinct pitch classes, and never the harmony of an adjacent or replaced chord. The tonal −3 repeated-harmony penalty is therefore removed; the −1.5 repeated-root penalty remains. The tonal catalogue has no dyads and its results are otherwise unchanged.
- Blend and Contrast score the same two descriptors with opposite signs, both relative to the neighbors: mean absolute roughness change and mean voice movement, with the chord's own roughness as the fallback for an empty context. Varied's blend and contrast picks use the same totals.
- Grid exploration draws from an explicit lattice region (classes within four fifths of the selection's range, octaves within one octave beyond its register) and offers an octave doubling as its own kind rather than as blend.
- Known limit, documented: the roughness model barely separates augmented and diminished triads from major ones in one register, so Blend can rank them first when they share tones with the neighbors. A harmonicity descriptor is a separate task.
- Specs s0003, s0005 and s0007 t0036 sections amended with t0037 notes; `docs/chord-recommendations.md` updated.
- Verified: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` (129 unit tests), and `pnpm test:browser` for `harmonic-grid` and `recommendations` on `chromium-desktop` and `chromium-portrait`.
