+++
id = "s0003"
title = "Chord Progression"
+++

# Chord Progression

## Principles

- Optimize quick transcription (s0001): visible choices, immediate audition, compact progression, and deliberate commits.
- Follow s0002's modularity and accessibility; s0004 governs audio and s0005 musical meaning.
- Keep candidate edits, stored chords, selection, and playback separate. No intricate design or speculative DAW infrastructure.

## Editor

- Start empty with a C-major candidate; do not play on page load.
- Show all catalogue roots and chord types as direct buttons. Tapping either updates and immediately auditions the candidate; tapping it again replays it. Show its symbol and spelled notes.
- The horizontal timeline contains compact chord buttons. Tapping one selects it by stable ID, loads its value into the candidate controls, and immediately plays it.
- Center any timeline button when tapped, including first/last and repeated taps; leave the user free to scroll afterward. Appending reveals the new end item.
- **Append** adds the candidate at the end and selects the new entry. **Replace** changes only the selected entry's value, preserving its ID and position; disable it when nothing is selected. Neither commit adds another audition.
- One accessible backspace button always removes the last entry, regardless of selection. Preserve an earlier selection; if the selected last entry is removed, clear selection. Keep the candidate available for reuse.
- No cursor, insertion gaps, move buttons, per-item Play/Remove buttons, or drag reordering.
- Keep the progression in memory without an arbitrary length cap. Candidate edits do not change entries until committed; repeated chords retain distinct IDs.
- Display currently sounding note labels with register, including release tails. Auditions snapshot their notes; removing/replacing their source cancels that source's audition.

## Presentation and verification

- Keep the timeline the same height when empty or filled. Show no visual ordinals, count, or placeholder instructions. Put remove-last outside its horizontal scroll area and keep chord buttons compact with touch-sized targets.
- Group root pads in aligned sharp, natural, flat rows (e.g. C♯ above C and C♭ below); preserve this alignment when zoomed. Keep the candidate heading and sounding-note display geometrically stable as symbols and active notes change.
- Use concise visible action names, grouped root/type pads, and adjacent Append/Replace actions. Preserve focus, contrast, and touch targets with replaceable CSS variables.
- Check empty/single/long lists, identity-preserving replacement, remove-last selection boundaries, candidate isolation, keyboard operation, rapid audition switching, and portrait overflow.

## Future — excluded

- Automatic progression playback (expected soon); BPM and beat lengths.
- Drag reordering, non-English support, chord suggestions.
- Soundfont/articulation, musical-scale, temperament, and voicing controls.

Supporting varied musical data does not require exposing these controls now.
