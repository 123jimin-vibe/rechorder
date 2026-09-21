+++
id = "t0037"
title = "Fix degenerate acoustic suggestions"
modifies = ["s0003", "s0005", "s0007"]
status = "done"
+++

# Fix degenerate acoustic suggestions

## Scope

- Reported after t0036: chord suggestions still look like a fixed popular set, and progression suggestions offer uninteresting chords with missing notes. Reproduced 2026-09-21: the default Varied lens for C G → ? in C major returned A(no3), F♯m(no5), G (the previous chord) and C(add2)/G; Blend ranked the previous chord first in every context.
- After a first patch that only removed dyads and repeats, the report was that it had become noticeably worse: an empty C-major progression suggested B(add13), Cm(add2), D♭m(add2), G(add4); after a lone C it suggested Eaug/B♯, F♯(add13)/C♯, C♯dim, F(add2)/C; and the score bars had disappeared. The requirement stated: conventional chords should be shown, without hiding unconventional chords that sound good.

## Causes

1. t0036 replaced one ranking with four lenses that each select an extreme of a single descriptor (lowest roughness, largest roughness change, least movement, tonal role). No descriptor extreme measures whether a chord sounds good, so the default could only surface oddities: dyads and doublings for minimum roughness, stacked seconds for maximum, the previous chord for minimum movement, augmented triads once dyads were excluded. Varied also hid the bars by design.
2. Roughness alone cannot separate augmented or diminished triads from major ones in one register; n0005 §2 named harmonicity as the missing descriptor.
3. The t0036 edits pool admitted dyads (omit 3 or 5 from triads), and acoustic lenses dropped the tonal complexity term, so nothing penalized thinness or repeating a neighbor.
4. Grid exploration treated octave doublings as blending additions, and its ±2-fifth neighborhood reached only octaves, fifths and whole tones of a lone note.

## Outcome and verification

- `measureSonority` gains **harmonicity**: Milne's spectral pitch-class similarity (twelve partials, h^-0.67, 6.8-cent smearing, best cosine fit to one harmonic series over subharmonic candidates). Register-free; triads 0.72, sus 0.80, sevenths 0.61–0.67, augmented 0.62, diminished 0.59, dim7 0.51.
- `recommendChords` returns one ranked list again; the `lens`, `basis` and Varied/Blend/Contrast paths are removed along with the `explore` voicing flag. The tonal terms are unchanged. A new `acoustic` component, measured on the chosen voicing with its bass shifted to C4, adds `3 × (harmonicity − 0.724)` and subtracts `12 × max(0, roughness − 0.090)`, the C major triad's values. Plain triads score 0, sevenths about −0.3, sus about +0.2, augmented about −0.3, diminished about −0.8, close-voiced added seconds or fourths about −0.4. Added seconds and fourths beside a third now take the same 80 % colour discount as ninths, so an add2 no longer ties the plain triad on role. Every harmony is voiced and measured; the former top-48 preselection is gone (about 80–100 ms per request).
- Pool policy for every request: at least three distinct pitch classes, never the harmony of an adjacent or replaced chord. The tonal −3 repeated-harmony penalty is therefore removed.
- Panel: lens selector removed, score bars restored for every list, an empty progression uses the builder's assumed key again, and tooltips show harmonicity, roughness at a C4 bass and voice movement. Grid texture shows harmonicity; grid exploration draws from an explicit lattice region and offers a doubling as its own kind.
- Results: empty C major → C, G, F, Am; C → F, G, Am, Em; C G → C, F, Am, B; Dm7 G7 → Cmaj7, C, F, Am; Am F (auto) → Dm, C, Am, E.
- Verified: `pnpm typecheck`, `pnpm lint`, Prettier on touched files, `pnpm test`, and `pnpm build` followed by `pnpm test:browser --project=chromium-desktop --project=chromium-portrait`.
