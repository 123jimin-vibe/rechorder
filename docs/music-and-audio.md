# Music and audio contracts

## Principles

- Musical meaning survives changes to tuning, sound implementation, and UI.
- Progression data, editor selection/cursor, and transient playback have separate owners.
- Add concrete adapters and callers as features arrive; avoid speculative DAW infrastructure.

## Ownership

| Module                                       | Responsibility                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------- |
| `@rechorder/music`                           | Plain musical data, voicing/tuning resolution, immutable insert/remove/move     |
| `@rechorder/audio`                           | Audio-clock scheduling, cancellation, sounding-note snapshots, voice cleanup    |
| `apps/web/src/chord-progression/editor.ts`   | Pure editor reducer; stable selection and insertion anchor                      |
| `apps/web/src/chord-progression/audition.ts` | Latest-request policy, one audition with release tails, console error reporting |
| `apps/web/src/chord-progression/main.tsx`    | Service composition, page visibility and disposal                               |
| `apps/web/src/chord-progression/page.tsx`    | Candidate controls, rendering, and user actions                                 |

Import reusable packages through their declared exports. Music has no Preact, DOM,
or audio dependency. Audio consumes resolved notes and has no chord-theory or UI dependency.

## Musical data

`Pitch<Position>` preserves a system-specific position and spelling.
`Chord<Position, Interval, Voicing>` stores its root, interval definition, and separate
voicing. `Tuning<Position>.frequency(position)` resolves a pitch at the audio boundary;
`resolvePitches` retains labels and rejects non-finite or non-positive frequencies.
Enharmonic pitches can sound alike while retaining distinct spellings.

The `western.ts` adapter owns letter/accidental/octave coordinates, diatonic/chromatic
intervals, nine chord definitions, close root-position voicing, and 12-EDO at A4 = 440 Hz.
Those restrictions do not apply to the generic models. Other systems supply their own
position/interval types, voicing, and tuning; tests exercise a non-octave period and
unequal rational frequency ratios through the same resolution boundary.

`ProgressionEntry<Value>` adds a stable ID to a value. Operations return new arrays;
callers treat entries and their nested values as immutable. Repeated chords have
distinct IDs. The editor stores its cursor as the following entry's ID, or `null`
at the end; deleting that anchor chooses its successor. Selection never edits a chord.

Inputs currently come from a fixed catalogue. Membership and numeric boundary checks
are sufficient; no runtime schema library is needed. Prefer ArkType when future
imports, persistence, or other external structured data need schemas.

## Audio lifecycle

`initialize()` lazily creates/resumes audio from a Play gesture. `schedule({ notes,
startTime, duration })` accepts seconds on `engine.currentTime` and returns a stable
handle with `state` and `cancel()`. Past starts clamp to now. Each request copies its
resolved notes; keys are unique within that playback. Cancellation releases current
voices and prevents future ones. Handles remain independent, allowing future overlaps.

`activeNotes()` reports playing/releasing voices with playback IDs and start/end times;
scheduled, suspended, and finished voices are silent in this snapshot. The UI polls
it with animation frames only for display. Oscillators and envelopes use the audio clock.
`stopAll()` stops immediately; `dispose()` also closes the context and is idempotent.

The page requests a one-second triangle-wave audition (10 ms attack and 100 ms release
included). When `engine.running` is true, new auditions schedule synchronously before
releasing old ones; they never wait for an earlier chord or its release. Removing a source cancels its sound and
pending request. Hidden pages stop immediately; leaving disposes audio except when
the browser preserves the page in its back/forward cache. Errors go to `console.error`;
the controller's reporting callback can later show a snackbar.

## Near-term extensions

- **Sequencing:** add a transport that owns scheduling and playback handles. Translate
  exact whole-note fractions through a separate tempo map to audio-clock seconds.
  Keep meter separate; tuplets and complex beats must not be rounded to a fixed grid.
  Today's progression is untimed, so no placeholder beat fields or tempo state exist.
- **Tuning and voicing:** resolve another musical adapter before scheduling. Audio
  accepts finite positive frequencies below the backend's Nyquist limit.
- **Instruments and articulation:** replace/extend the audio driver without changing
  progression editing or pitch identities. Backend voices own their resources.

Automatic progression playback and these controls remain future work under s0003.
