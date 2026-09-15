+++
id = "t0019"
title = "Fix touch scrolling note holds"
modifies = ["s0006", "s0003"]
status = "done"
+++

# Fix touch scrolling note holds

## Outcome

Keep every stationary touch-held piano note sounding while another touch scrolls the same keyboard or a different row, including after the scrolling touch ends.

## Completion

- [x] Give each touch contact an independent note and scroll lifecycle.
- [x] Preserve held notes when a separate scrolling touch starts, moves, ends, or cancels.
- [x] Cover same-row and cross-row touch scrolling with selective contact release.
- [x] Reconcile relevant architecture documentation and specifications.

## Verification — 2026-09-15

- The new explicit-touch regression failed against the pointer-only implementation, then passed after touch ownership was added.
- `pnpm build`, `pnpm lint`, `pnpm typecheck`, 71 unit tests, and targeted formatting checks passed.
- Chrome desktop/touch-emulated portrait: 17 piano checks passed with one desktop-only touch check skipped; 11 focused piano/shared-keyboard touch checks passed with the same skip. Coverage includes pointer cancellation during touch panning, same-row selective touch cancellation, cross-row holds, all four rotations, mouse dragging, and single-start audio behavior.
- Repository-wide `pnpm check` stops at `format:check` on 22 pre-existing files outside this task. Physical-device, Firefox, and WebKit checks remain unavailable locally.
