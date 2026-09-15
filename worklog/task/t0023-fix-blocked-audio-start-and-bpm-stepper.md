+++
id = "t0023"
title = "Fix blocked audio start and add a BPM stepper"
modifies = ["s0003", "s0004"]
status = "done"
+++

## Scope

- A reloaded utility page often stayed silent: piano keys never showed pressed and no
  chord, commit or transport action made a sound, while a page reached by a link worked.
- Move the BPM settings row below the page header.
- Give BPM decrease/increase pads beside the number field.

## Completion

- Reproduce the silence, fix its cause, and prove the page recovers.
- Reconcile s0003 and s0004; run formatting, lint, types, unit tests, production build
  and available browser checks.

## Progress

- Cause: a navigation started by a user gesture carries sticky activation into the new
  document, but a refresh does not. The first piano press then calls `resume()` on a
  document that may not start audio, and the specification parks that promise instead of
  rejecting it. The engine memoised the parked promise, so every later audition, keyboard
  press and transport start awaited a promise that never settled.
- Fix: the driver never awaits `resume()` alone. It reports failure at once when the
  document has never been activated, and otherwise watches the context state with a
  bounded wait, so the gesture that does activate the document starts audio.
- The BPM row now sits below the header with − and + pads that apply 1 BPM per press,
  clamp to 1–600, disable at the bounds and start no audio. The row wraps on narrow
  zoomed layouts.
- Verified: format, lint, types, 84 unit tests (two new: refusal before activation and
  recovery after a parked resume), production build, and 59 Chrome desktop/portrait
  browser checks including a new blocked-audio recovery check.
