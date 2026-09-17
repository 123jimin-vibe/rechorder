+++
id = "t0025"
title = "Add contextual chord recommendations"
modifies = ["s0003", "s0005"]
status = "done"
+++

## Scope

- Implement the requested optional tonal settings and next, replacement, between-chord, and fixed-bass suggestions under s0003 and s0005.
- Keep ranking, tonal inference, harmonic relationships, and concrete voicing selection reusable without UI/audio dependencies.
- Use a compact mobile panel with direct audition and explicit commits; preserve editor identity and playback boundaries.

## Completion

- Verify musical examples, ambiguous/empty context, bidirectional insertion/replacement, fixed bass and spelling, deterministic diversity, and bounded computation.
- Run formatting, lint, types, unit tests, build, and available desktop/mobile browser interaction and overflow checks. Record actual browser coverage.

## Result and verification

- Delivered the pure recommendation API and separate tonal, relationship and voicing modules, optional key/mode settings, all four suggestion modes, inline bass picking and stable-ID insertion. Documented score terms and limitations in `docs/chord-recommendations.md`.
- Reconciled s0003 and s0005 with the implementation; n0003 now points to the delivered scope. Explicit tonal context follows whole-progression transposition.
- `pnpm check` passed: formatting, lint, all TypeScript projects and 97 unit tests. `pnpm build` and `git diff --check` passed.
- 52 distinct browser cases passed with `BROWSER_CHANNEL=msedge`: 42 existing chord-editor cases and 10 smart-feature cases across desktop and portrait emulation. Installed Microsoft Edge version 153.0.4234.32. Tests include preview isolation, no extra commit audition, bass pitch/register retention, stable replacement/insertion IDs, stale transport cancellation, long-timeline insertion visibility, key transposition, keyboard operation, 320/390 px layouts and 200% text. Inspected the mobile screenshot.
- The initial default Chromium run could not launch because pinned Playwright revision 1243 is absent; this was browser unavailability, not a passing run. Used installed Edge afterward. Firefox/WebKit and physical iOS/Android devices were not tested.
- Auto inference is major/minor only; other modes require explicit selection. No melody, rhythm or genre inputs, trained model, or exhaustive voicing search are implied. No outstanding implementation or approval requirements.
