+++
id = "t0030"
title = "Create full-screen harmonic grid"
modifies = ["s0002", "s0007", "s0005"]
status = "done"
+++

# Create full-screen harmonic grid

## Scope and completion

- Implement s0007 as a new static utility; register its route and home link under s0002.
- Reuse the existing instrument, with independent note ownership and bounded visible hex rendering.
- Verify gestures, audio lifecycle, responsive layout, types, formatting, lint, tests, and production build.

## Decisions

- User chose Pythagorean tuning. Implement its exact fifth-chain identity separately from the conventional adapter, with fifth/derived-third grid directions and no tuning controls.

## Verification and outcome

- Implemented and reconciled s0002, s0005, and s0007: static route/home entry, separate Pythagorean adapter, full-screen virtualized grid, independent held contacts, drag handoff, and keyboard interaction.
- Passed lint, all type checks, production build, changed-file formatting, and 120 unit tests. Grid tests cover exact interval ratios, enharmonic comma preservation, remote coordinates, bounded rendering, and drag ownership.
- Eight targeted browser cases passed across the final Chromium runs (153.0.8010.12, desktop and portrait): home navigation/static reload, full viewport, silent load, keyboard sound/release, real multitouch chord/drag/handoff/cancellation, and off-screen mouse release. Corrected test-only fractional-coordinate comparison and CDP end-contact selection before the successful multitouch rerun.
- Inspected desktop and portrait screenshots. Firefox and WebKit verification was skipped after launch reported missing installed executables; physical devices were not tested.
- Repository-wide `pnpm check` stops at 17 pre-existing formatting failures outside the changed files. Ran lint, types, tests, build, and changed-file formatting independently; all pass.
