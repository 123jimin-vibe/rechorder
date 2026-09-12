+++
id = "t0005"
title = "Refine compact mobile transcription UX"
modifies = ["s0002", "s0003"]
status = "active"
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

- [ ] Reconcile s0002/s0003 and record the corrected UX guidance.
- [ ] Verify stable layout, root geometry, timeline centering, touch targets, keyboard use, and portrait overflow.
- [ ] Pass production build, unit tests, and available browser checks.
