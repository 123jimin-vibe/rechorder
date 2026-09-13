+++
id = "t0011"
title = "Fix piano rotation and independent touch scrolling"
modifies = ["s0002", "s0003", "s0006"]
status = "done"
+++

# Fix piano rotation and independent touch scrolling

## Scope

- Cycle all four orientations and repair the rotation icon.
- Make keyboard drag/wheel input follow rotation and allow holding one row while scrolling another.
- Keep both utilities on one keyboard implementation with self-contained styling; remove visible row labels.

## Completion

- Exercise actual gestures in every orientation, concurrent holding/scrolling, release/cancellation, shared key styling, and chord-editor regressions.
- Reconcile s0002, s0003 and s0006; run formatting, lint, types, unit tests, production build and available browser checks.

## Verification

- Implemented four-way rotation with a corrected clockwise icon, per-pointer scrolling projected onto the rotated axis, self-contained shared keyboard styling, and removal of visible row labels. Updated s0002, s0003 and s0006; recorded the user's corrections in n0001.
- Chrome 152.0.7977.83 desktop and emulated portrait: all 38 browser checks pass, including real touch drags while holding the other row, wheel input at every orientation, cancellation, full rotation cycle, shared computed key styles, and chord-editor regressions. Reviewed upright and rotated portrait screenshots.
- Production build, web/browser TypeScript checks and lint passed before concurrent t0012 audio edits. The subsequent full workspace checks encountered t0012's removed `synthesizeString` export: 42 unit tests passed and 13 synthesis tests failed. Browser verification used the successful build preceding that audio change. Audio files were not modified by this task.
- Physical-device and Safari/Firefox checks remain unverified.
