+++
id = "s0007"
title = "Harmonic grid"
+++

# Harmonic grid

## Principles

- Provide a separate, immediately playable, full-screen hexagonal surface with minimal chrome.
- Keep musical mapping, grid geometry, and contact ownership independent. An infinite view must not accumulate off-screen elements or voices.

## Behavior

- Serve `/harmonic-grid/` as a static page linked from the home feature list.
- Fill the viewport with a hexagonal grid that can be panned in both axes without spatial boundaries.
- Pressing a note sounds it until that contact releases or cancels. Holding and dragging pans the grid while sustaining the original note; moving across cells does not retrigger notes. Disable panning while two or more notes are pressed, then allow the remaining contact to pan without a jump.
- Support independent simultaneous contacts. Stationary contacts retain their notes, and changing the dragging contact must not jump the view.
- Release held notes on cancellation, lost capture, focus loss, page hiding, and navigation. Keep audio silent on load.
- Preserve keyboard access and visible focus. Controls occupy a separate dock; never overlay the playing area.

## Musical mapping

- Use Pythagorean tuning with A4 = 440 Hz. Start with C4 at the viewport center. Right moves by a pure 3:2 fifth; down-right moves by the 81:64 major third derived from four fifths minus two octaves.
- Preserve the complete fifth-chain identity and spelling; do not merge enharmonic pitches or close the chain after twelve fifths. Musical coordinates and tuning live under s0005.
- The grid has no spatial boundary. Dim notes outside this instrument view's 20–16,000 Hz audition range and allow dragging from them without playing or folding them into another register.
- Show note labels and held-contact highlights. Arrow keys move the keyboard cursor, Space/Enter sustain or latch it, and Home recenters the grid origin.

## Note presentation — t0031, t0032

- Display a simple enharmonic representative (natural where available, otherwise the nearest sharp/flat fifth-chain representative), plus an up/down Pythagorean-comma mark. One comma is exactly 531441:524288; show a compact count for multiple commas. Do not approximate with quarter-tones or retune playback.
- Large note letters and a single sharp/flat replace long accidental chains. Bundle the musical glyphs locally. Set the octave number smaller and lower, and comma counts higher, so the two numbers remain distinct.
- The name is the nearest simple enharmonic representative that supports an exact integer-comma correction, rather than rounding to the acoustically nearest equal-tempered pitch. Retain the original pitch identity independently. Explain comma meaning in accessible text and note descriptions.
- Color each hexagon consistently by its displayed octave, including when a respelling crosses B/C. Preserve that octave color when held, with a darker fill and contrasting label. Fade out-of-range notes.

## Verification

- Verify full viewport coverage, bounded rendering after long drags, static reload, multi-note panning lock and independent release, keyboard access, cancellation, and absence of application/audio errors.

## Chord design — t0034

### Principles

- Design by selecting exact pitches, retaining a previous chord, and auditioning their transition. Selection is independent of sustained sound and survives layout/register changes.
- Keep a compact dock outside the grid. Disclose additional controls on demand, constrain the dock on small screens, and use action labels and musical state rather than help text.
- Preserve Pythagorean identity throughout matching and transformations; comma-shifted notes are not octave equivalents. Do not infer a key or collapse enharmonic identities.

### Selection and relationships

- Optional Latch mode toggles notes with a tap or Space/Enter; a drag pans without changing the selection. Live mode retains independent hold/release playback. Limit the candidate to 16 playable exact pitches.
- Distinguish selected pitches, exact octave equivalents, chord completions, previous-chord tones, and optional key membership visually. Completion candidates must contain the entire selected pitch-class set; let users choose an alternative to see its complete shape and audition it without silently adding notes.
- Provide explicit candidate playback, clear selection, keep as previous, previous playback, and previous-to-candidate comparison. Retaining the previous chord clears the candidate for the next chord. Cancellation and hidden-page cleanup stop audio without discarding the retained musical selections.
- Optional major/minor key highlighting uses exact fifth-chain membership and does not restrict playable notes.

### Register and layout

- Provide separate surface-octave, whole-chord-octave, per-note-octave, and upward/downward inversion controls. Optional fixed bass keeps the lowest exact note unchanged during inversions. Reject transformations outside the audition range.
- Offer fifth + major third (current/default), whole tone 9:8 + fourth 4:3, and fifth 3:2 + octave 2:1 axis presets. Show right and down-right intervals. Preserve selected/reference pitches when changing presets or the surface octave; stop old audio contacts before remapping.
- Both alternative presets reach the full integer fifth/octave lattice. The original preset retains its identity; octave shifting and per-note selection controls allow voicings across its otherwise missing octave copies.

### Open-ended exploration — t0036

- Keep selected collections valid and playable when no conventional name matches. Identify them as unnamed, show their modeled roughness and register span, and show ordered voice movement from the retained previous collection when both are present. Measurements describe the exact sounding frequencies under the documented harmonic-partial model; they are not grades.
- In Explore, offer distinct nearby note additions chosen for lower roughness, higher roughness and wider register from a bounded fifth-chain/octave neighborhood. Preserve every selected pitch, its exact identity and the 16-note audition limit. An addition commits to the selection and auditions it. Conventional named completions remain available in the same panel as optional interpretations; absence of a name must not suppress exploration.

### Verification

- Test whole-selection matching and comma distinctions, all preset mappings, register and inversion bounds, tap versus drag/cancellation, keyboard latch, retained selections, comparison audio, and non-overlapping mobile/desktop dock geometry.
