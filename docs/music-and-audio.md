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
| `apps/web/src/audio/audition.ts`             | Audition policy, progression transport, release tails, console error reporting      |
| `apps/web/src/components/piano-keyboard.tsx` | Shared playable conventional keyboard; each instance owns its scroll viewport       |
| `apps/web/src/components/rotatable-view.tsx` | Reusable 90-degree utility viewport and toggle                                      |
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
intervals, basic/jazz definitions, explicit alterations, close root-position voicing rooted in octave 4, and 12-EDO at A4 = 440 Hz.
Those restrictions do not apply to the generic models. Other systems supply their own
position/interval types, voicing, and tuning; tests exercise a non-octave period and
unequal rational frequency ratios through the same resolution boundary.

Jazz definitions provide complete ascending stacks, with no implicit omissions. Alterations
replace or add a diatonic degree; changing type resets modifiers. Slash bass is voiced in
the nearest octave strictly below the full upper structure. The conventional adapter
also provides C1–B6 piano pitches; keyboard rendering matches sounding frequencies rather
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

`prepare()` creates a suspended context and loads the renderer after page load without
starting sound. `initialize()` resumes that prepared audio from a user audition gesture. `schedule({ notes,
startTime, duration, level? })` accepts seconds on `engine.currentTime` and an optional
level from zero to one, and returns a stable
handle with `state` and `cancel()`. Past starts clamp to now. Each request copies its
resolved notes; keys are unique within that playback. Cancellation releases current
voices and prevents future ones. Handles remain independent, allowing future overlaps.

`activeNotes()` reports playing/releasing voices with playback IDs and start/end times;
scheduled, suspended, and finished voices are silent in this snapshot. The UI polls
it with animation frames only for display. Sources and envelopes use the audio clock.
`stopAll()` stops immediately; `dispose()` also closes the context and is idempotent.

The chord page requests a one-second bowed-string audition (65 ms attack and 100 ms release
included). `string-model.ts` models nonlinear bow friction between bridge and nut
waveguides, compensating fractional delays for the bridge filter's phase. Two players
per note have independent bow motion and subtle vibrato centered on the requested
frequency. Excitation runs at twice the output rate, with filtering before decimation.
`string-body.ts` applies the STK violin radiation response at the actual sample rate;
the low register uses an artistic larger-body scaling, not a measured cello response.
See [model provenance](../packages/audio/THIRD_PARTY_NOTICES.md).

`bowed-renderer.ts` streams into one AudioWorklet, with audio-frame scheduling and
release envelopes. The bow lifts on release and stored string/body energy rings down
inside the release envelope. `bowed-string.ts` owns messages and voice cleanup;
`web-audio.ts` loads and constructs the worklet while the context is suspended, then
resumes that prepared graph from the first musical gesture.
Live and scheduled voices are capped at 64 notes; each player's nominal round-trip
delay is capped at 65,536 samples. Allocation does not grow with held duration.
The linear mono mix uses square-root voice-count gain and a 3 ms lookahead peak
limiter with a 0.88 ceiling, leaving ordinary signals unchanged. Midrange energy is
tested; physical-device listening remains necessary. There are no soundfonts or
pre-rendered note buffers. When `engine.running` is true,
new auditions schedule synchronously before releasing old ones; they never wait for
an earlier chord or its release. Removing or replacing a source cancels its sound and
pending request. Hidden pages stop immediately; leaving disposes audio except when
the browser preserves the page in its back/forward cache. Errors go to `console.error`;
the controller's reporting callback can later show a snackbar.

The progression transport snapshots entries on a stopped start and currently assigns
each one two quarter-note beats at 120 BPM (1 second). It maintains a bounded
lookahead, but every voice uses an audio-clock start so JavaScript timer jitter does not
move chord boundaries. Pause cancels scheduled handles and retains the exact elapsed
offset; Play schedules the remaining part of the current chord and resumes the snapshot.
Play from here replaces that session and starts at the selected entry. Stop and natural
completion reset to the beginning. Any one-chord audition pauses the transport first,
while held keyboard notes remain independent.

Keyboard presses use independent handles at one-quarter level, up to ten held gestures.
They can sound alongside the chord audition, sustain until release (with a one-day backend
safety bound), and release on pointer/key up, cancellation, lost capture, keyboard blur,
or window focus loss. Pending gestures are
identity-checked after audio resume so a released finger cannot produce a late note.
The shared keyboard owns its key styling and sounding-key press feedback, pointer capture,
per-finger dragging, optional octave shortcuts and single-lifecycle Space/Enter support;
touch/pen presses suppress native focus and tap rectangles while keyboard focus remains
visible, and screen readers retain spelled-note announcements. The chord utility hides the optional shortcuts.
The free Piano page mounts two instances with separate scroll positions and input source IDs.
Dragging retains that pointer's starting note while scrolling; pointer end or cancellation
releases it, and stationary fingers keep playing. The
rotatable viewport provides an orientation context so touch drags and wheel input follow
the keyboard's inline axis through all four orientations. Keyboard surfaces own their touch
gestures because [browser panning may suppress concurrent pointers](https://www.w3.org/TR/pointerevents3/#the-touch-action-css-property).

## Near-term extensions

- **Editable timing:** replace the transport defaults with exact whole-note fractions
  translated through a separate tempo map to audio-clock seconds. Keep meter separate;
  tuplets and complex beats must not be rounded to a fixed grid. Progression entries
  remain untimed until those controls and musical fields are introduced.
- **Tuning and voicing:** resolve another musical adapter before scheduling. Audio
  accepts continuous frequencies below the backend's Nyquist limit and within its
  documented delay-allocation bound; tuning is never quantized to MIDI notes.
- **Instruments and articulation:** replace/extend the audio driver without changing
  progression editing or pitch identities. Backend voices own their resources.
