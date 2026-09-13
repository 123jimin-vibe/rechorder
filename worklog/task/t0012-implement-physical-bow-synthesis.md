+++
id = "t0012"
title = "Implement physical bow synthesis"
status = "active"
modifies = ["s0004"]
+++

## Scope

- Replace the static string-like wavetable with continuous-frequency bow/string interaction, wave propagation and an independently resonating body, following n0002.
- Stream synthesis outside the UI thread. Preserve scheduling, cancellation, held-note behavior and phone-speaker audibility; use linear chord summing with peak protection.
- Keep piano/UI changes owned by the other agent untouched.

## Completion

- Verify pitch, sustained excitation, passive release, numerical/resource stability, polyphonic output and native browser lifecycle.
- Provide auditionable output and document model provenance and limitations. Listening realism and physical-phone performance must not be claimed from numerical tests.
