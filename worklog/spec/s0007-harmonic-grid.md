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
- Preserve keyboard access and visible focus without adding a toolbar or instructions over the playing area.

## Musical mapping

- Use Pythagorean tuning with A4 = 440 Hz. Start with C4 at the viewport center. Right moves by a pure 3:2 fifth; down-right moves by the 81:64 major third derived from four fifths minus two octaves.
- Preserve the complete fifth-chain identity and spelling; do not merge enharmonic pitches or close the chain after twelve fifths. Musical coordinates and tuning live under s0005.
- The grid has no spatial boundary. Dim notes outside this instrument view's 20–16,000 Hz audition range and allow dragging from them without playing or folding them into another register.
- Show note labels and held-contact highlights. The only visible chrome is a small home link; omit tuning controls. Arrow keys move the keyboard cursor, Space/Enter sustain it, and Home recenters C4.

## Note presentation — t0031, t0032

- Display a simple enharmonic representative (natural where available, otherwise the nearest sharp/flat fifth-chain representative), plus an up/down Pythagorean-comma mark. One comma is exactly 531441:524288; show a compact count for multiple commas. Do not approximate with quarter-tones or retune playback.
- Large note letters and a single sharp/flat replace long accidental chains. Bundle the musical glyphs locally. Set the octave number smaller and lower, and comma counts higher, so the two numbers remain distinct.
- The name is the nearest simple enharmonic representative that supports an exact integer-comma correction, rather than rounding to the acoustically nearest equal-tempered pitch. Retain the original pitch identity independently. Explain comma meaning in accessible text and note descriptions.
- Color each hexagon consistently by its displayed octave, including when a respelling crosses B/C. Preserve that octave color when held, with a darker fill and contrasting label. Fade out-of-range notes.

## Verification

- Verify full viewport coverage, bounded rendering after long drags, static reload, multi-note panning lock and independent release, keyboard access, cancellation, and absence of application/audio errors.
