+++
id = "t0033"
title = "Limit scrolling while multiple notes are pressed"
modifies = ["s0003", "s0006", "s0007"]
status = "done"
+++

# Limit scrolling while multiple notes are pressed

## Outcome

- Disable drag and wheel scrolling within a piano keyboard while it has at least two pressed notes; each piano row remains independent.
- Disable harmonic grid panning while it has at least two pressed notes.
- Keep notes held and let one remaining contact scroll again without a position jump.

## Completion

- [x] Reconcile the governing specs and gesture implementations.
- [x] Verify single-contact movement, multi-note lock, per-row independence, release, and cancellation.
- [x] Run the relevant browser checks and repository checks.

## Verification — 2026-09-20

- Lint, type checking, production build, changed-file formatting, and all 122 unit tests passed.
- Related piano, harmonic grid, and chord progression browser suites: 59 passed and one touch-only desktop check skipped across portrait and desktop Chromium. Focused checks passed again after the final scrollbar lock.
- Repository-wide `pnpm check` stops at formatting in 17 pre-existing files outside this task; every changed file passes Prettier and `git diff --check`.
