+++
id = "s0004"
title = "Sound Library"
+++

# Sound Library

## Principles

- Follow s0002: support atypical temperaments and complex beats without coupling musical data to a sound backend or UI.
- The application owns sound-service creation and disposal; components invoke its interface.
- Separate musical interpretation from sound generation, and editable data from playback state.
- Allow future sequencing to control sound independently of UI rendering. Automatic progression playback is expected soon, but excluded from t0002.

## Required in t0002 — UNIMPLEMENTED

Provide reusable individual-chord playback for candidate and list-item actions in s0003, with played-note reporting for its display.

## Contract to settle in t0002

- Playback data, backend/assets, defaults, and overlap/retrigger behavior.
- Start, completion, interruption, initialization failure, and resource cleanup.
- Played-note reporting consistent with the playback lifecycle.
- How future sequencing/timing, articulation, sound selection, and tuning connect to the boundary.

Verify lifecycle behavior independently of the page and audible output in an adequate browser. Record unavailable browser checks; humans also test target devices.
