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
- A chord stores a root, an optional explicitly spelled bass, an interval-based definition, and a separate voicing. Its display symbol is derived presentation.
- A progression entry has a stable ID. Identical chords remain distinct entries.
- Editing operations are plain-data insert, replace, remove, and move operations. Replacement preserves entry identity. Selection and playback state are outside the progression; available UI actions are governed by s0003.
- Resolve frequency only at the sound boundary. Validate external values there and at construction boundaries; use ArkType if a runtime schema is useful.
- `@rechorder/music` owns generic pitch/interval/voicing types and a separate conventional adapter; it has no browser globals. See `docs/music-and-audio.md` for extension contracts.

## Initial values for t0002

- Tuning: 12-tone equal temperament, A4 = 440 Hz.
- Voicing: fixed root-position close voicing with the root in octave 3.
- Chord catalogue: major, minor, diminished, augmented, sus2, sus4, dominant seventh, major seventh, and minor seventh.
- The progression is untimed. Audition duration is not musical beat data.

## Deferred

Tuning controls, register/voicing controls, text parsing, persistence, undo, and a comprehensive theory library.

## Jazz and slash chords

- Extend the initial catalogue with 6, m6, 6/9, add9, m(add9), m(maj7), dim7, m7♭5, 7sus4, and dominant/major/minor 9, 11 and 13.
- Store editable ♭5, ♯5, ♭9, ♯9, ♯11 and ♭13 alterations explicitly. Altering a degree replaces that degree, or adds it when absent; conflicting alterations of the same degree are exclusive. Selecting a new type resets these modifiers.
- Spell extensions by their diatonic degree, including double accidentals. Use complete ascending stacks for now, without implicit jazz omissions or automatic voice leading.
- Slash bass accepts all 21 root spellings. Voice it strictly below the complete upper chord in the nearest available octave; retain the upper structure, including a duplicated bass pitch class if present. Preserve bass spelling independently of the root.
- These are conventional-adapter choices; generic musical data remains independent of twelve-tone tuning and octave assumptions.
