+++
id = "s0005"
title = "Musical Model"
+++

# Musical Model

## Principles

- Preserve musical meaning independently of tuning, frequency, UI, and audio.
- Do not assume twelve-tone equal temperament, octave repetition, integer-semitone intervals, or a fixed beat grid.
- Use exact fractions of a whole note for future musical positions and durations; meter and tempo are separate.

## Required model

- A pitch has a musical identity and spelling. Tuning resolves it to frequency; sounding equality never erases spelling.
- A chord stores a root, an optional bass selection, an interval-based definition, and a separate voicing. A conventional bass selection binds either to a chord degree or an explicitly spelled pitch. Its display symbol and inversion are derived presentation.
- A progression entry has a stable ID. Identical chords remain distinct entries.
- Editing operations are plain-data insert, replace, remove, and move operations. Replacement preserves entry identity. Selection and playback state are outside the progression; available UI actions are governed by s0003.
- Resolve frequency only at the sound boundary. Validate external values there and at construction boundaries; use ArkType if a runtime schema is useful.
- `@rechorder/music` owns generic pitch/interval/voicing types and a separate conventional adapter; it has no browser globals. See `docs/music-and-audio.md` for extension contracts.

## Initial values for t0002

- Tuning: 12-tone equal temperament, A4 = 440 Hz.
- Default voicing: root-position ascending chord tones with the root in octave 4.
- Chord catalogue: major, minor, diminished, augmented, sus2, sus4, dominant seventh, major seventh, and minor seventh.
- The progression is untimed. Audition duration is not musical beat data.

## Deferred

Tuning controls, text parsing, persistence, undo, and a comprehensive theory library.

## Contextual recommendations — t0025

- Keep recommendations in the conventional adapter, with pure typed APIs independent of UI and audio. Do not impose conventional tonal assumptions on generic musical data.
- Accept ordered context, an explicit insertion/replacement position or a fixed-bass candidate, optional tonic/mode, and a result limit. Return concrete auditionable chords, numerical ranking components, structured reasons and uncertain tonal hypotheses.
- Rank using local context on both sides, optional/inferred key fit, harmonic function and directed resolutions (including applied dominants and minor-key leading tones), common tones, actual register-aware voice movement, bass motion, replacement similarity and complexity. Preserve functionally required bass resolution when choosing concrete voicings. Scale membership alone cannot decide suitability, and borrowed-chord claims require every chord tone to belong to the claimed source.
- Infer tonal hypotheses from a bounded neighborhood, without treating the initial candidate as evidence for an empty progression. Avoid a confident key claim for sparse or ambiguous evidence; explicit context overrides inference. Prefer key-consistent spelling and preserve fixed-bass spelling and sounding register.
- Search across roots and catalogue qualities, including inversions for a fixed bass. Select playable voicings using both neighbors; expose a diverse, deterministic ranked list rather than many near-identical extensions. Collapse exact-sounding alternatives unless their spelling or harmonic analysis communicates a defensible theoretical distinction. Preserve spelling-based identity separately from sounding equality so alternate tunings and temperaments can distinguish them later. Keep input data immutable and computation bounded independently of full progression length.
- These are transparent tonal heuristics, not a trained model or a style/melody/rhythm-aware harmonization system. No inferred melody, pedal, timing or stylistic intention.

## Jazz and slash chords

- Extend the initial catalogue with 6, m6, 6/9, add9, m(add9), m(maj7), dim7, m7♭5, 7sus4, and dominant/major/minor 9, 11 and 13.
- Store editable ♭5, ♯5, ♭9, ♯9, ♯11 and ♭13 alterations explicitly. Altering a degree replaces that degree, or adds it when absent; conflicting alterations of the same degree are exclusive. Selecting a new type resets these modifiers.
- Spell extensions by their diatonic degree, including double accidentals. Start with complete ascending stacks; no implicit jazz omissions or automatic voice leading.
- Bass analysis distinguishes root, chord degrees and pitches outside the defined chord, preserving spelling separately from sounding equivalence. Member choices include double accidentals and follow their degree through harmonic edits. Explicit pitch choices retain their spelling. Selecting a member rearranges existing tones to put it lowest without automatically doubling it; an outside bass is added below the upper chord.
- These are conventional-adapter choices; generic musical data remains independent of twelve-tone tuning and octave assumptions.

## Chord manipulation — t0022

- Separate harmonic edits (quality, additions, alterations, explicit omissions) from voicing (register, spacing, octave placements, muted tones and doublings). Voicing edits preserve the symbol and defined membership.
- Provide ascending/close and open voicings, whole-chord octave shifts and individual tone octave/copy controls. Keep the selected bass lowest and sounding; reject empty or contradictory voicings.
- Derive root position and conventional triad/seventh inversions from spelled membership; label extended degrees by their role without inventing inversion names. Enharmonic equivalents remain distinguishable from exact spelled members.
- Choosing a different root or catalogue type clears bass, alterations and other harmonic modifiers; choosing the same value replays without clearing. Preserve spacing and register; reset per-tone edits when harmony or bass changes.
- Transpose root and explicit bass by a spelled interval together, retaining quality, modifiers and degree-bound voicing. Enharmonic respelling preserves sounding pitches. Progression transforms preserve entry IDs and order.
- Conventional editor voicings stay within the existing C1–B6 audition range and at most 16 sounding notes, leaving room for transport lookahead and independent keyboard voices; disable edits that exceed these bounds. These are adapter/UI bounds, not generic musical restrictions.
