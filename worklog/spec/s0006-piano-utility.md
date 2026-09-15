+++
id = "s0006"
title = "Piano utility"
+++

# Piano utility

## Principles

- Offer immediate, free playing of melodies and chords, independently of the chord editor.
- Reuse the conventional keyboard, playback lifecycle, and site-wide rotation container; keep musical meaning outside the view layer.

## Behavior

- Show two full C1–B6 piano keyboards in separate rows. Each has its own horizontal scroll position and initially reveals C4. Both rows can play concurrently.
- Omit visible row labels. Both utilities use the same keyboard component with self-contained key styling; the free Piano page sizes its rows to the available viewport.
- Dragging along a row scrolls that row in every orientation. A stationary finger may keep playing on one row while another finger scrolls the other. A drag releases only its own starting note; touch, pointer and wheel scrolling respect the rotated keyboard axis.
- Touch or pointer hold sounds a key until release or cancellation, including simultaneous notes; keyboard Space/Enter also plays a focused key. Release held sounds on focus loss, page hiding, and navigation. Give every key a subtle physical press motion while its pitch is sounding, highlight sounding pitches on both rows, and announce them accessibly.
- A visible clockwise rotation control cycles the utility viewport through 0°, 90°, 180°, and 270°, then upright. It works without changing device orientation and preserves the rows and their independent scroll positions.
- Use the existing local audio instrument and do not start sound on page load.

## Verification

- Check actual drags and wheel input in all four orientations, simultaneous note holding and other-row scrolling, cross-row chords, release/cancellation, shared styling, and static-route reload.
