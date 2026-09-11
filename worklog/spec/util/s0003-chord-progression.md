+++
id = "s0003"
title = "Chord Progression"
+++

# Chord Progression

## Principles

- Follow s0002's modularity, atypical-temperament, and complex-beat requirements.
- Deliver foundational UX; exclude non-essential features and intricate design.
- Reuse musical operations and sound contracts outside this page. s0004 governs sound.
- Expect automatic progression playback soon; implement only individual-chord playback in t0002.

## Required in t0002 — UNIMPLEMENTED

- A compact, horizontally scrollable chord list: play each chord, remove, reorder, and move an insertion cursor.
- A UI to specify and play a candidate chord, then insert it into the list.
- A display of the notes currently sounding.
- Optionally, a simple feature list on the home page; decoration comes later.

## Details to settle in t0002

- Chord vocabulary/input, note naming, register/voicing, and invalid-input behavior.
- Cursor positions and movement after edits, candidate-versus-stored-chord behavior, and touch/keyboard reorder interactions.
- Playback defaults and retrigger policy with s0004; note-display behavior on completion, interruption, and failure.
- Verify empty/single-item lists, boundaries, repeated chords, and edit/playback consistency.

## Future features — excluded from t0002

- Automatic playback of the entire progression: expected soon.
- Non-English support.
- BPM, beat-length, soundfont, and articulation adjustment.
- Chord suggestions.
- Musical-scale and temperament adjustment.

Supporting varied musical data does not require exposing these adjustment controls now.
