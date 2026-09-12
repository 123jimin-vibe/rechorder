+++
id = "t0005"
title = "Refine compact mobile transcription UX"
modifies = ["s0002", "s0003"]
status = "done"
+++

# Refine compact mobile transcription UX

## Principles

Make the interface self-explanatory, space-efficient, steady during audition and editing, and comfortable for touch.

## Scope

- Remove slogan, visual ordinals, count, and redundant action wording.
- Tighten page/panel spacing while keeping usable controls. Give the timeline its full width; keep one remove-last action outside it.
- Keep empty and filled timeline heights equal, and prevent candidate/played-note layout changes for differing chord names.
- Center tapped timeline entries while preserving manual scrolling. Put sharp roots above naturals and flats below.

## Completion

- [x] Reconcile s0002/s0003 and record the corrected UX guidance.
- [x] Verify stable layout, root geometry, timeline centering, touch targets, keyboard use, and portrait overflow.
- [x] Pass production build, unit tests, and available browser checks.

## Outcome and verification

- Tightened spacing, removed slogan/ordinals, and shortened actions to Append/Replace. Backspace shares the section heading so it uses no timeline width or extra action row.
- Fixed-height strip and stable candidate/note rows prevent surrounding controls from moving during edits. Scrollable end space lets first/last chords center too; hover styling applies only to devices that support hovering.
- Build, formatting, lint, strict TS7, 38 unit tests, and 40 Chrome/Edge browser checks pass. Verified empty/filled height, C/C7/Caug geometry, sharp/natural/flat alignment, first/middle/last and repeated selection centering, manual scrolling, keyboard use, and 320px enlarged-text layout.
- Tested Chrome 152.0.7977.83 and Edge 152.0.4191.66 in desktop/portrait configurations; inspected portrait and desktop screenshots. Firefox/WebKit and physical-device checks remain unavailable locally.
- Preview server restarted. The old embedded tab was on a connection-error page; a fresh tab successfully loaded the finished editor and was kept open.
