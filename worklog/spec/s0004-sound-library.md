+++
id = "s0004"
title = "Sound Library"
+++

# Sound Library

## Principles

- Follow s0002: support atypical temperaments and complex beats without coupling musical data to a sound backend or UI.
- The application owns sound-service creation and disposal; components invoke its interface.
- Separate musical interpretation from sound generation, and editable data from playback state.
- Allow sequencing to control sound independently of UI rendering.
- Use the audio clock for sound scheduling; UI timers may refresh display only.

## Required in t0002

Provide reusable individual-chord playback for candidate and list-item actions in s0003, with played-note reporting for its display.

## Contract

- Native Web Audio streams a physical bowed-string model in an AudioWorklet: nonlinear bow friction excites reflected fractional-delay string paths, followed by an independent resonant body response. Use two independently moving players per note, continuous frequency input, and oversampled excitation; no soundfonts or pre-rendered note buffers. Keep DSP, instrument construction and scheduling separate. Retain source attribution for adapted models.
- Keep the body response fixed during each player's pitch motion. A scaled violin body may supply a larger-instrument character in the low register; do not describe it as a measured cello. Numerical tests do not establish perceived realism.
- An audition plays all resolved notes together for one second, including a 65 ms attack and 100 ms release. Normalize gain by the square root of voice count to retain chord energy. Sum voices linearly; a lookahead peak limiter protects overlapping output while leaving signals below its ceiling unchanged. Preserve audible midrange harmonics for mobile speakers. Scale envelope segments for shorter scheduled notes.
- Bound the backend to 64 live/scheduled notes (two players each) and 65,536 samples of nominal round-trip delay per player. Reject unsupported allocations before scheduling. The model supports native rates from 8–192 kHz, frequencies below native Nyquist and above the delay-allocation bound; C1–B6 and intermediate frequencies are the required tuning-test range.
- The playback contract accepts resolved notes, audio-clock start time, duration and optional normalized level, and returns a cancellable handle with stable playback ID and lifecycle state.
- One chord audition is active across the page. A new request starts immediately at the current audio time, without awaiting the previous chord, its release, or reinitialization of running audio. It releases the previous audition concurrently; the application applies this policy while the sound contract remains independently cancellable for future sequencing.
- Progression transport schedules a bounded lookahead against the audio clock so an unbounded progression does not reserve unbounded voices. Pause cancels its scheduled handles and records its exact musical offset; resume schedules the remainder from that offset. Stop and natural completion reset it. An individual chord audition pauses the transport before it starts.
- Tempo changes preserve the fractional chord position, cancel old transport schedules and schedule the remainder at the new rate. Pending initialization and paused snapshots use the latest tempo. Keep tempo validation and conversion in application playback policy, outside the sound engine.
- Keyboard gestures own independent cancellable voices, capped at ten concurrent held inputs with conservative fixed gain. Held strings sustain until their input releases or cancels, subject only to a one-day backend safety bound; releasing a gesture releases its voice. A release while audio initializes prevents a late note. Hidden-page stop/disposal also clears held inputs.
- Report active notes and scheduled start/end through the playback lifecycle, including release. The note display follows that state.
- Prepare the suspended audio context and renderer after page load so worklet loading is outside the first-note path, but resume audio only from a musical user gesture. Preparation does not schedule or start sound. The application owns disposal, stops sound on page hidden, and the latest chord request wins while initialization is pending.
- On initialization or playback failure, log the error with `console.error` and keep editing usable. A snackbar replaces this reporting path later.

## Verification

Test lifecycle and cancellation independently of the page; check native audio output and user interaction in available browsers. Record unavailable checks; humans also listen and test target devices. Future sequencing supplies timing through the same scheduling contract. Implementation ownership and interfaces are documented in `docs/music-and-audio.md`.
