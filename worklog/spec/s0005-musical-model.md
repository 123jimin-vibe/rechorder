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

Tuning controls, text parsing, undo, and a comprehensive theory library.

## Pythagorean pitches — t0030

- Represent a pitch by integer pure-fifth and octave displacements from C4. Preserve these coordinates independently of frequency and conventional enharmonic equivalence.
- Derive its diatonic spelling from the fifth chain, including accidentals and register. Resolve tuning with the 3:2 fifth and 2:1 octave, anchored to A4 = 440 Hz.
- Expose this as a separate adapter; conventional chord-editor tuning remains governed by its own requirements.
- Expose the Pythagorean letter, accidental text, and spelled octave separately for presentation. Use double-accidental glyphs instead of repeated single signs; combine singles and doubles through quadruple accidentals and use bounded multiplier notation for longer chains.

## Stored chord data — t0028

- The conventional adapter exposes a plain, JSON-ready chord shape for storage and transfer: root and bass positions (spelling derived on load), the catalogue definition ID, the explicit alteration/addition/omission recipe, and the voicing. The derived definition is never stored; loading rebuilds it through the same alteration and bass operations the editor uses and throws on unknown types, conflicting alterations, out-of-range degrees or an absent bass degree.
- Runtime validation of untrusted data happens in the application at the storage boundary (s0002); the music package stays free of schema and platform dependencies.

## Contextual recommendations — t0025, t0027

- Keep recommendations in the conventional adapter, with pure typed APIs independent of UI and audio. Do not impose conventional tonal assumptions on generic musical data.
- Accept ordered context, an explicit insertion/replacement position or a fixed-bass candidate, optional tonic/mode, an optional design focus (one root move, or applied/borrowed color) and a result limit. Return concrete auditionable chords, numerical ranking components, structured reasons (key role with Roman numeral, root move per side, bass line, smooth voices) and uncertain tonal hypotheses.
- In the selectable Tonal lens, rank harmony before register, from four terms grounded in common progressions (n0004): the idiom prior of the chord's key role averaged over hypotheses; root-motion frequency from the previous chord and into the next; register-free voice-leading smoothness; and complexity (density mismatch with neighbors, unjustified extensions, repeated harmony or root). Replacement adds similarity to the replaced chord. A plain triad a fifth above counts as a dominant only with a seventh or a dominant/applied role in the key.
- Choose the bass second: detect a bass line from the two previous chords (an inversion starts one; two basses a step apart give it a direction, register-free) and reward the inversion that continues it by step; otherwise keep the root in the bass. Choose the register last by actual voice movement. Fixed-bass requests keep the exact sounding bass.
- Expose Roman-numeral roles (`chordRole`) and key-relative diatonic triads/sevenths (`diatonicChord`, raising the minor leading tone for V and vii°) for design controls; `motion` names the root move between chords.
- Infer tonal hypotheses from a bounded neighborhood, without treating the initial candidate as evidence for an empty progression. Only root-position tonic chords count as tonic evidence; keys whose tonic never sounds in root position are weaker. Avoid a confident key claim for sparse or ambiguous evidence; explicit context overrides inference. Prefer key-consistent spelling and preserve fixed-bass spelling and sounding register.
- Search across roots and catalogue qualities, including inversions for a fixed bass or a bass line and, in acoustic lenses, inversions for voice continuity. Expose a diverse, deterministic list rather than many near-identical extensions or repeated basses. Collapse exact-sounding alternatives unless their spelling or harmonic analysis communicates a defensible theoretical distinction. Preserve spelling-based identity separately from sounding equality so alternate tunings and temperaments can distinguish them later. Keep input data immutable and computation bounded independently of full progression length.
- These are transparent tonal heuristics, not a trained model or a style/melody/rhythm-aware harmonization system. No inferred melody, pedal, timing or stylistic intention. Numerical weights are documented in `docs/chord-recommendations.md`.

## Sonority descriptors and selectable assessment — t0036

- `measureSonority` accepts any finite positive frequency collection and returns pair-averaged roughness from six harmonic partials with 1/h amplitudes plus frequency-span cents. `voiceMotion` measures minimum ordered movement in cents with an explicit 300-cent entry/exit cost. Neither requires a chord definition or twelve-tone pitch class. These model descriptions must not be presented as calibrated preference scores.
- `recommendChords` defaults to an unranked Varied selection representing blend, roughness contrast, voice continuity and tonal interpretation. Blend and Contrast lenses use concrete sounding voicings and adjacent chords, with an explicit relative score; Tonal preserves the preceding conventional behavior. Exploratory lenses add bounded degree edits from independent major/minor seeds and adjacent user chords to the catalogue pool. Results remain auditionable and persistable conventional chords; arbitrary-note storage remains future work.

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
