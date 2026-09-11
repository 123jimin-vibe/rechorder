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
- Use the audio clock for sound scheduling; UI timers may refresh display only.

## Required in t0002 — UNIMPLEMENTED

Provide reusable individual-chord playback for candidate and list-item actions in s0003, with played-note reporting for its display.

## Contract

- Native Web Audio supplies a triangle-wave instrument. No soundfont assets are required.
- An audition plays all resolved notes together for one second: 10 ms attack, 100 ms release, conservative gain normalized by voice count.
- The playback contract accepts resolved notes, audio-clock start time, and duration, and returns a cancellable handle with stable playback ID and lifecycle state.
- One audition is active across the page. A new request releases the previous one; the application applies this policy while the sound contract remains independently cancellable for future sequencing.
- Report active notes and scheduled start/end through the playback lifecycle, including release. The note display follows that state.
- Create/resume audio only from a Play gesture. The application owns disposal, stops sound on page hidden, and the latest request wins while initialization is pending.
- On initialization or playback failure, log the error with `console.error` and keep editing usable. A snackbar replaces this reporting path later.

## Verification

Test lifecycle and cancellation without the page; test audible playback and user interaction in available browsers. Future sequencing supplies its own timing and calls the same scheduling contract.

Verify lifecycle behavior independently of the page and audible output in an adequate browser. Record unavailable browser checks; humans also test target devices.
