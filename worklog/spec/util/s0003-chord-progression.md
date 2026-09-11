+++
id = "s0003"
title = "Chord Progression"
+++

# Chord Progression

## Initial deliverable — UNIMPLEMENTED

t0002 delivers a page with a simple tool for creating a chord progression and listening to individual chords.

- A compact, horizontally scrollable list of chords supports playing each chord, removing and reordering chords, and moving an insertion cursor.
- A chord-specification UI lets the user specify and play a chord and insert it into the list.
- A note-display UI shows which notes are currently being played.

Foundational UX is in scope. Non-essential features and intricate design are not. The utility is expected to gain features, and its code is expected to be reused in a fully fledged DAW. Modularity, extensibility, and prevention of future technical debt are primary constraints. Shared site requirements are in s0002; reusable sound behavior belongs in s0004.

Automatic playback of the entire progression is excluded from t0002. It is expected soon after this milestone, so the architecture must account for its addition even though BPM management and playback timing can remain simpler for individual-chord playback now.

## Proposed interaction contract — NEEDS APPROVAL

- Represent insertion positions between chords, including before the first and after the last chord. An empty progression has one valid insertion position.
- Insert the specified chord at the cursor. Define cursor movement after insertion, removal, and reorder during refinement so editing cannot leave a stale or invalid position.
- Keep editing a candidate chord distinct from stored progression entries; changing the candidate does not implicitly alter an already inserted chord.
- Specify and verify removal and reorder at the beginning, middle, and end of the list, including the empty and single-chord cases. Define which item a playback action addresses after a reorder.
- Keep the compact list horizontally usable on portrait screens, with a discoverable insertion position. Select touch and keyboard interactions during refinement; no particular drag-and-drop design is assumed.
- Drive the played-note display from the playback lifecycle, rather than candidate selection or a separate guessed UI timer. Specify behavior at playback end, interruption, and failure.

## Proposed reusable design contract — NEEDS APPROVAL

- Keep musical data and progression editing independent of rendered components and sound generation. Keep progression order and insertion state explicit rather than deriving them from the DOM.
- Separate chord-to-note interpretation from the progression editor and the playback backend; document the data passed across each boundary.
- Use the same reusable sound contract for candidate preview and list-item playback; s0004 owns playback lifecycle and played-note reporting.
- Document how later sequencing, articulation, sound selection, and alternative tuning would connect to these boundaries. Implement only the contracts needed for current behavior; future features do not justify unused engines or a speculative plugin system.
- Check representative editing and playback behavior independently of the page where possible. UI-only validation is insufficient evidence of reuse.

## Decisions to resolve during t0002 — NEEDS APPROVAL

- Supported chord vocabulary and input method, note naming, pitch/register and voicing representation, and invalid-input behavior.
- Initial sound source, playback duration, articulation, tuning, and behavior when another chord is triggered while sound is active. These are required implementation choices, not permission to add adjustment controls.
- Concrete insertion, cursor-after-edit, reorder, scrolling, and note-display interactions.

Record approved behavior in this spec and s0004 before dependent implementation. Create additional specs only where a distinct reusable responsibility warrants one, and add their IDs to t0002's governing specs.

## Future potential features — excluded from t0002

These features are excluded from the current milestone. Automatic progression playback is expected in the near term; the other items remain future possibilities:

- Non-English support.
- Automatic playback of the entire progression — expected soon after t0002; individual-chord playback is required in t0002.
- Adjust BPM.
- Adjust beat length.
- Adjust soundfont.
- Adjust how a chord is articulated.
- Chord suggestion.
- Adjust musical scale and temperament.
