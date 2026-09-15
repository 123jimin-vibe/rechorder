+++
id = "t0013"
title = "Implement progression playback"
modifies = ["s0003", "s0004"]
status = "done"
+++

# Implement progression playback

## Outcome

Add automatic progression playback with Play, Pause, and Stop controls.

## Principles

- Schedule sound against the audio clock while keeping transport state outside musical data.
- Treat every entry as two quarter-note beats at 150 BPM for now; keep these defaults easy to replace with editable musical timing later.
- Preserve one-shot chord audition behavior; requesting one pauses the progression first.

## Completion

- [x] Play starts or resumes the progression, Pause preserves its position, and Stop resets it.
- [x] Completion returns the transport to its stopped beginning state.
- [x] Candidate and timeline chord auditions pause automatic playback.
- [x] Unit, browser, static, and build checks cover the transport behavior.
- [x] s0003 and s0004 describe the verified implementation.

## Verification — 2026-09-15

- `pnpm lint`, `pnpm typecheck`, 69 Vitest tests, and the production web build passed.
- Four targeted Chromium checks passed across desktop and portrait projects: transport timing and controls, individual-audition pause behavior, and narrow 200% text layout.
- Every changed file passes Prettier. The repository-wide `pnpm check` stops at `format:check` because 90 untouched files in this checkout do not match the configured line endings; later phases were run and passed separately.
- Browser tests used port 4174 because an existing Node process already owned the configured port 4173; it was left untouched. Physical-device listening remains outside this automated verification.
