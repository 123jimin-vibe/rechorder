+++
id = "t0002"
title = "Create chord progression util"
modifies = ["s0002", "s0003", "s0004", "s0005"]
blocked_by = ["t0001"]
status = "done"
+++

# Create chord progression util

## Outcome

Deliver s0003's chord editor, individual-chord playback, and played-note display using reusable musical and sound code. A simple home-page feature list is permitted.

## Principles

- Follow s0002 and s0005: musical data accommodates atypical temperaments and complex beats; keep data, operations, UI, and sound separate.
- Prepare for near-term automatic progression playback without implementing it.
- Limit implementation to foundational UX. Keep specs concise with principles first.

## Work

1. Implement the settled contracts in s0003–s0005. Use ArkType only where runtime schemas validate external or untrusted values.
2. Implement candidate input/preview/insertion, the compact scrollable list, removal/reorder/cursor movement, and played-note display.
3. Review reuse in a DAW and extension to sequencing, timing, sound selection, articulation, and tuning; resolve avoidable coupling.
4. Verify editing boundaries and playback lifecycle independently of the page. Check audible output and mobile interactions where browsers are available; record skips and human device-testing needs.
5. Reconcile governing specs and record verification evidence.

## Completion

- [x] Concrete governing specs and musical/sound contracts.
- [x] All required interactions in s0003 work, including empty lists, repeated chords, and edits at list boundaries.
- [x] Note reporting matches actual playback lifecycle.
- [x] Reusable modules are independent of page components; future sequencing/tuning integration is documented.
- [x] Project checks and build pass; browser/listening evidence or unavailability is recorded.

## Exclusions

Automatic progression playback, non-English support, BPM/beat-length/soundfont/articulation controls, suggestions, scale/temperament controls, intricate design, and the full DAW. Preserve these future features in s0003.

## Delivery

- Added the static chord-progression page and plain home-page link, with the agreed controls and in-memory editor.
- Added independent `@rechorder/music` and `@rechorder/audio` packages; documented ownership, public contracts, and future sequencing/tuning integration in `docs/music-and-audio.md`.
- Reconciled s0002–s0005. Numeric and catalogue boundaries use direct guards; no external structured inputs currently warrant ArkType schemas.

## Verification — 2026-09-12

- Frozen-lockfile offline install, `pnpm check`, and `pnpm build` passed. Strict TypeScript 7.0.2 checks include package boundaries and dependency declarations.
- All 35 Vitest tests passed: nine chord qualities, spelling/register and enharmonics, non-octave/unequal tunings, immutable edits/IDs/cursor anchors, audio scheduling/cancellation, pending-request races, failures, and disposal.
- All 24 Playwright checks passed: Chrome 152.0.7977.83 at `/rechorder/` and Edge 152.0.4191.66 at `/`, each with desktop and portrait emulation. Checked direct navigation/reload, editing, keyboard access, horizontal overflow, native Web Audio frequencies/waveform/silence, active-note display, source removal, context suspension/resumption, and console-error fallback. Reviewed desktop/portrait screenshots.
- Restored the default `/rechorder/` production build after alternate-base checks. CI's existing `pnpm check` and browser commands now include these tests.
- Playwright Firefox and WebKit executables are absent: those runs were skipped. Current/previous device releases and perceptual listening on physical iOS/Android/desktop hardware remain human coverage; waveform measurements are not a listening claim.
- Pinned Vitest 4.1.11: the tested 5.0.0 declarations failed strict dependency checking. Retained TypeScript 7 and `skipLibCheck: false`.
