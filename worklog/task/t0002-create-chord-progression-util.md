+++
id = "t0002"
title = "Create chord progression util"
modifies = ["s0002", "s0003", "s0004"]
blocked_by = ["t0001"]
status = "pending"
+++

# Create chord progression util

## Outcome

Deliver s0003's chord editor, individual-chord playback, and played-note display using reusable musical and sound code. A simple home-page feature list is permitted.

## Principles

- Follow s0002: musical data accommodates atypical temperaments and complex beats; keep data, operations, UI, and sound separate.
- Prepare for near-term automatic progression playback without implementing it.
- Limit implementation to foundational UX. Keep specs concise with principles first.

## Work

1. Refine s0003/s0004's musical representations, interactions, defaults, sound backend, and lifecycle. Create focused specs if useful and add their IDs to `modifies`.
2. Implement candidate input/preview/insertion, the compact scrollable list, removal/reorder/cursor movement, and played-note display.
3. Review reuse in a DAW and extension to sequencing, timing, sound selection, articulation, and tuning; resolve avoidable coupling.
4. Verify editing boundaries and playback lifecycle independently of the page. Check audible output and mobile interactions where browsers are available; record skips and human device-testing needs.
5. Reconcile governing specs and record verification evidence.

## Completion

- [ ] Concrete governing specs and musical/sound contracts.
- [ ] All required interactions in s0003 work, including empty lists, repeated chords, and edits at list boundaries.
- [ ] Note reporting matches actual playback lifecycle.
- [ ] Reusable modules are independent of page components; future sequencing/tuning integration is documented.
- [ ] Project checks and build pass; browser/listening evidence or unavailability is recorded.

## Exclusions

Automatic progression playback, non-English support, BPM/beat-length/soundfont/articulation controls, suggestions, scale/temperament controls, intricate design, and the full DAW. Preserve these future features in s0003.

## Next action

After t0001, refine the open decisions in s0003 and s0004.
