+++
id = "t0004"
title = "Optimize quick chord transcription"
modifies = ["s0002", "s0003", "s0004", "s0005"]
status = "done"
+++

# Optimize quick chord transcription

## Principles

Optimize s0001's quick transcription workflow while preserving reusable music and audio boundaries. Keep interaction choices visible and editing deliberate.

## Scope

- Replace cursor/reordering UI with compact, playable timeline buttons and one remove-last button.
- Expose root/type choices directly; either choice auditions immediately. Selecting a timeline entry loads and auditions it.
- Provide Append chord and Replace selected actions. Preserve entry identity on replacement and candidate isolation until committed.
- Add a plucked-string synth without soundfonts, plus basic responsive styling using replaceable palette tokens.

## Completion

- [x] Reconcile s0002–s0005 and document the corrected workflow.
- [x] Verify append/replace/backspace, repeated chords, immediate auditions, and audio cleanup.
- [x] Check production build, keyboard interaction, compact portrait layout, and native audio in available browsers.

## Verification

- `pnpm check`: formatting, lint, strict TS7, and 38 unit tests pass. `pnpm build` and `git diff --check` pass.
- Chrome 152.0.7977.83 and Edge 152.0.4191.66: 18 browser checks each, desktop and portrait. Includes 320px layout with enlarged text, keyboard actions, identity-preserving replacement, source cancellation, immediate switching, native waveform decay/silence, and failure recovery.
- Inspected desktop/portrait screenshots and exercised the refreshed embedded preview without console errors. Restored its three C chords, second-entry selection, and C-minor candidate.
- Firefox/WebKit are not installed locally; those checks and physical-device listening remain unverified. Synth tests verify rendered output, not perceived realism.

## Outcome

Two direct root/type taps replace the four-action dropdown flow. Compact timeline buttons load and play; Append/Replace commit explicitly and backspace removes the last entry. The instrument owns its harmonic waveform, damping, and envelopes independently of engine scheduling. Palette tokens remain replaceable.
