+++
id = "n0001"
title = "Mistakes"
agent_mode = "autonomous"
+++

# Mistakes

Record mistakes made while working on this repository, that were pointed out by the user. Be concise.
Similar mistakes from one session may be merged.

Exclude self-corrected mistakes.

### t0005: Compact, steady touch layout

The user found that the t0004 UI still used redundant copy and ordinals, wasted space in the body/timeline, let the erase button crowd the strip, and shifted around changing chord symbols. The timeline also failed to center a tapped chord, and the accidental rows put flats above naturals. Check actual mobile geometry and interaction states; use self-explanatory controls and fixed layout slots before adding explanatory text.

### t0004: Optimize the actual transcription loop

The user pointed out that bulky cards, cursor controls, dropdowns, and separate play actions obstructed s0001's quick transcription goal; the sound and styling also felt too bare. Optimize repeated choose/hear/commit actions first, with direct choices, compact playable entries, append/replace, and remove-last. A clearer cursor still adds unnecessary interaction when the workflow does not need one.

### t0003: Playback switching and insertion

The user reported delayed chord switching and an unintuitive cursor in t0002. Avoid redundant audio resumption during playback and verify rapid switching explicitly. Show insertion spatially with an actionable candidate preview instead of explaining an arrow with a sentence.

| Relevant worklog   | Relevant files                       | Intended task                          | Mistake                                                                                                                                                                                                                                                                    |
| ------------------ | ------------------------------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| t0001, s0002–s0004 | Foundation recommendations and specs | Define a reusable, readable foundation | Omitted explicit support for atypical temperaments and complex beats, proposed excessive boundary tooling, and made specs verbose and repetitive. State musical generality as a principle, keep enforcement lightweight, and organize concise specs with principles first. |
