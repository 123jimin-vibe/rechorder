+++
id = "t0016"
title = "Harden piano key interactions"
modifies = ["s0006", "s0004", "s0003"]
status = "done"
+++

# Harden piano key interactions

## Outcome

Make touch piano keys respond promptly and give every input a single, well-defined hold lifecycle.

## Completion

- [x] Prepare the audio renderer before the first musical gesture so first-note worklet loading is not audible as input lag.
- [x] Keep touch and pen presses from showing a transient focus/tap rectangle while preserving visible keyboard focus.
- [x] Ensure pointer and Space/Enter presses start once, sustain while held, and release once without a follow-up synthetic-click audition.
- [x] Cover preparation, early release, touch focus, and keyboard hold behavior with unit and browser tests.
- [x] Reconcile the governing specs and audio architecture documentation; pass focused static and runtime verification.

## Verification — 2026-09-15

- `pnpm lint`, `pnpm typecheck`, 71 Vitest tests, the production web build, and targeted Prettier checks for every changed file passed.
- Fourteen desktop/portrait Chromium piano checks covered all rotation directions, simultaneous hold/scroll, audio preparation before first touch, touch focus/tap suppression, keyboard-visible focus, window-blur release, and single-start press lifecycles.
- Four desktop/portrait Chromium chord-keyboard checks covered touch/keyboard cancellation, silent preparation, and shared audition behavior.
- Firefox and WebKit browser checks were unavailable because their Playwright executables are not installed. The repository-wide Prettier gate also retains unrelated pre-existing formatting drift in 76 files; all files changed by this task pass it.
