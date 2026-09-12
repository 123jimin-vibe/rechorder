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
- A chord stores a root, an interval-based definition, and a separate voicing. Its display symbol is derived presentation.
- A progression entry has a stable ID. Identical chords remain distinct entries.
- Editing operations are plain-data insert, remove, and move operations. Cursor/selection and playback state are outside the progression.
- Resolve frequency only at the sound boundary. Validate external values there and at construction boundaries; use ArkType if a runtime schema is useful.
- `@rechorder/music` owns generic pitch/interval/voicing types and a separate conventional adapter; it has no browser globals. See `docs/music-and-audio.md` for extension contracts.

## Initial values for t0002

- Tuning: 12-tone equal temperament, A4 = 440 Hz.
- Voicing: fixed root-position close voicing with the root in octave 3.
- Chord catalogue: major, minor, diminished, augmented, sus2, sus4, dominant seventh, major seventh, and minor seventh.
- The progression is untimed. Audition duration is not musical beat data.

## Deferred

Tuning controls, register/inversion controls, arbitrary extensions or alterations, text parsing, persistence, undo, and a comprehensive theory library.
