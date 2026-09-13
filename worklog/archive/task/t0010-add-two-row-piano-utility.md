+++
id = "t0010"
title = "Add two-row piano utility"
modifies = ["s0002", "s0006"]
status = "done"
+++

# Add two-row piano utility

## Scope

- Add a static Piano utility after Chord progression in the home list.
- Extract the existing playable keyboard and its controller for use in two independently scrollable rows.
- Add a reusable 90-degree utility view that rotates content without requiring device rotation.

## Completion

- Verify touch and keyboard playing across both rows, note release, independent scrolling, rotation, and reload.
- Run project checks, build, and available browser checks; reconcile s0002 and s0006.

## Verification

- Added the static route and home link, shared keyboard/controller, independent full-range rows, and reusable rotated viewport. Updated s0002 and s0006.
- Formatting, lint, all TypeScript projects, 55 unit tests, and the production build pass.
- Chrome 152 desktop and emulated portrait: 30 browser checks passed; the final Piano and navigation checks passed again after documentation and test refinements. Visually reviewed the rotated portrait screenshot.
- Safari/Firefox and physical-device touch or listening were unavailable in this session.
