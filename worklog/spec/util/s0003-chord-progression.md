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
- Use s0005 for chord, pitch, tuning, voicing, and future musical-time semantics.

## Required in t0002

- A compact, horizontally scrollable chord list: play each chord, remove, reorder, and move an insertion cursor.
- A UI to specify and play a candidate chord, then insert it into the list.
- A display of the notes currently sounding.
- Optionally, a simple feature list on the home page; decoration comes later.

## Editor contract

- Start with an empty progression and a C-major candidate. Changing a control never plays or inserts it.
- Root and chord-type selectors create the candidate. Show its derived symbol and spelled notes. Invalid input is impossible through this UI.
- Play and Insert are separate actions. Candidate edits never change stored entries.
- Keep the progression in memory without an arbitrary list-length cap. Selecting a stored entry leaves the candidate unchanged; change stored chords by removing and reinserting.
- The cursor denotes a position between entries. Insert there, then advance it after the new entry.
- Show that position as a dashed candidate preview with an Insert action directly in the chord strip. Small `+` buttons move the preview to other gaps. Do not rely on arrows or an explanatory position sentence. Candidate changes update the preview; clicking it inserts there.
- Preserve the cursor before its following entry through unrelated edits. It remains at the end when no following entry exists; when its anchor is removed, use the next surviving entry.
- Select entries by stable ID. Reorder the selected entry with Move left/right controls; unavailable moves are disabled. Drag-and-drop is deferred.
- Insertion selects the new entry. Removing the selection chooses its successor, then predecessor, then none.
- Keep the list horizontally scrollable and compact. Scroll an explicit cursor move or insertion into view.
- Display the active, sounding note labels with register. Candidate notes are not claimed as sounding.
- An audition is an immutable snapshot. Reorder does not change it; removing its source entry stops it.

## Verification

Check empty and single-item lists, list boundaries, repeated chords, cursor movement, reorder, candidate isolation, and playback target consistency.

## Future features — excluded from t0002

- Automatic playback of the entire progression: expected soon.
- Non-English support.
- BPM, beat-length, soundfont, and articulation adjustment.
- Chord suggestions.
- Musical-scale and temperament adjustment.

Supporting varied musical data does not require exposing these adjustment controls now.
