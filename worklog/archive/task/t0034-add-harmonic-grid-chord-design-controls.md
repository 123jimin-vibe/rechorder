+++
id = "t0034"
title = "Add harmonic grid chord design controls"
modifies = ["s0007"]
status = "done"
+++

# Add harmonic grid chord design controls

- Scope: user-approved proposals 1–4, preserving exact tuning and existing multitouch behavior; no progression strip or voice-pinning workflow.
- Complete when contextual relationships, latch/reference audition, octave/inversion controls, and three layouts work with non-overlapping mobile controls; execute root checks and verify the change with targeted browser coverage, reporting unrelated baseline failures separately.
- Verify exact musical identity and audio cancellation alongside touch/keyboard access. Inspect desktop and small-screen renders.

## Outcome

- Implemented proposals 1–4 under s0007. Exact pitches remain separate from cells; chord completions use the whole fifth-chain selection. Latch, previous-chord playback/comparison, octave and inversion actions, and axis/key settings use a separate, collapsible dock capped at 40% of the viewport.
- Verified native multitouch selection/cancellation, independent held notes, focus-loss cleanup, musical transformations, layout changes, and portrait/landscape geometry down to 320 px. Inspected generated mobile and desktop screenshots.
- Passed lint, type checks, build, 125 unit tests, changed-file formatting, and 26 browser tests. Six browser cases are capability skips: native multitouch injection is Chromium-specific (four cases), and the installed Windows WebKit build has no Web Audio (two cases). WebKit layout and selection checks pass; audio was verified in Chromium and Firefox.
- The required root `pnpm check` stops at 17 pre-existing formatting failures outside this task. Ran the remaining root checks individually; unrelated files were not edited. No outstanding implementation work or spec approval is required for this task.
