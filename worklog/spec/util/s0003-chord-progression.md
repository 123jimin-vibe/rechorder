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
- **Remove all** clears every entry and the selection and stops their sound. Because it is irreversible, the first tap only arms the button (filled danger treatment, check icon, name "Confirm remove all chords") and the second tap within a few seconds performs it; losing focus or the timeout disarms. **Copy** writes the progression as space-separated chord symbols (`C Am F/A G7`) to the clipboard and briefly shows a check with the name "Copied". Both are icon buttons disabled while the progression is empty.
- No cursor, insertion gaps, move buttons, per-item Play/Remove buttons, or drag reordering. Smart suggestions may insert between a selected entry and its successor.
- Keep the progression in memory without an arbitrary length cap. Candidate edits do not change entries until committed; repeated chords retain distinct IDs.
- Above the Progression timeline, a touchable C1–B6 piano keyboard highlights sounding pitches, including enharmonic equivalents and release tails. Initially show C4. Horizontal scrolling reaches its keys; omit octave shortcut controls in this utility. This range includes the lowest slash bass and highest catalogue extension. Press/hold promptly plays one note until release, cancelled touch, lost capture or keyboard focus; do not add a second audition from the compatibility click. Support simultaneous fingers and Space/Enter. Touch and pen presses avoid native focus/tap rectangles while keyboard focus remains visible. Keep a screen-reader note announcement. Keyboard notes do not edit chords and may sound alongside an audition.
- Auditions snapshot their notes; removing/replacing their source cancels that source's audition.

## Progression playback

- Provide Play, Play from here, and Stop beside the progression. Play starts at the beginning when stopped and resumes from the preserved position after an individual audition pauses it. Play from here starts a fresh snapshot at the selected entry; disable it without a selection and while transport is playing. Stop and natural completion reset to the beginning. Use distinct accessible icons where their meaning remains clear.
- Every chord lasts two quarter-note beats at the BPM in the settings form below the page header (initially 120). Transport timing is playback policy rather than stored chord data. Applying tempo during playback preserves musical position and updates remaining scheduling; paused playback resumes at the new tempo. Individual auditions remain one second.
- Starting any individual chord audition, including a candidate edit, candidate replay, or timeline chord, pauses progression playback first. Keyboard notes remain independent and do not pause it.
- Playback snapshots the ordered entries when it starts. A paused snapshot resumes independently of later editor changes; the next stopped start captures the current progression.

## Presentation and verification

- Share the playable keyboard and its self-contained key styling with s0006. Touch and pointer drags scroll the keyboard while their starting notes continue until their own contact releases or cancels; compatibility-pointer cancellation during an active touch does not release it, and stationary fingers continue playing independently. Two or more pressed notes in this keyboard disable its scrolling until fewer than two remain.

- Keep the timeline the same height when empty or filled, with no vertical overflow and enough room for complete buttons plus the native scrollbar. Show no visual ordinals, count, or placeholder instructions. Put the timeline actions outside its horizontal scroll area, in the heading row as two labelled groups — Playback (Play, Play from here, Stop) and Editing (Copy, Remove last, Remove all) — separated by a wider gap and a hairline so six icons read as two purposes; the groups wrap under the heading on narrow screens without shrinking below the transport's 2.25 rem targets. Compact buttons expand to preserve complete extended/slash symbols. Give progression items a subtle raised-button treatment by default and a pressed treatment only while that item's chord is sounding, whether from a direct tap or automatic playback; selection remains a distinct state.
- Use compact root and bass pads (at least 36 px at default text size), preserving one-tap access to all spellings. Group root pads in aligned sharp, natural, flat rows (e.g. C♯ above C and C♭ below); preserve this alignment when zoomed. The piano is a conventional-adapter view; future temperaments may replace it without changing musical data. Keep the candidate heading and sounding-note display geometrically stable as symbols and active notes change.
- Use concise visible action names, grouped root/type pads, and adjacent, content-width Append/Replace actions above Root. Keep the candidate symbol, spelled notes, icon-only replay and commit actions in one compact toolbar where space permits; reflow the toolbar rather than shrinking its targets on narrower or enlarged-text layouts. Jazz types and alterations use dense wrapping grids. Make remove-last as compact as the transport controls and use a danger treatment. Preserve accessible names, focus, contrast, and touch targets with replaceable CSS variables.
- Use a shorter keyboard in the chord utility than in the standalone piano while retaining full key width, conventional proportions, horizontal reach and press feedback. Compact timeline and builder chrome without removing section identity or musical context; align the Voicing label with its common controls where space permits.
- Check empty/single/long lists, identity-preserving replacement, remove-last selection boundaries, two-tap remove-all, copied text, restoration after reload (s0002), candidate isolation, keyboard operation, rapid audition switching, and portrait overflow.

## Future — excluded

- Editable beat lengths.
- Drag reordering and non-English support.
- Soundfont/articulation and temperament controls.

Supporting varied musical data does not require exposing these controls now.

