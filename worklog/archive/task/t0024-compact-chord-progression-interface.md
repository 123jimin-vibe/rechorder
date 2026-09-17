+++
id = "t0024"
title = "Compact chord progression interface"
modifies = ["s0003"]
status = "done"
+++

# Compact chord progression interface

## Principles

- Increase information density without hiding common chord choices or removing musical context.
- Preserve clear hierarchy, keyboard accessibility and comfortable touch targets on narrow screens.

## Scope

- Compact the page header, settings, keyboard, progression and candidate controls into a more cohesive workspace.
- Reduce panel chrome, padding and vertical dead space while preserving stable timeline and candidate geometry.
- Keep direct root, type and member-bass choices; organize secondary manipulation controls without adding explanatory copy.
- Strengthen selected, active and disabled states so the denser interface remains immediately legible.

## Completion

- Verify the default and populated editor at desktop and 320–390 px portrait widths, including enlarged text and expanded disclosures.
- Verify touch targets, no horizontal page overflow, keyboard operation and existing editing/playback behavior.
- Run formatting, lint, type checks, unit tests, production build and relevant browser checks; reconcile s0003.

## Outcome and verification

- Shortened the chord-page keyboard and timeline while retaining their horizontal ranges, full-width keys and fixed-height behavior. The standalone piano keeps its original key height.
- Combined the candidate symbol, spelled notes, icon replay and commit actions into one toolbar at ordinary mobile widths. Container-based reflow preserves the actions at 320 px and 200% text without horizontal page overflow.
- Reduced panel chrome and inter-section spacing, and aligned the Voicing label with its common controls where space permits. Direct root, type and member-bass choices remain visible.
- Added a browser regression that checks representative mobile targets are at least 36 by 36 px, the 390 px candidate and commit controls share a row, and the compact keyboard/timeline stay bounded.
- `pnpm check` passed formatting, lint, strict type checks and 84 unit tests. `pnpm build` passed. The complete installed-Chrome desktop/portrait suite passed 61 checks with one expected desktop touch-only skip.
- Reviewed default, sticky-toolbar and fully expanded screenshots. The captured portrait page is about 14% shorter than the preceding baseline while preserving hierarchy and musical information. Physical-device touch and Firefox/WebKit remain unavailable locally.
