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
- Show roots and basic chord types as direct buttons, with Bass grouped below Root and Jazz & extensions grouped below Chord type. These relationships hold in desktop columns and mobile stacking. Musical choices immediately audition the candidate; repeated choices replay it. Show its symbol and spelled notes. Different root/type choices clear bass and harmonic modifiers; repeated choices retain them.
- The horizontal timeline contains compact chord buttons. Tapping one selects it by stable ID, loads its value into the candidate controls, and immediately plays it.
- Appending scrolls the horizontal timeline to reveal the new end item. Selecting an existing item does not initiate scrolling. Users may freely scroll; native keyboard focus may reveal its target.
- **Append** adds the candidate at the end and selects the new entry. **Replace** changes only the selected entry's value, preserving its ID and position; disable it when nothing is selected. Neither commit adds another audition.
- One accessible backspace button always removes the last entry, regardless of selection. Preserve an earlier selection; if the selected last entry is removed, clear selection. Keep the candidate available for reuse.
- No cursor, insertion gaps, move buttons, per-item Play/Remove buttons, or drag reordering.
- Keep the progression in memory without an arbitrary length cap. Candidate edits do not change entries until committed; repeated chords retain distinct IDs.
- Above the Progression timeline, a touchable C1–B6 piano keyboard highlights sounding pitches, including enharmonic equivalents and release tails. Initially show C4. Horizontal scrolling reaches its keys; omit octave shortcut controls in this utility. This range includes the lowest slash bass and highest catalogue extension. Press/hold promptly plays one note until release, cancelled touch, lost capture or keyboard focus; do not add a second audition from the compatibility click. Support simultaneous fingers and Space/Enter. Touch and pen presses avoid native focus/tap rectangles while keyboard focus remains visible. Keep a screen-reader note announcement. Keyboard notes do not edit chords and may sound alongside an audition.
- Auditions snapshot their notes; removing/replacing their source cancels that source's audition.

## Progression playback

- Provide Play, Play from here, and Stop beside the progression. Play starts at the beginning when stopped and resumes from the preserved position after an individual audition pauses it. Play from here starts a fresh snapshot at the selected entry; disable it without a selection and while transport is playing. Stop and natural completion reset to the beginning. Use distinct accessible icons where their meaning remains clear.
- Every chord lasts two quarter-note beats at the BPM in the top settings form (initially 120). Transport timing is playback policy rather than stored chord data. Applying tempo during playback preserves musical position and updates remaining scheduling; paused playback resumes at the new tempo. Individual auditions remain one second.
- Starting any individual chord audition, including a candidate edit, candidate replay, or timeline chord, pauses progression playback first. Keyboard notes remain independent and do not pause it.
- Playback snapshots the ordered entries when it starts. A paused snapshot resumes independently of later editor changes; the next stopped start captures the current progression.

## Presentation and verification

- Share the playable keyboard and its self-contained key styling with s0006. Touch and pointer drags scroll the keyboard while their starting notes continue until their own contact releases or cancels; compatibility-pointer cancellation during an active touch does not release it, and stationary fingers continue playing independently.

- Keep the timeline the same height when empty or filled, with no vertical overflow and enough room for complete buttons plus the native scrollbar. Show no visual ordinals, count, or placeholder instructions. Put remove-last outside its horizontal scroll area; compact buttons expand to preserve complete extended/slash symbols. Give progression items a subtle raised-button treatment by default and a pressed treatment only while that item's chord is sounding, whether from a direct tap or automatic playback; selection remains a distinct state.
- Use compact root and bass pads (at least 36 px at default text size), preserving one-tap access to all spellings. Group root pads in aligned sharp, natural, flat rows (e.g. C♯ above C and C♭ below); preserve this alignment when zoomed. The piano is a conventional-adapter view; future temperaments may replace it without changing musical data. Keep the candidate heading and sounding-note display geometrically stable as symbols and active notes change.
- Use concise visible action names, grouped root/type pads, and adjacent, content-width Append/Replace actions above Root. Jazz types and alterations use dense wrapping grids. Make remove-last as compact as the transport controls and use a danger treatment. Preserve accessible names, focus, contrast, and touch targets with replaceable CSS variables.
- Check empty/single/long lists, identity-preserving replacement, remove-last selection boundaries, candidate isolation, keyboard operation, rapid audition switching, and portrait overflow.

## Future — excluded

- Editable beat lengths.
- Drag reordering, non-English support, chord suggestions.
- Soundfont/articulation, musical-scale and temperament controls.

Supporting varied musical data does not require exposing these controls now.

## Compact manipulation and settings — t0022

- Put a compact, labelled BPM number form at the very top of the page, in a settings container that can accommodate more settings. Apply finite values from 1–600 BPM on blur or Enter; invalid values retain the last applied tempo and expose native validation. Editing settings never starts audio. This initial playback UI bound is not a generic musical restriction.
- Show chord-member bass choices directly under Root, with pitch and degree labels and a concise derived bass-position label. Put all other spelled bass choices in a nested disclosure; distinguish exact members, enharmonic equivalents and outside tones.
- Keep uncommon harmonic tone edits under Chord type. Add/remove degrees explicitly; keep performance muting in Voicing.
- In portrait, keep the candidate, audition and commit controls sticky within the builder so users can commit lower controls without scrolling back. Preserve normal document flow and keyboard visibility.
- Group spacing and register controls under Voicing, with per-tone octave/mute/doubling controls in its disclosure. Keep common root/type/bass actions direct and compact; preserve candidate display geometry and avoid page overflow on portrait or zoom.
- Group interval/direction and candidate/progression scope under Transpose; group enharmonic spelling there too. Candidate transforms audition without committing; progression transforms update entries without changing their IDs, stop stale transport, and transform the candidate consistently.
- Chord suggestions remain deferred; n0003 preserves future requirements.