## Compact manipulation and settings — t0022

- Put a compact, labelled BPM number form directly below the page header, in a settings container that can accommodate more settings. Apply finite values from 1–600 BPM on blur or Enter; invalid values retain the last applied tempo and expose native validation. Decrease and increase pads beside the field apply one beat per press, clamp to the same range and disable at the bounds. Editing settings never starts audio. The row wraps rather than overflowing narrow or zoomed layouts. This initial playback UI bound is not a generic musical restriction.
- Show chord-member bass choices directly under Root, with pitch and degree labels and a concise derived bass-position label. Put all other spelled bass choices in a nested disclosure; distinguish exact members, enharmonic equivalents and outside tones.
- Keep uncommon harmonic tone edits under Chord type. Add/remove degrees explicitly; keep performance muting in Voicing.
- In portrait, keep the candidate, audition and commit controls sticky within the builder so users can commit lower controls without scrolling back. Preserve normal document flow and keyboard visibility.
- Group spacing and register controls under Voicing, with per-tone octave/mute/doubling controls in its disclosure. Keep common root/type/bass actions direct and compact; preserve candidate display geometry and avoid page overflow on portrait or zoom.
- Group interval/direction and candidate/progression scope under Transpose; group enharmonic spelling there too. Candidate transforms audition without committing; progression transforms update entries without changing their IDs, stop stale transport, and transform the candidate consistently.
- Contextual suggestions and harmonic design are governed by the sections below; n0003 and n0004 remain supporting research.

## Smart chord suggestions — t0025

### Principles

- Offer explainable choices, not a single supposedly correct continuation. Key is optional context, never a hard whitelist; inferred context is uncertain.
- Preserve deliberate commits, candidate isolation and stable entry identity. Keep the common path compact on portrait screens, with labelled controls instead of instructional prose.
- Rank by function first: key role and root motion decide, voice-leading smoothness only breaks ties. Offer inversions only to continue a bass line the user started with an inverted chord; ordinary root motion keeps roots in the bass. Returning to the tonic is never penalized. The list is in score order and each bar agrees with its position (t0029).

### Settings and actions

- Add optional tonic and mode settings alongside BPM, initially Auto with no assumed key. Support major, minor and the remaining diatonic modes. Settings do not start audio or edit chords.
- Whole-progression transposition also transposes an explicit tonic, preserving mode and spelling; candidate-only transposition leaves tonal settings intact.
- Place one compact recommendation panel beside the timeline/builder, with Next, Replace, Between and Bass modes and four ranked choices. Next appends at the end; Replace targets the selected stored chord; Between inserts after the selection only when a following chord exists; Bass offers other chord types/roots over the candidate's sounding bass.
- Disable unavailable targets. Show the target chords/bass and any sufficiently supported inferred key as a possibility. A suggestion's labelled preview auditions without editing the candidate or timeline. Its adjacent Add, Replace, Insert or Use action applies directly without an additional audition. Label each suggestion with its Roman numeral when the key is known and its strongest move (bass line or root move); keep the complete reason list in the tooltip. Show a compact accessible bar for each suggestion's normalized relative heuristic score; present it as comparative ranking, not probability.
- Bass mode includes a direct bass picker that edits/auditions the candidate, keeping bass exploration inside the panel.
- Next/Replace/Between commits load the chosen chord into the candidate and select the affected entry. Replacement keeps the entry ID; insertion preserves neighboring IDs. Bass Use loads the candidate for ordinary Append/Replace, preserving the bass pitch and register.
- Suggestion commits that change the progression stop stale transport and affected auditions. An insertion reveals its new entry rather than scrolling to the end. Preserve the panel's layout while previewing, and use a two-column list on portrait with reachable touch targets and no page overflow.

## Harmonic design — t0027

### Principles

- Let users design chords from theory — function, fifth progression, ii–V, stepwise or third-related roots, color — with standard shorthand instead of prose, and with the same audition-then-commit rhythm as the pads.
- One key drives every design control: the explicit key, else the best inferred hypothesis marked `?`, else an assumed C major marked `?` before any chord exists. The first-chord suggestions use the same assumption.

### Controls

- **Function pads** sit above Root in the builder: one pad per scale degree of the design key showing numeral and chord symbol (minor keys use V and vii° with the raised leading tone), plus a `7` toggle switching the pads to diatonic sevenths. Tapping a pad auditions that chord as the candidate without committing; Root, Bass and Chord type refine it. The legend names the design key.
- **Move chips** under the suggestion purposes: Any, V→I, ii–V, ↓5th, ↑5th, Step, 3rd and Color narrow the ranked list to chords making that move relative to the target's neighbors (Color keeps applied and borrowed harmony). Chips are disabled before the first chord; an empty result states that no chord makes the move. The row scrolls horizontally on narrow screens and keeps 44 px touch targets.
- Check: pads reflect key and mode changes and the seventh toggle; a chip filters every listed suggestion; the panel still fits a 390 px portrait viewport above the fold with no page overflow.
