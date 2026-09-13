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
- Touch or pointer hold sounds a key until release or cancellation, including simultaneous notes; keyboard Space/Enter also plays a focused key. Release held sounds on focus loss, page hiding, and navigation. Highlight currently sounding pitches on both rows and announce them accessibly.
- A visible control rotates the utility viewport 90 degrees and returns it upright. It works without changing device orientation and preserves the rows and their independent scroll positions.
- Use the existing local audio instrument and do not start sound on page load.

## Verification

- Check both rows' independent scrolling, cross-row chords, input release, rotation in a portrait viewport, and static-route reload.
