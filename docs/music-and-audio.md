# Music and audio contracts

## Principles

- Musical meaning survives changes to tuning, sound implementation, and UI.
- Progression data, editor selection, candidate, and transient playback have separate owners.
- Add concrete adapters and callers as features arrive; avoid speculative DAW infrastructure.

## Ownership

| Module                                       | Responsibility                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| `@rechorder/music`                           | Plain musical data, voicing/tuning resolution, immutable insert/replace/remove/move |
| `@rechorder/audio`                           | Audio-clock scheduling, cancellation, sounding-note snapshots, voice cleanup        |
| `apps/web/src/chord-progression/editor.ts`   | Pure editor reducer; append, replace selected, remove last, stable selection        |
| `apps/web/src/chord-progression/audition.ts` | Latest-request policy, one audition with release tails, console error reporting     |
| `apps/web/src/chord-progression/main.tsx`    | Service composition, page visibility and disposal                                   |
| `apps/web/src/chord-progression/page.tsx`    | Candidate controls, rendering, and user actions                                     |

Import reusable packages through their declared exports. Music has no Preact, DOM,
or audio dependency. Audio consumes resolved notes and has no chord-theory or UI dependency.

## Musical data

`Pitch<Position>` preserves a system-specific position and spelling.
`Chord<Position, Interval, Voicing>` stores its root, optional spelled bass, interval definition, and separate
voicing. `Tuning<Position>.frequency(position)` resolves a pitch at the audio boundary;
`resolvePitches` retains labels and rejects non-finite or non-positive frequencies.
Enharmonic pitches can sound alike while retaining distinct spellings.

The `western.ts` adapter owns letter/accidental/octave coordinates, diatonic/chromatic
intervals, basic/jazz definitions, explicit alterations, close root-position voicing, and 12-EDO at A4 = 440 Hz.
Those restrictions do not apply to the generic models. Other systems supply their own
position/interval types, voicing, and tuning; tests exercise a non-octave period and
unequal rational frequency ratios through the same resolution boundary.

Jazz definitions provide complete ascending stacks, with no implicit omissions. Alterations
replace or add a diatonic degree; changing type resets modifiers. Slash bass is voiced in
the nearest octave strictly below the full upper structure. The conventional adapter
also provides C1–B5 piano pitches; keyboard rendering matches sounding frequencies rather
than spellings. Musical symbols follow the [Open Music Theory chord-symbol conventions](https://pressbooks.nebraska.edu/openmusictheory/chapter/chord-symbols/).

`ProgressionEntry<Value>` adds a stable ID to a value. Operations return new arrays;
callers treat entries and their nested values as immutable. Repeated chords have
distinct IDs. Replacement preserves the selected ID and position. The page loads
and auditions a selected entry, while root/type pads edit and audition a separate
candidate. Only Append/Replace commit it. Backspace always removes the last entry;
removing the selected entry clears selection, keeping the candidate for reuse.

Inputs currently come from a fixed catalogue. Membership and numeric boundary checks
are sufficient; no runtime schema library is needed. Prefer ArkType when future
imports, persistence, or other external structured data need schemas.

## Audio lifecycle

`initialize()` lazily creates/resumes audio from a user audition gesture. `schedule({ notes,
startTime, duration, level? })` accepts seconds on `engine.currentTime` and an optional
level from zero to one, and returns a stable
handle with `state` and `cancel()`. Past starts clamp to now. Each request copies its
resolved notes; keys are unique within that playback. Cancellation releases current
voices and prevents future ones. Handles remain independent, allowing future overlaps.

`activeNotes()` reports playing/releasing voices with playback IDs and start/end times;
scheduled, suspended, and finished voices are silent in this snapshot. The UI polls
it with animation frames only for display. Sources and envelopes use the audio clock.
`stopAll()` stops immediately; `dispose()` also closes the context and is idempotent.

The page requests a one-second plucked-string audition (5 ms attack and 100 ms release
included). `string-model.ts` implements an excited lossy delay line based on
[Karplus–Strong string synthesis](https://www.dsprelated.com/freebooks/pasp/Karplus_Strong_Algorithm.html).
Averaging damps high partials; source playback rate compensates the filter's half-sample
delay at the fundamental. `plucked-string.ts` owns synthesized buffers, a gentle body
resonance and cancellation envelopes; `web-audio.ts` owns the context. A four-million-frame
budget bounds both individual DSP allocations and cached buffers (about 16 MB each).
There are no imported samples or soundfonts. When `engine.running` is true,
new auditions schedule synchronously before releasing old ones; they never wait for
an earlier chord or its release. Removing or replacing a source cancels its sound and
pending request. Hidden pages stop immediately; leaving disposes audio except when
the browser preserves the page in its back/forward cache. Errors go to `console.error`;
the controller's reporting callback can later show a snackbar.

Keyboard presses use independent handles at one-quarter level, up to ten held gestures.
They can sound alongside the chord audition, decay for up to four seconds, and release
on pointer/key up, cancellation, lost capture or keyboard blur. Pending gestures are
identity-checked after audio resume so a released finger cannot produce a late note.
The keyboard uses pointer capture, horizontal touch panning, octave shortcuts and
Space/Enter support; screen readers retain spelled-note announcements.

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
