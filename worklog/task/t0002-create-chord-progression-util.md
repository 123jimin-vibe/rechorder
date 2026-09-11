+++
id = "t0002"
title = "Create chord progression util"
modifies = ["s0002", "s0003", "s0004"]
blocked_by = ["t0001"]
status = "pending"
+++

# Create chord progression util (NEEDS APPROVAL)

## Requested outcome

Deliver a page where users can create a chord progression and listen to individual chords, with:

- A compact, horizontally scrollable chord list with playback of each chord, removal, reordering, and a movable insertion cursor.
- A UI to specify and play a chord and insert it into that list.
- A UI displaying the notes currently being played.

Expand s0002–s0004 as needed and create further specs if adequate. Foundational UX is included; non-essential features and intricate design are excluded. Modularity and prevention of future technical debt are central deliverables because this code must support later features and reuse in a fully fledged DAW.

Automatic playback of the entire progression is explicitly outside this task and expected soon afterward. Design for that near-term extension while keeping current BPM management and playback timing limited to the needs of individual-chord playback.

The user explicitly requested these outcomes. The proposed execution and acceptance details below require content approval where they go beyond the request and existing specs.

## Proposed work — NEEDS APPROVAL

1. After t0001, refine s0003's chord vocabulary, input model, insertion/reorder semantics, and note display within the confirmed individual-chord playback scope. Refine s0004's playback data, sound source, defaults, lifecycle, and failure behavior. Do not choose unspecified musical defaults without confirmation.
2. Document boundaries among reusable musical data/logic, progression editing, sound generation and lifecycle, and page UI. Define ownership and dependency direction, with concrete contracts for the current use cases.
3. Review those contracts against later DAW reuse and the listed future features, prioritizing near-term automatic progression playback. Explain where sequencing and timing, alternative sound generation, articulation, and tuning would attach and what would need to change. Address unnecessary coupling at its source; avoid speculative infrastructure and unsupported promises of zero future debt.
4. Record approved behavior in governing specs before dependent implementation. Add new spec IDs to `modifies` if a focused reusable responsibility needs a separate spec.
5. Implement the required editor, candidate-chord playback/insertion, per-item playback, and played-note display using the shared modules and existing foundation.
6. Verify the required interactions, audible output, note-state accuracy, mobile usability, module boundaries, and production build. Reconcile all governing specs and record evidence before closure.

## Proposed completion conditions — NEEDS APPROVAL

- [ ] Governing specs define the implemented behavior and defaults; required approval markers and scope ambiguities are resolved. Future possibilities are recorded separately.
- [ ] Users can specify and preview a supported chord and insert it at the selected position, including into an empty progression.
- [ ] The compact chord list scrolls horizontally on a portrait viewport and supports playing each entry, removal, reorder, and cursor movement.
- [ ] Editing works at list boundaries and with repeated chord values; insertion position and playback targets remain consistent after edits.
- [ ] The note display reflects actual playback lifecycle for both candidate and list playback, including completion, interruption, and failure under the agreed policy.
- [ ] Reusable music/progression logic can be exercised without mounting the page, and the sound contract can be exercised without importing page components. Inspect imports and test meaningful editing/lifecycle behavior.
- [ ] A real-browser listening check confirms audible playback, while focused checks verify editing and played-note state. Record mobile interaction and production-build results.
- [ ] The module/extension review explains how future features can be added without embedding UI assumptions or a particular sound backend into reusable music logic; record known limitations and resolve avoidable coupling before completion.
- [ ] Reconcile s0002, s0003, s0004, and any added governing specs with the delivered implementation.

## Explicit exclusions

Record, but do not implement: non-English support; automatic playback of the entire progression; BPM adjustment; beat-length adjustment; soundfont adjustment; articulation adjustment; chord suggestions; musical-scale and temperament adjustment. Also exclude intricate design, non-essential features, and building the full DAW.

## Next action

Complete t0001, then resolve the open decisions in s0003 and s0004 and approve the concrete contracts before implementing dependent behavior. This task is pending and depends on t0001.
