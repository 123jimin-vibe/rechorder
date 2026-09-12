+++
id = "t0006"
title = "Add expressive chord building and touch piano"
modifies = ["s0003", "s0004", "s0005"]
status = "done"
+++

# Add expressive chord building and touch piano

## Principles

Preserve quick transcription, touch usability, stable layout, and the separate music/audio/UI contracts. No soundfonts or automatic progression playback.

## Scope

- Fix timeline clipping and vertical overflow; reveal appended chords, leave selection scrolling to the user.
- Tighten sharp typography without changing accessible musical spellings.
- Add a touchable keyboard with sounding-key highlights, independent held notes, and cancellation.
- Keep basic chord pads; disclose jazz extensions/alterations and slash bass separately. Every musical choice auditions immediately; Append/Replace retain full values.
- Replace the oscillator timbre with a damped plucked-string synthesis model.

## Verification

- [x] Music spelling, slash voicing, extensions and alterations.
- [x] Touch lifecycle, audio cancellation, synthesis pitch and decay.
- [x] Timeline geometry/scrolling, keyboard and chord workflow in available browsers.
- [x] Format, lint, strict types, unit tests and production build; spec writeback.

50 unit tests and 24 browser checks each in installed Chrome and Edge passed, including portrait, 320px/enlarged text, multi-touch, native audio output and append-only timeline scrolling. Reviewed desktop/portrait screenshots. s0003–s0005 and the architecture document describe the implemented contracts.

Physical-device listening/touch and unavailable Firefox/WebKit remain human checks. Automated pitch/decay verification does not certify subjective timbre quality.
