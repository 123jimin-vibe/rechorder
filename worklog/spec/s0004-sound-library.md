+++
id = "s0004"
title = "Sound Library"
+++

# Sound Library

## Purpose and milestone — UNIMPLEMENTED

Support the individual-chord playback and played-note display required by s0003. Sound code delivered by t0002 must be modular and reusable for future features and a fully fledged DAW, with prevention of future technical debt as a primary constraint.

Automatic playback of the entire progression is outside t0002 but expected soon afterward. Account for that extension when designing the sound boundary. Current BPM management and playback timing may remain simpler for individual-chord playback; they must not prevent adding progression sequencing later.

## Proposed minimum contract — NEEDS APPROVAL

- Keep sound generation behind a documented interface independent of the chord-progression page and its UI framework. Application composition chooses the implementation.
- Accept explicitly defined musical playback data. Keep chord parsing/interpretation separate from sound generation so future callers need not use the chord editor.
- Define playback start, completion, interruption, failure, and resource cleanup. Decide overlap/retrigger behavior explicitly rather than allowing event-handler timing to determine it.
- Expose the currently sounding notes through the playback lifecycle for the note display. Report playback state consistently when playback cannot start or stops; the display must not claim silent notes are sounding.
- Own audio resources and lifecycle centrally within the sound implementation; prevent leaked voices, timers, listeners, or audio resources when the page releases it.
- Make browser audio activation and initialization failures part of the interface and UI integration contract.
- Provide a boundary that can be exercised without a real audio device for lifecycle verification, alongside a real-browser listening check for audible output.

## Decisions to resolve during t0002 — NEEDS APPROVAL

- Playback backend and dependencies, sound source and any asset requirements, and browser compatibility.
- Input pitch/voicing representation and note-state reporting, without prematurely fixing a public DAW API.
- Default duration, sound, articulation, scale/temperament, and retrigger/overlap behavior. No concrete defaults have been selected.
- Initialization, cancellation/disposal ownership, and error behavior.

## Future compatibility review — NEEDS APPROVAL

Review how the initial boundaries could accommodate progression sequencing, BPM and beat-length controls, soundfont replacement, articulation, and changes to musical scale and temperament. Prioritize the near-term addition of automatic progression playback: explain how sequencing and timing would connect to sound generation and played-note reporting. Record limitations and extension points. All these capabilities remain excluded from t0002 as specified in s0003.
