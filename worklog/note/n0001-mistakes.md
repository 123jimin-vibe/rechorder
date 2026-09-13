+++
id = "n0001"
title = "Mistakes"
agent_mode = "autonomous"
+++

# Mistakes

Record mistakes made while working on this repository, that were pointed out by the user. Be concise.
Similar mistakes from one session may be merged.

Exclude self-corrected mistakes.

### t0010: Rotation and independent piano gestures

The user found that rotation only toggled two orientations, the rotate icon was malformed, rotated scrolling failed, and holding a note prevented scrolling the other row. The shared keyboard also inherited editor-only styling, and unnecessary Upper/Lower labels were added. Test actual swipes in all four orientations, including one held finger with another row scrolling; assigning scrollLeft is not evidence of working gestures. Keep shared component styles self-contained and omit redundant visible labels.

### t0009: Brassy polyphony from the bowed approximation

The user reports brass-like sound when several notes play together. The t0007 harmonic approximation and signal-level tests did not establish bowed-string realism. Research excitation, body response and interactions between voices; use chord listening comparisons as acceptance evidence instead of treating pitch, sustain and loudness checks as proof of timbre.

### t0008: Group controls by musical role

The user corrected the visual hierarchy: Bass belongs with Root, and Jazz & extensions belongs under Chord type. Preserve these relationships in the document structure so desktop columns and mobile stacking communicate the same grouping.

### t0007: Bowed character and audible compact editor

The user found the plucked implementation guitar-like and barely audible on mobile, and root, bass, jazz, and commit controls too bulky. Use sustained bowed excitation with useful upper harmonics and verify output levels across chord sizes. Place playback feedback above the timeline and compact commits above root selection; assess expanded mobile controls as well as collapsed views.

### t0006: Timeline geometry and string sound

The user reported vertical timeline scrolling, cropped chord buttons, unreliable append visibility, loose sharp spacing, and a keyboard-like synth timbre. Reserve space for native scrollbars and test complete button bounds, not just container height. Verify append and selection scrolling independently. A harmonic oscillator envelope alone did not achieve the requested string character. The user also superseded the earlier selection-centering requirement.

### t0005: Compact, steady touch layout

The user found that the t0004 UI still used redundant copy and ordinals, wasted space in the body/timeline, let the erase button crowd the strip, and shifted around changing chord symbols. The timeline also failed to center a tapped chord, and the accidental rows did not follow sharp/natural/flat order. Check actual mobile geometry and interaction states; use self-explanatory controls and fixed layout slots before adding explanatory text.

### t0004: Optimize the actual transcription loop

The user pointed out that bulky cards, cursor controls, dropdowns, and separate play actions obstructed s0001's quick transcription goal; the sound and styling also felt too bare. Optimize repeated choose/hear/commit actions first, with direct choices, compact playable entries, append/replace, and remove-last. A clearer cursor still adds unnecessary interaction when the workflow does not need one.

### t0003: Playback switching and insertion

The user reported delayed chord switching and an unintuitive cursor in t0002. Avoid redundant audio resumption during playback and verify rapid switching explicitly. Show insertion spatially with an actionable candidate preview instead of explaining an arrow with a sentence.

| Relevant worklog   | Relevant files                       | Intended task                          | Mistake                                                                                                                                                                                                                                                                    |
| ------------------ | ------------------------------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| t0001, s0002–s0004 | Foundation recommendations and specs | Define a reusable, readable foundation | Omitted explicit support for atypical temperaments and complex beats, proposed excessive boundary tooling, and made specs verbose and repetitive. State musical generality as a principle, keep enforcement lightweight, and organize concise specs with principles first. |
