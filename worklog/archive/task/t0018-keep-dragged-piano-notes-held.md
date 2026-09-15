+++
id = "t0018"
title = "Keep dragged piano notes held"
modifies = ["s0006", "s0003"]
status = "done"
+++

# Keep dragged piano notes held

## Outcome

Let a held piano-key pointer scroll its row without interrupting the note it started.

## Completion

- [x] Preserve the starting note when a held pointer crosses the drag threshold and scrolls.
- [x] Release that note on pointer up, cancellation, lost capture, or lifecycle cleanup.
- [x] Verify scrolling plus sustained-note behavior in every orientation and both viewport profiles.
- [x] Reconcile the shared keyboard specifications and audio architecture documentation.

## Verification — 2026-09-15

- `pnpm lint`, `pnpm typecheck`, targeted Prettier checks, and the production web build passed.
- All 16 desktop/portrait Chromium piano checks passed, including touch dragging in every orientation, simultaneous pointers, direct mouse dragging, and release/cancellation.
- Firefox, WebKit, and physical-device checks remain unavailable locally.
